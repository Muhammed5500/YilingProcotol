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

// Only list networks whose facilitators actually support them.
// CDP facilitator supports Base Sepolia. Monad has its own facilitator.
// Arbitrum/Ethereum Sepolia NOT supported by CDP yet — add when available.
// Monad is listed first — Hub contract lives on Monad, so it is the
// canonical payment network and the default when no X-PREFERRED-CHAIN
// hint is sent.
const EVM_NETWORKS: `${string}:${string}`[] = config.isMainnet
  ? [
      "eip155:10143",      // Monad
      "eip155:8453",       // Base
      "eip155:42161",      // Arbitrum
      "eip155:10",         // Optimism
      "eip155:1",          // Ethereum
      "eip155:137",        // Polygon
      "eip155:43114",      // Avalanche
    ]
  : [
      "eip155:10143",      // Monad Testnet
      "eip155:84532",      // Base Sepolia
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
      console.log(`[x402] Connecting to Monad facilitator: ${MONAD_FACILITATOR_URL}`);
      const monadFacilitator = withRetry(new HTTPFacilitatorClient({ url: MONAD_FACILITATOR_URL }));
      const supported = await monadFacilitator.getSupported();
      console.log(`[x402] Monad facilitator connected (${supported.kinds.length} kinds)`, JSON.stringify(supported));

      const monadServer = new x402ResourceServer(monadFacilitator);
      for (const network of monadNetworks) {
        // Monad Testnet (eip155:10143) is not in @x402/evm's default asset list,
        // so we register a custom money parser with the testnet USDC address
        const scheme = new ExactEvmScheme();
        scheme.registerMoneyParser(async (amount: number, net: string) => {
          if (net === "eip155:10143") {
            const decimals = 6;
            const tokenAmount = Math.round(amount * 10 ** decimals).toString();
            return {
              amount: tokenAmount,
              asset: "0x534b2f3A21130d7a60830c2Df862319e593943A3", // Monad Testnet USDC
              extra: { name: "USDC", version: "2" },
            };
          }
          return null; // fall through to default
        });
        monadServer.register(network, scheme);
      }
      monadMiddleware = paymentMiddleware(monadRouteConfig, monadServer);
      console.log(`[x402] Monad middleware ready`);
    } catch (err: any) {
      console.error(`[x402] Monad facilitator FAILED: ${err.message}`, err.stack);
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
    // Let CORS preflight through — never charge for OPTIONS
    if (c.req.method === "OPTIONS") {
      return next();
    }

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
      // No payment header — 402 challenge. Default to Monad since the Hub
      // contract lives there; only route to CDP when the caller explicitly
      // preferred a non-Monad chain. A missing header used to fall to CDP
      // (Base Sepolia), which is inconsistent with the rest of the stack.
      const preferredChain = c.req.header("X-PREFERRED-CHAIN") || "";
      const explicitNonMonad = preferredChain !== "" && !isMonadNetwork(preferredChain);
      if (explicitNonMonad) {
        useMiddleware = cdpMiddleware;
        fallback = cdpFallbackMiddleware;
      } else {
        useMiddleware = monadMiddleware;
        // Do NOT fall back to CDP for Monad — it would return Base Sepolia accepts,
        // causing chainId mismatch when the wallet is on Monad
        fallback = null;
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

    const preferredChain2 = c.req.header("X-PREFERRED-CHAIN") || "";
    console.warn(`[x402] No facilitator for ${path} (preferred: ${preferredChain2}, monadMW: ${!!monadMiddleware}, cdpMW: ${!!cdpMiddleware})`);
    return c.json({
      error: "Payment service unavailable",
      details: isMonadNetwork(preferredChain2)
        ? "Monad facilitator is not available. Check MONAD_FACILITATOR_URL config."
        : "No facilitator available for the requested chain.",
    }, 503);
  };
}
