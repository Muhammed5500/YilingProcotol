import "dotenv/config";

export const config = {
  // Hub Contract (Monad)
  rpcUrl: process.env.RPC_URL || "https://testnet-rpc.monad.xyz",
  privateKey: process.env.PRIVATE_KEY || "",

  // Contract addresses (set after deployment)
  skcEngineAddress: process.env.SKC_ENGINE_ADDRESS || "",
  queryFactoryAddress: process.env.QUERY_FACTORY_ADDRESS || "",
  agentRegistryAddress: process.env.AGENT_REGISTRY_ADDRESS || "",
  reputationManagerAddress: process.env.REPUTATION_MANAGER_ADDRESS || "",

  // x402 (inbound payments only — pull protocol, cannot push payouts)
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator",
  facilitatorFallbackUrl: process.env.X402_FACILITATOR_FALLBACK_URL || "https://api.cdp.coinbase.com/platform/v2/x402",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",

  // Environment
  isMainnet: process.env.NETWORK_ENV === "mainnet",

  // Server
  port: parseInt(process.env.PORT || "3001"),

  // x402 inbound payment chains
  // Toggle between testnet and mainnet via NETWORK_ENV
  acceptedPayments: process.env.NETWORK_ENV === "mainnet"
    ? [
        // Mainnet
        { network: "eip155:8453", asset: "USDC" },      // Base
        { network: "eip155:42161", asset: "USDC" },     // Arbitrum
        { network: "eip155:10", asset: "USDC" },        // Optimism
        { network: "eip155:1", asset: "USDC" },         // Ethereum
        { network: "eip155:137", asset: "USDC" },       // Polygon
        { network: "eip155:43114", asset: "USDC" },     // Avalanche
        { network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", asset: "USDC" },  // Solana
      ]
    : [
        // Testnet (default)
        { network: "eip155:84532", asset: "USDC" },     // Base Sepolia
        { network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", asset: "USDC" },  // Solana devnet
      ],
};
