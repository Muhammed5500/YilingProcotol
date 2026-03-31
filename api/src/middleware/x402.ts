import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { config } from "../config.js";

/**
 * x402 Payment Middleware — Multi-Facilitator Setup
 *
 * Two facilitators, two x402 servers:
 *   1. Coinbase facilitator → Base Sepolia, Solana Devnet
 *   2. Monad facilitator   → Monad Testnet
 *
 * Builder/agent pays on whichever chain they have funds on.
 * The correct facilitator is used automatically.
 */

// Facilitator 1: Coinbase (Base, Solana)
const coinbaseFacilitator = new HTTPFacilitatorClient({
  url: config.facilitatorUrl,
});

// Facilitator 2: Monad
const monadFacilitator = new HTTPFacilitatorClient({
  url: config.monadFacilitatorUrl,
});

// Server 1: Coinbase chains
export const coinbaseX402Server = new x402ResourceServer(coinbaseFacilitator)
  .register("eip155:84532", new ExactEvmScheme())     // Base Sepolia
  .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme());  // Solana devnet

// Server 2: Monad
export const monadX402Server = new x402ResourceServer(monadFacilitator)
  .register("eip155:10143", new ExactEvmScheme());    // Monad testnet

// All supported networks (TESTNET)
const coinbaseNetworks: `${string}:${string}`[] = [
  "eip155:84532",      // Base Sepolia
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",  // Solana devnet
];

const monadNetworks: `${string}:${string}`[] = [
  "eip155:10143",      // Monad testnet
];

export const allNetworks: `${string}:${string}`[] = [
  ...monadNetworks,
  ...coinbaseNetworks,
];

/**
 * Build x402 accepts array for a given dollar amount
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
 * Create payment config for routes
 */
export function createPaymentConfig(payTo: string) {
  const accepts = (price: string) => buildAccepts(price, payTo);

  return {
    "/query/create": {
      accepts: accepts("$10.00"),
      description: "Create a truth discovery query (bondPool + 15% creation fee)",
      mimeType: "application/json",
    },
    "/query/:id/report": {
      accepts: accepts("$1.00"),
      description: "Submit a report with bond (0% agent fee)",
      mimeType: "application/json",
    },
  };
}
