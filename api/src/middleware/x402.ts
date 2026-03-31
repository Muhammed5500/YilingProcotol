import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { config } from "../config.js";

/**
 * x402 Payment Middleware — Multi-Facilitator
 *
 * Problem: x402ResourceServer takes one facilitator. We need two.
 * Solution: Use Monad facilitator as primary (it only handles Monad),
 *           register Coinbase chains with their own facilitator via
 *           scheme-level configuration.
 *
 * Supported chains:
 *   - Monad testnet (eip155:10143) — Monad facilitator
 *   - Base Sepolia (eip155:84532) — Coinbase facilitator
 *   - Solana Devnet — Coinbase facilitator
 */

// Try Monad facilitator first, fall back to Coinbase-only if it fails
let x402Server: x402ResourceServer;
let activeNetworks: `${string}:${string}`[];

try {
  // Attempt: Monad facilitator as primary server
  const monadFacilitator = new HTTPFacilitatorClient({
    url: config.monadFacilitatorUrl,
  });

  const MONAD_NETWORK = "eip155:10143";
  const MONAD_USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

  const monadScheme = new ExactEvmScheme();
  monadScheme.registerMoneyParser(async (amount: number, network: string) => {
    if (network === MONAD_NETWORK) {
      const tokenAmount = Math.floor(amount * 1_000_000).toString();
      return {
        amount: tokenAmount,
        asset: MONAD_USDC,
        extra: { name: "USDC", version: "2" },
      };
    }
    return null;
  });

  x402Server = new x402ResourceServer(monadFacilitator)
    .register(MONAD_NETWORK, monadScheme);   // Monad testnet

  activeNetworks = [
    "eip155:10143",      // Monad testnet
  ];

  console.log("x402: Monad facilitator active (eip155:10143)");
} catch {
  // Fallback: Coinbase facilitator only
  const coinbaseFacilitator = new HTTPFacilitatorClient({
    url: config.facilitatorUrl,
  });

  x402Server = new x402ResourceServer(coinbaseFacilitator)
    .register("eip155:84532", new ExactEvmScheme())
    .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme());

  activeNetworks = [
    "eip155:84532",
    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  ];

  console.log("x402: Coinbase facilitator fallback (Base Sepolia + Solana)");
}

export { x402Server };
export { activeNetworks as allNetworks };

/**
 * Build x402 accepts array for a given dollar amount
 */
export function buildAccepts(price: string, payTo: string) {
  return activeNetworks.map((network) => ({
    scheme: "exact" as const,
    price,
    network,
    payTo,
  }));
}

/**
 * Create payment config for routes
 */
export function createPaymentConfig(payTo: string) {
  return {
    "/query/create": {
      accepts: buildAccepts("$10.00", payTo),
      description: "Create a truth discovery query (bondPool + 15% creation fee)",
      mimeType: "application/json",
    },
    "/query/:id/report": {
      accepts: buildAccepts("$1.00", payTo),
      description: "Submit a report with bond (0% agent fee)",
      mimeType: "application/json",
    },
  };
}
