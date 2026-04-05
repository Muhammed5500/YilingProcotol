import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { Context, Next } from "hono";
import { config } from "../config.js";

type PaymentEnv = {
  Variables: {
    paymentChain: string;
  };
};

/**
 * x402 Payment Middleware — Base Sepolia via Coinbase CDP
 *
 * All x402 payments go through Base Sepolia.
 * Hub contract (SKCEngine etc.) stays on Monad — only payment layer is Base.
 *
 * Coinbase CDP facilitator: 500 writes / 10s (~50 req/s)
 * vs Monad facilitator: 10 req/min
 *
 * Dynamic pricing: reads request body to determine actual cost.
 * - /query/create: bondPool + 15% fee (from body)
 * - /query/:id/report: bondAmount (from on-chain)
 */

const BASE_SEPOLIA = "eip155:84532" as const;

const CDP_FACILITATOR_URL = config.facilitatorUrl || "https://api.cdp.coinbase.com/platform/v2/x402";
const COINBASE_FALLBACK_URL = config.facilitatorFallbackUrl || "https://www.x402.org/facilitator";

/** Supported payment network — Base Sepolia only */
export const allNetworks: `${string}:${string}`[] = [
  BASE_SEPOLIA,
];

// ─── Dynamic Price Functions ──────────────────────────────

/** Calculate x402 price for query creation from request body */
function createQueryPrice(context: any): string {
  try {
    const body = context.adapter.getBody?.();
    if (body?.bondPool) {
      const bondPoolUsdc = Number(BigInt(body.bondPool)) / 1e18;
      const withFee = bondPoolUsdc * 1.15; // +15% creation fee
      const price = Math.max(0.01, withFee);
      return `$${price.toFixed(6)}`;
    }
  } catch {}
  return "$1.00";
}

/** Calculate x402 price for report submission from query's bondAmount */
async function reportPrice(context: any): Promise<string> {
  try {
    const path = context.adapter.getPath?.() || "";
    const match = path.match(/\/query\/(\d+)\/report/);
    if (match) {
      const queryId = match[1];
      const { getQueryParams } = await import("../services/contract.js");
      const params = await getQueryParams(BigInt(queryId));
      const bondUsdc = Number(params.bondAmount) / 1e18;
      const price = Math.max(0.01, bondUsdc);
      return `$${price.toFixed(6)}`;
    }
  } catch {}
  return "$1.00";
}

function matchRoute(path: string): string | null {
  if (path === "/query/create") return "/query/create";
  if (/^\/query\/[^/]+\/report$/.test(path)) return "/query/:id/report";
  return null;
}

/**
 * Build accepts array for x402 402 response — Base Sepolia only.
 */
export function buildAccepts(price: string, payTo: string, _restrictToNetwork?: string) {
  return allNetworks.map((network) => ({
    scheme: "exact" as const,
    price,
    network,
    payTo,
  }));
}

// ─── Retry wrapper for facilitator clients ─────────────────

const MAX_FACILITATOR_RETRIES = 3;

/**
 * Wraps an HTTPFacilitatorClient with retry logic for 429 (rate limit) errors.
 * Returns a Proxy that intercepts verify/settle calls and retries on 429.
 */
function withRetry(client: HTTPFacilitatorClient): HTTPFacilitatorClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original !== "function") return original;

      // Only retry verify and settle — pass through everything else
      if (prop !== "verify" && prop !== "settle") {
        return original.bind(target);
      }

      return async (...args: any[]) => {
        for (let attempt = 0; attempt < MAX_FACILITATOR_RETRIES; attempt++) {
          try {
            return await original.apply(target, args);
          } catch (err: any) {
            const is429 = err?.message?.includes("429") || err?.status === 429;
            if (is429 && attempt < MAX_FACILITATOR_RETRIES - 1) {
              const delay = (attempt + 1) * 2000 + Math.random() * 1000;
              console.warn(`[x402] Facilitator ${String(prop)} got 429, retry ${attempt + 1}/${MAX_FACILITATOR_RETRIES} in ${(delay / 1000).toFixed(1)}s`);
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            throw err;
          }
        }
      };
    },
  });
}

// ─── Middleware State ───────────────────────────────────────
let primaryMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
let fallbackMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

async function initializeMiddleware(payTo: string) {
  const routeConfig: Record<string, any> = {
    "/query/create": {
      accepts: [{
        scheme: "exact" as const,
        price: createQueryPrice,
        network: BASE_SEPOLIA,
        payTo,
      }],
      description: "Create a truth discovery query",
      mimeType: "application/json",
    },
    "/query/:id/report": {
      accepts: [{
        scheme: "exact" as const,
        price: reportPrice,
        network: BASE_SEPOLIA,
        payTo,
      }],
      description: "Submit a report with bond",
      mimeType: "application/json",
    },
  };

  // ── CDP Facilitator (primary — 500 req/10s) ──────────────
  try {
    const cdpFacilitator = withRetry(new HTTPFacilitatorClient({ url: CDP_FACILITATOR_URL }));
    const supported = await cdpFacilitator.getSupported();
    console.log(`[x402] CDP facilitator connected (${supported.kinds.length} kinds)`);

    const cdpServer = new x402ResourceServer(cdpFacilitator)
      .register(BASE_SEPOLIA, new ExactEvmScheme());
    primaryMiddleware = paymentMiddleware(routeConfig, cdpServer);
    console.log("[x402] CDP middleware ready — Base Sepolia (dynamic pricing)");
  } catch (err: any) {
    console.warn(`[x402] CDP facilitator failed: ${err.message}`);
  }

  // ── Coinbase Public Facilitator (fallback) ────────────────
  try {
    const coinbaseFacilitator = withRetry(new HTTPFacilitatorClient({ url: COINBASE_FALLBACK_URL }));
    const supported = await coinbaseFacilitator.getSupported();
    console.log(`[x402] Coinbase fallback connected (${supported.kinds.length} kinds)`);

    const fallbackServer = new x402ResourceServer(coinbaseFacilitator)
      .register(BASE_SEPOLIA, new ExactEvmScheme());
    fallbackMiddleware = paymentMiddleware(routeConfig, fallbackServer);
    console.log("[x402] Coinbase fallback middleware ready — Base Sepolia");
  } catch (err: any) {
    console.warn(`[x402] Coinbase fallback failed: ${err.message}`);
  }

  if (!primaryMiddleware && !fallbackMiddleware) {
    console.warn("[x402] WARNING: No facilitators available — paid routes will be blocked");
  }
}

/**
 * Base Sepolia payment middleware.
 * Lazy-initializes on first paid request. CDP primary, Coinbase public fallback.
 */
export function createMultiFacilitatorMiddleware(payTo: string) {
  return async (c: Context<PaymentEnv>, next: Next) => {
    const path = c.req.path;
    const route = matchRoute(path);

    if (!route) {
      return next();
    }

    // Lazy init (once)
    if (!initialized) {
      if (!initPromise) {
        initPromise = initializeMiddleware(payTo).then(() => { initialized = true; });
      }
      await initPromise;
    }

    // Inject payment chain — always Base Sepolia
    c.set("paymentChain", BASE_SEPOLIA);

    // Try CDP primary, then Coinbase fallback
    const useMiddleware = primaryMiddleware || fallbackMiddleware;

    if (useMiddleware) {
      try {
        return await useMiddleware(c, next);
      } catch (err: any) {
        console.warn(`[x402] Primary middleware error on ${path}: ${err.message}`);

        if (fallbackMiddleware && useMiddleware !== fallbackMiddleware) {
          try {
            console.log(`[x402] Retrying ${path} with fallback facilitator...`);
            return await fallbackMiddleware(c, next);
          } catch (err2: any) {
            console.warn(`[x402] Fallback also failed on ${path}: ${err2.message}`);
          }
        }

        return c.json({
          error: "Payment processing failed. Please try again.",
          details: err.message,
        }, 402);
      }
    }

    console.warn(`[x402] No facilitator for ${path} — rejecting`);
    return c.json({ error: "Payment service unavailable" }, 503);
  };
}
