import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { Context, Next } from "hono";
import { config } from "../config.js";

type PaymentEnv = {
  Variables: {
    paymentChain: string;
  };
};

/**
 * x402 Multi-Facilitator Middleware
 *
 * Two facilitators:
 *   - Monad facilitator: handles eip155:10143 (Monad testnet)
 *   - Coinbase facilitator: handles eip155:84532 (Base Sepolia) + Solana devnet
 *
 * Lazy initialization with graceful fallback.
 */

const MONAD_NETWORK = "eip155:10143" as const;
const MONAD_USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

// Correct URLs (Coinbase requires www prefix)
const MONAD_FACILITATOR_URL = config.monadFacilitatorUrl || "https://x402-facilitator.molandak.org";
const COINBASE_FACILITATOR_URL = "https://www.x402.org/facilitator";

export const allNetworks: `${string}:${string}`[] = [
  "eip155:10143",
  "eip155:84532",
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
];

// ─── Paid Routes ────────────────────────────────────────────
// x402 handles payment authorization — actual amounts depend on query parameters
// These are base prices; the real cost is bondPool+15% (create) or bondAmount (report)
// For now, use a reasonable default that covers most cases
const paidRoutes: Record<string, { price: string; description: string }> = {
  "/query/create": { price: "$1.00", description: "Create a truth discovery query" },
  "/query/:id/report": { price: "$1.00", description: "Submit a report with bond" },
};

function matchRoute(path: string): string | null {
  for (const pattern of Object.keys(paidRoutes)) {
    const regex = new RegExp("^" + pattern.replace(/:id/g, "[^/]+") + "$");
    if (regex.test(path)) return pattern;
  }
  return null;
}

export function buildAccepts(price: string, payTo: string) {
  return allNetworks.map((network) => ({
    scheme: "exact" as const,
    price,
    network,
    payTo,
  }));
}

// ─── Middleware State ───────────────────────────────────────
let monadMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
let coinbaseMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

async function initializeMiddleware(payTo: string) {
  // Build route configs
  const monadRouteConfig: Record<string, any> = {};
  const coinbaseRouteConfig: Record<string, any> = {};

  for (const [route, cfg] of Object.entries(paidRoutes)) {
    monadRouteConfig[route] = {
      accepts: [{ scheme: "exact" as const, price: cfg.price, network: MONAD_NETWORK, payTo }],
      description: cfg.description,
      mimeType: "application/json",
    };
    coinbaseRouteConfig[route] = {
      accepts: [
        { scheme: "exact" as const, price: cfg.price, network: "eip155:84532" as const, payTo },
        { scheme: "exact" as const, price: cfg.price, network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const, payTo },
      ],
      description: cfg.description,
      mimeType: "application/json",
    };
  }

  // ── Monad Facilitator ────────────────────────────────────
  try {
    const monadFacilitator = new HTTPFacilitatorClient({ url: MONAD_FACILITATOR_URL });
    const supported = await monadFacilitator.getSupported();
    console.log(`[x402] Monad facilitator connected (${supported.kinds.length} kinds)`);

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

    const monadServer = new x402ResourceServer(monadFacilitator).register(MONAD_NETWORK, monadScheme);
    monadMiddleware = paymentMiddleware(monadRouteConfig, monadServer);
    console.log("[x402] Monad middleware ready");
  } catch (err: any) {
    console.warn(`[x402] Monad facilitator failed: ${err.message}`);
  }

  // ── Coinbase Facilitator ─────────────────────────────────
  try {
    const coinbaseFacilitator = new HTTPFacilitatorClient({ url: COINBASE_FACILITATOR_URL });
    const supported = await coinbaseFacilitator.getSupported();
    console.log(`[x402] Coinbase facilitator connected (${supported.kinds.length} kinds)`);

    const coinbaseServer = new x402ResourceServer(coinbaseFacilitator)
      .register("eip155:84532", new ExactEvmScheme())
      .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme());
    coinbaseMiddleware = paymentMiddleware(coinbaseRouteConfig, coinbaseServer);
    console.log("[x402] Coinbase middleware ready");
  } catch (err: any) {
    console.warn(`[x402] Coinbase facilitator failed: ${err.message}`);
  }

  if (!monadMiddleware && !coinbaseMiddleware) {
    console.warn("[x402] WARNING: No facilitators available — paid routes will pass through");
  }
}

/**
 * Multi-facilitator payment middleware.
 * Lazy-initializes on first paid request. Graceful fallback if unavailable.
 */
export function createMultiFacilitatorMiddleware(payTo: string) {
  return async (c: Context<PaymentEnv>, next: Next) => {
    const path = c.req.path;
    const route = matchRoute(path);

    // Not a paid route → pass through
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

    const paymentHeader = c.req.header("X-PAYMENT") || c.req.header("x-payment");
    const preferredChain = c.req.header("X-PREFERRED-CHAIN") || "";

    // Determine which middleware to use
    let useMiddleware: ((c: Context, next: Next) => Promise<any>) | null = null;
    let detectedChain = "";

    if (paymentHeader) {
      try {
        const paymentData = JSON.parse(paymentHeader);
        detectedChain = paymentData?.accepted?.network || paymentData?.network || paymentData?.payload?.network || "";
        useMiddleware = (detectedChain === MONAD_NETWORK || detectedChain.includes("10143"))
          ? monadMiddleware
          : coinbaseMiddleware;
      } catch {
        // base64-encoded payload — try to extract network from decoded data
        try {
          const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"));
          detectedChain = decoded?.accepted?.network || "";
          useMiddleware = (detectedChain === MONAD_NETWORK || detectedChain.includes("10143"))
            ? monadMiddleware
            : coinbaseMiddleware;
        } catch {
          useMiddleware = monadMiddleware;
          detectedChain = MONAD_NETWORK;
        }
      }
    } else {
      // No payment yet → route based on preferred chain header
      if (preferredChain.includes("84532") || preferredChain.toLowerCase().includes("base") || preferredChain.includes("solana")) {
        useMiddleware = coinbaseMiddleware;
      } else {
        useMiddleware = monadMiddleware;
      }
    }

    // Inject verified payment chain into context for downstream handlers
    if (detectedChain) {
      c.set("paymentChain", detectedChain);
    }

    // Use middleware if available, otherwise pass through
    if (useMiddleware) {
      try {
        return await useMiddleware(c, next);
      } catch (err: any) {
        console.warn(`[x402] Middleware error on ${path}: ${err.message}`);
        return next();
      }
    }

    console.warn(`[x402] No facilitator for ${path} — passing through`);
    return next();
  };
}
