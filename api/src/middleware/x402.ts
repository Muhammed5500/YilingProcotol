import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { config } from "../config.js";

/**
 * x402 Payment Middleware
 *
 * IMPORTANT: x402 is a client-to-server PULL payment protocol.
 * It can only COLLECT payments (inbound), NOT push payments (outbound).
 *
 * Used for:
 *   ✅ Market creation fees (builder pays)
 *   ✅ Agent bond payments (agent pays)
 *
 * NOT used for:
 *   ❌ Agent payouts (use direct ERC-20 transfer from treasury instead)
 *
 * Supported chains (shipping SDK implementations only):
 *   - EVM: Base, Arbitrum, Optimism, Ethereum, Polygon, Avalanche
 *   - SVM: Solana
 *
 * Note: Specs exist for Aptos, Stellar, Sui, Algorand, Hedera but
 * no SDK implementations ship yet. Add when SDKs become available.
 */

// Facilitator with fallback
const coinbaseFacilitator = new HTTPFacilitatorClient({
  url: config.facilitatorUrl,
});

// Fallback facilitator — used if primary is unreachable
// To switch: update config.facilitatorUrl to config.facilitatorFallbackUrl
const _fallbackFacilitator = new HTTPFacilitatorClient({
  url: config.facilitatorFallbackUrl,
});

// x402 Resource Server — only networks supported by Coinbase facilitator (testnet)
export const x402Server = new x402ResourceServer(coinbaseFacilitator)
  .register("eip155:84532", new ExactEvmScheme())     // Base Sepolia
  .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme());  // Solana devnet

// Supported inbound payment networks (TESTNET)
// Only networks that the Coinbase facilitator actually supports
export const allNetworks: `${string}:${string}`[] = [
  "eip155:84532",      // Base Sepolia
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",  // Solana devnet
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
