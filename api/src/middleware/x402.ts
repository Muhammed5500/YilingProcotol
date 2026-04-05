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
 * x402 Multi-Chain Payment Middleware
 *
 * Accepts payments from any supported chain. The query creator picks the chain,
 * agents pay bonds on the same chain (queryChain from state package).
 *
 * Facilitator routing:
 *   - Monad (eip155:10143) → Monad facilitator (fallback: Coinbase)
 *   - All other EVM chains  → Coinbase CDP facilitator (fallback: x402.org)
 *
 * Dynamic pricing: reads request body to determine actual cost.
 */

// ─── Supported Networks ─────────────────────────────────────

const EVM_NETWORKS: `${string}:${string}`[] = config.isMainnet
  ? [
      "eip155:8453",       // Base
      "eip155:10143",      // Monad
      "eip155:42161",      // Arbitrum
      "eip155:10",         // Optimism
      "eip155:1",          // Ethereum
      "eip155:137",        // Polygon
      "eip155:43114",      // Avalanche
    ]
  : [
      "eip155:84532",      // Base Sepolia
      "eip155:10143",      // Monad Testnet
      "eip155:421614",     // Arbitrum Sepolia
      "eip155:11155111",   // Ethereum Sepolia
    ];

export const allNetworks = EVM_NETWORKS;

// ─── Facilitator URLs ───────────────────────────────────────

const CDP_FACILITATOR_URL = config.facilitatorUrl || "https://api.cdp.coinbase.com/platform/v2/x402";
const COINBASE_FALLBACK_URL = config.facilitatorFallbackUrl || "https://www.x402.org/facilitator";
const MONAD_FACILITATOR_URL = config.monadFacilitatorUrl || "https://x402-facilitator.molandak.org";

// ─── Facilitator Routing ────────────────────────────────────

function isMonadNetwork(network: string): boolean {
  return network === "eip155:10143" || network.includes("10143");
}

// ─── Dynamic Price Functions ────────────────────────────────

function createQueryPrice(context: any): string {
  try {
    const body = context.adapter.getBody?.();
    if (body?.bondPool) {
      const bondPoolUsdc = Number(BigInt(body.bondPool)) / 1e18;
      const withFee = bondPoolUsdc * 1.15;
      const price = Math.max(0.01, withFee);
      return `$${price.toFixed(6)}`;
    }
  } catch {}
  return "$1.00";
}

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
 * Build accepts array — all supported networks.
 */
export function buildAccepts(price: string, payTo: string, restrictToNetwork?: string) {
  const networks = restrictToNetwork ? [restrictToNetwork as `${string}:${string}`] : allNetworks;
  return networks.map((network) => ({
    scheme: "exact" as const,
    price,
    network,
    payTo,
  }));
}

// ─── Retry wrapper for facilitator clients ──────────────────

const MAX_FACILITATOR_RETRIES = 3;

function withRetry(client: HTTPFacilitatorClient): HTTPFacilitatorClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original !== "function") return original;
      if (prop !== "verify" && prop !== "settle") return original.bind(target);

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

// ─── Middleware State ────────────────────────────────────────

let cdpMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
let cdpFallbackMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
let monadMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

async function initializeMiddleware(payTo: string) {
  // Networks split by facilitator
  const cdpNetworks = EVM_NETWORKS.filter(n => !isMonadNetwork(n));
  const monadNetworks = EVM_NETWORKS.filter(n => isMonadNetwork(n));

  // ── Route config for CDP (all chains except Monad) ────────
  const cdpAccepts = cdpNetworks.map(network => ({
    scheme: "exact" as const,
    price: createQueryPrice,
    network,
    payTo,
  }));

  const cdpReportAccepts = cdpNetworks.map(network => ({
    scheme: "exact" as const,
    price: reportPrice,
    network,
    payTo,
  }));

  const cdpRouteConfig: Record<string, any> = {
    "/query/create": {
      accepts: cdpAccepts,
      description: "Create a truth discovery query",
      mimeType: "application/json",
    },
    "/query/:id/report": {
      accepts: cdpReportAccepts,
      description: "Submit a report with bond",
      mimeType: "application/json",
    },
  };

  // ── Route config for Monad ────────────────────────────────
  const monadRouteConfig: Record<string, any> = {
    "/query/create": {
      accepts: monadNetworks.map(network => ({
        scheme: "exact" as const,
        price: createQueryPrice,
        network,
        payTo,
      })),
      description: "Create a truth discovery query",
      mimeType: "application/json",
    },
    "/query/:id/report": {
      accepts: monadNetworks.map(network => ({
        scheme: "exact" as const,
        price: reportPrice,
        network,
        payTo,
      })),
      description: "Submit a report with bond",
      mimeType: "application/json",
    },
  };

  // ── CDP Facilitator (primary for non-Monad chains) ────────
  try {
    const cdpFacilitator = withRetry(new HTTPFacilitatorClient({ url: CDP_FACILITATOR_URL }));
    const supported = await cdpFacilitator.getSupported();
    console.log(`[x402] CDP facilitator connected (${supported.kinds.length} kinds)`);

    const cdpServer = new x402ResourceServer(cdpFacilitator);
    for (const network of cdpNetworks) {
      cdpServer.register(network, new ExactEvmScheme());
    }
    cdpMiddleware = paymentMiddleware(cdpRouteConfig, cdpServer);
    console.log(`[x402] CDP middleware ready — ${cdpNetworks.length} networks`);
  } catch (err: any) {
    console.warn(`[x402] CDP facilitator failed: ${err.message}`);
  }

  // ── Coinbase Public Facilitator (fallback for non-Monad) ──
  try {
    const coinbaseFacilitator = withRetry(new HTTPFacilitatorClient({ url: COINBASE_FALLBACK_URL }));
    const supported = await coinbaseFacilitator.getSupported();
    console.log(`[x402] Coinbase fallback connected (${supported.kinds.length} kinds)`);

    const fallbackServer = new x402ResourceServer(coinbaseFacilitator);
    for (const network of cdpNetworks) {
      fallbackServer.register(network, new ExactEvmScheme());
    }
    cdpFallbackMiddleware = paymentMiddleware(cdpRouteConfig, fallbackServer);
    console.log(`[x402] Coinbase fallback ready — ${cdpNetworks.length} networks`);
  } catch (err: any) {
    console.warn(`[x402] Coinbase fallback failed: ${err.message}`);
  }

  // ── Monad Facilitator ─────────────────────────────────────
  if (monadNetworks.length > 0) {
    try {
      const monadFacilitator = withRetry(new HTTPFacilitatorClient({ url: MONAD_FACILITATOR_URL }));
      const supported = await monadFacilitator.getSupported();
      console.log(`[x402] Monad facilitator connected (${supported.kinds.length} kinds)`);

      const monadServer = new x402ResourceServer(monadFacilitator);
      for (const network of monadNetworks) {
        monadServer.register(network, new ExactEvmScheme());
      }
      monadMiddleware = paymentMiddleware(monadRouteConfig, monadServer);
      console.log(`[x402] Monad middleware ready`);
    } catch (err: any) {
      console.warn(`[x402] Monad facilitator failed: ${err.message}`);
    }
  }

  if (!cdpMiddleware && !cdpFallbackMiddleware && !monadMiddleware) {
    console.warn("[x402] WARNING: No facilitators available — paid routes will be blocked");
  }
}

/**
 * Multi-chain payment middleware.
 * Routes to correct facilitator based on payment network.
 * CDP for most chains, Monad facilitator for Monad network.
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

    // Detect payment chain from header
    const paymentHeader = c.req.header("PAYMENT-SIGNATURE") || c.req.header("payment-signature")
      || c.req.header("X-PAYMENT") || c.req.header("x-payment");

    let detectedChain = "";
    let useMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
    let fallback: ((c: Context, next: Next) => Promise<any>) | null = null;

    if (paymentHeader) {
      // Parse payment to detect chain
      try {
        const paymentData = JSON.parse(paymentHeader);
        detectedChain = paymentData?.accepted?.network || paymentData?.network || paymentData?.payload?.network || "";
      } catch {
        try {
          const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"));
          detectedChain = decoded?.accepted?.network || "";
        } catch {}
      }

      // Route to correct facilitator
      if (isMonadNetwork(detectedChain)) {
        useMiddleware = monadMiddleware;
        fallback = cdpMiddleware; // CDP as fallback for Monad
      } else {
        useMiddleware = cdpMiddleware;
        fallback = cdpFallbackMiddleware;
      }
    } else {
      // No payment header — 402 response. Use preferred chain hint or default to CDP
      const preferredChain = c.req.header("X-PREFERRED-CHAIN") || "";
      if (isMonadNetwork(preferredChain)) {
        useMiddleware = monadMiddleware;
        fallback = cdpMiddleware;
      } else {
        useMiddleware = cdpMiddleware;
        fallback = cdpFallbackMiddleware;
      }
    }

    // Inject detected chain for downstream handlers
    if (detectedChain) {
      c.set("paymentChain", detectedChain);
    }

    // Try primary, then fallback
    const primary = useMiddleware || fallback;
    if (primary) {
      try {
        return await primary(c, next);
      } catch (err: any) {
        console.warn(`[x402] Primary middleware error on ${path}: ${err.message}`);

        const fb = primary === useMiddleware ? fallback : null;
        if (fb) {
          try {
            console.log(`[x402] Retrying ${path} with fallback facilitator...`);
            return await fb(c, next);
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
