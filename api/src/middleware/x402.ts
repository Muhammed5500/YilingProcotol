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

// Server 2: Monad (lazy initialized to prevent startup crash)
let _monadX402Server: x402ResourceServer | null = null;
export function getMonadX402Server() {
  if (!_monadX402Server) {
    try {
      _monadX402Server = new x402ResourceServer(monadFacilitator)
        .register("eip155:10143", new ExactEvmScheme());
    } catch {
      console.log("Monad x402 server initialization failed");
    }
  }
  return _monadX402Server;
}

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

// Networks for Coinbase middleware only (excludes Monad)
const coinbaseAccepts = (price: string, payTo: string) =>
  coinbaseNetworks.map((network) => ({
    scheme: "exact" as const,
    price,
    network,
    payTo,
  }));

/**
 * Create payment config for Coinbase facilitator routes
 */
export function createPaymentConfig(payTo: string) {
  return {
    "/query/create": {
      accepts: coinbaseAccepts("$10.00", payTo),
      description: "Create a truth discovery query (bondPool + 15% creation fee)",
      mimeType: "application/json",
    },
    "/query/:id/report": {
      accepts: coinbaseAccepts("$1.00", payTo),
      description: "Submit a report with bond (0% agent fee)",
      mimeType: "application/json",
    },
  };
}
