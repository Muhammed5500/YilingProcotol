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

  // x402 (inbound payments — multi-chain, facilitator per network)
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/v2/x402",
  facilitatorFallbackUrl: process.env.X402_FACILITATOR_FALLBACK_URL || "https://www.x402.org/facilitator",
  monadFacilitatorUrl: process.env.MONAD_FACILITATOR_URL || "https://x402-facilitator.molandak.org",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",

  // Environment
  isMainnet: process.env.NETWORK_ENV === "mainnet",

  // Server
  port: parseInt(process.env.PORT || "3001"),

  // Orchestrator
  orchestrator: {
    poolingWindowMs: parseInt(process.env.ORCHESTRATOR_POOLING_WINDOW_MS || "30000"),
    roundTimeoutMs: parseInt(process.env.ORCHESTRATOR_ROUND_TIMEOUT_MS || "60000"),
    minPoolSize: parseInt(process.env.ORCHESTRATOR_MIN_POOL_SIZE || "1"),
    maxPoolSize: parseInt(process.env.ORCHESTRATOR_MAX_POOL_SIZE || "50"),
  },

  // x402 inbound payment chains — all supported networks
  // Hub contract stays on Monad, payments accepted from any chain
  acceptedPayments: process.env.NETWORK_ENV === "mainnet"
    ? [
        { network: "eip155:8453", asset: "USDC" },      // Base
        { network: "eip155:10143", asset: "USDC" },     // Monad
        { network: "eip155:42161", asset: "USDC" },     // Arbitrum
        { network: "eip155:10", asset: "USDC" },        // Optimism
        { network: "eip155:1", asset: "USDC" },         // Ethereum
        { network: "eip155:137", asset: "USDC" },       // Polygon
        { network: "eip155:43114", asset: "USDC" },     // Avalanche
      ]
    : [
        { network: "eip155:84532", asset: "USDC" },     // Base Sepolia
        { network: "eip155:10143", asset: "USDC" },     // Monad Testnet
        { network: "eip155:421614", asset: "USDC" },    // Arbitrum Sepolia
        { network: "eip155:11155111", asset: "USDC" },  // Ethereum Sepolia
      ],
};
