import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { Context, Next } from "hono";
import { config } from "../config.js";

/**
 * x402 Multi-Facilitator Middleware
 *
 * Two facilitators, two x402 servers, one middleware.
 * When a paid endpoint is hit:
 *   1. First try Monad facilitator
 *   2. If that fails, try Coinbase facilitator
 *   3. 402 response lists ALL supported networks
 */

// ─── Monad Server ───────────────────────────────────────────
const MONAD_NETWORK = "eip155:10143" as const;
const MONAD_USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

const monadFacilitator = new HTTPFacilitatorClient({
  url: config.monadFacilitatorUrl,
});

const monadScheme = new ExactEvmScheme();
monadScheme.registerMoneyParser(async (amount: number, network: string) => {
  if (network === MONAD_NETWORK) {
    return {
      amount: Math.floor(amount * 1_000_000).toString(),
      asset: MONAD_USDC,
      extra: { name: "USDC", version: "2" },
    };
  }
  return null;
});

const monadServer = new x402ResourceServer(monadFacilitator)
  .register(MONAD_NETWORK, monadScheme);

// ─── Coinbase Server (primary + fallback) ───────────────────
const coinbaseFacilitator = new HTTPFacilitatorClient({
  url: config.facilitatorUrl,
});

const coinbaseServer = new x402ResourceServer(coinbaseFacilitator)
  .register("eip155:84532", new ExactEvmScheme())
  .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme());

const coinbaseFallbackFacilitator = new HTTPFacilitatorClient({
  url: config.facilitatorFallbackUrl,
});

const coinbaseFallbackServer = new x402ResourceServer(coinbaseFallbackFacilitator)
  .register("eip155:84532", new ExactEvmScheme())
  .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme());

// ─── All Networks ───────────────────────────────────────────
export const allNetworks: `${string}:${string}`[] = [
  "eip155:10143",      // Monad testnet
  "eip155:84532",      // Base Sepolia
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",  // Solana devnet
];

// ─── Route Config ───────────────────────────────────────────
const paidRoutes: Record<string, { price: string; description: string }> = {
  "/query/create": { price: "$10.00", description: "Create a truth discovery query" },
  "/query/:id/report": { price: "$1.00", description: "Submit a report with bond" },
};

function matchRoute(path: string): string | null {
  for (const pattern of Object.keys(paidRoutes)) {
    const regex = new RegExp("^" + pattern.replace(/:id/g, "[^/]+") + "$");
    if (regex.test(path)) return pattern;
  }
  return null;
}

/**
 * Build accepts array with all networks
 */
export function buildAccepts(price: string, payTo: string) {
  return allNetworks.map((network) => ({
    scheme: "exact" as const,
    price,
    network,
    payTo,
  }));
}

/**
 * Multi-facilitator payment middleware
 *
 * For paid routes:
 *   - No payment header → return 402 with ALL networks
 *   - Payment from Monad → verify with Monad facilitator
 *   - Payment from Base/Solana → verify with Coinbase facilitator
 */
export function createMultiFacilitatorMiddleware(payTo: string) {
  // Each facilitator only knows its own networks
  const monadConfig: Record<string, any> = {};
  const coinbaseConfig: Record<string, any> = {};

  for (const [route, cfg] of Object.entries(paidRoutes)) {
    monadConfig[route] = {
      accepts: [{ scheme: "exact" as const, price: cfg.price, network: MONAD_NETWORK, payTo }],
      description: cfg.description,
      mimeType: "application/json",
    };
    coinbaseConfig[route] = {
      accepts: [
        { scheme: "exact" as const, price: cfg.price, network: "eip155:84532" as const, payTo },
        { scheme: "exact" as const, price: cfg.price, network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const, payTo },
      ],
      description: cfg.description,
      mimeType: "application/json",
    };
  }

  const monadMiddleware = paymentMiddleware(monadConfig, monadServer);
  const coinbaseMiddleware = paymentMiddleware(coinbaseConfig, coinbaseServer);
  const coinbaseFallbackMiddleware = paymentMiddleware(coinbaseConfig, coinbaseFallbackServer);

  /**
   * Try primary middleware, fall back on failure.
   * Captures the response — if it's a 5xx or throws, retry with fallback.
   */
  async function withFallback(
    primary: (c: Context, next: Next) => Promise<any>,
    fallback: (c: Context, next: Next) => Promise<any>,
    c: Context,
    next: Next,
  ) {
    try {
      const res = await primary(c, next);
      // If primary returned a server error, try fallback
      if (res instanceof Response && res.status >= 500) {
        console.warn("[x402] Primary facilitator returned 5xx, trying fallback…");
        return fallback(c, next);
      }
      return res;
    } catch (err) {
      console.warn("[x402] Primary facilitator failed, trying fallback…", err);
      return fallback(c, next);
    }
  }

  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const route = matchRoute(path);

    // Not a paid route → pass through
    if (!route) {
      return next();
    }

    const paymentHeader = c.req.header("X-PAYMENT") || c.req.header("x-payment");

    // No payment → route to correct middleware based on request hint
    // Client can specify preferred chain in X-PREFERRED-CHAIN header
    // Default: Monad
    if (!paymentHeader) {
      const preferredChain = c.req.header("X-PREFERRED-CHAIN") || "";

      if (preferredChain.includes("84532") || preferredChain.toLowerCase().includes("base")) {
        return withFallback(coinbaseMiddleware, coinbaseFallbackMiddleware, c, next);
      } else if (preferredChain.includes("solana")) {
        return withFallback(coinbaseMiddleware, coinbaseFallbackMiddleware, c, next);
      } else {
        return monadMiddleware(c, next);
      }
    }

    // Has payment → route to correct facilitator with fallback
    try {
      const paymentData = JSON.parse(paymentHeader);
      const network = paymentData?.network || paymentData?.payload?.network || "";

      if (network === MONAD_NETWORK || network.includes("10143")) {
        return monadMiddleware(c, next);
      } else {
        return withFallback(coinbaseMiddleware, coinbaseFallbackMiddleware, c, next);
      }
    } catch {
      return monadMiddleware(c, next);
    }
  };
}
