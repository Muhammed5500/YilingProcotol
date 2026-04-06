import { createPublicClient, createWalletClient, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

// Minimal ABIs for Hub contract interaction
const skcEngineAbi = parseAbi([
  // Core functions (API-gated)
  "function createQuery(string question, uint256 alpha, uint256 k, uint256 flatReward, uint256 bondAmount, uint256 liquidityParam, uint256 initialPrice, uint256 fundingAmount, int128 minReputation, string reputationTag, address creator, string queryChain, string source) external returns (uint256)",
  "function getQuerySource(uint256 queryId) external view returns (string)",
  "function submitReport(uint256 queryId, uint256 probability, address reporter, uint256 bondAmount, string sourceChain) external",
  "function recordPayoutClaim(uint256 queryId, address reporter) external",
  "function forceResolve(uint256 queryId) external",

  // View functions
  "function getQueryInfo(uint256 queryId) external view returns (string question, uint256 currentPrice, address creator, bool resolved, uint256 totalPool, uint256 reportCount)",
  "function getQueryParams(uint256 queryId) external view returns (uint256 alpha, uint256 k, uint256 flatReward, uint256 bondAmount, uint256 liquidityParam, uint256 createdAt)",
  "function getReport(uint256 queryId, uint256 index) external view returns (uint256 agentId, address reporter, uint256 probability, uint256 priceBefore, uint256 priceAfter, uint256 bondAmount, string sourceChain, uint256 timestamp)",
  "function getReportCount(uint256 queryId) external view returns (uint256)",
  "function getPayoutAmount(uint256 queryId, address reporter) external view returns (uint256)",
  "function isQueryActive(uint256 queryId) external view returns (bool)",
  "function hasReported(uint256 queryId, address reporter) external view returns (bool)",
  "function hasClaimed(uint256 queryId, address reporter) external view returns (bool)",
  "function queryCount() external view returns (uint256)",

  // Events
  "event QueryCreated(uint256 indexed queryId, string question, uint256 alpha, uint256 initialPrice, address indexed creator)",
  "event ReportSubmitted(uint256 indexed queryId, uint256 indexed agentId, address indexed reporter, uint256 probability, uint256 priceBefore, uint256 reportIndex)",
  "event QueryResolved(uint256 indexed queryId, uint256 finalPrice, uint256 totalReports)",
  "event PayoutRecorded(uint256 indexed queryId, address indexed reporter, uint256 amount)",
]);

const agentRegistryAbi = parseAbi([
  "function joinEcosystem(uint256 agentId) external",
  "function isRegisteredAgent(address wallet) external view returns (bool)",
  "function getAgentId(address wallet) external view returns (uint256)",
  "function hasJoined(uint256 agentId) external view returns (bool)",
  "function totalJoinedAgents() external view returns (uint256)",
]);

const reputationManagerAbi = parseAbi([
  "function getAgentReputation(uint256 agentId) external view returns (uint64 count, int128 value, uint8 decimals)",
  "function getAgentReputationByTag(uint256 agentId, string tag2) external view returns (uint64 count, int128 value, uint8 decimals)",
  "function isAgentEligible(uint256 agentId, int128 minReputation, string tag2) external view returns (bool)",
]);

// Define Monad chain (custom since it's not in viem's built-in chains)
const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
} as const;

// ========== RPC RATE LIMITER ==========
// Monad public RPC allows 15 req/s — we cap at 10 to leave headroom.
// Uses token bucket: 10 tokens refilled per second, each RPC call costs 1 token.
const RPC_MAX_PER_SEC = 10;
const rpcQueue: Array<{ resolve: () => void }> = [];
let rpcTokens = RPC_MAX_PER_SEC;

setInterval(() => {
  rpcTokens = RPC_MAX_PER_SEC;
  while (rpcTokens > 0 && rpcQueue.length > 0) {
    rpcTokens--;
    rpcQueue.shift()!.resolve();
  }
}, 1000);

function rateLimitedFetch(url: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> {
  if (rpcTokens > 0) {
    rpcTokens--;
    return fetch(url, init);
  }
  return new Promise<void>((resolve) => rpcQueue.push({ resolve }))
    .then(() => fetch(url, init));
}

// Clients — rate-limited + multicall batching for Monad public RPC (15 req/s)
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(config.rpcUrl, {
    retryCount: 5,
    retryDelay: 1500,
    fetchOptions: {},
    fetch: rateLimitedFetch as any,
  }),
  batch: {
    multicall: true, // Batch multiple readContract calls into single multicall
  },
});

const account = config.privateKey
  ? privateKeyToAccount(config.privateKey as Hex)
  : undefined;

const walletClient = account
  ? createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(config.rpcUrl),
    })
  : undefined;

// ========== TX SERIALIZATION ==========
// Global write mutex — ensures only one chain write is in-flight at a time.
// This prevents nonce collisions when multiple queries/reports try to write concurrently.
let txQueue = Promise.resolve<any>(undefined);

function serializedWrite<T>(fn: () => Promise<T>): Promise<T> {
  const p = txQueue.then(() => fn(), () => fn());
  txQueue = p.then(() => {}, () => {});
  return p;
}

// ========== WRITE FUNCTIONS ==========

export async function createQuery(params: {
  question: string;
  alpha: bigint;
  k: bigint;
  flatReward: bigint;
  bondAmount: bigint;
  liquidityParam: bigint;
  initialPrice: bigint;
  fundingAmount: bigint;
  minReputation: bigint;
  reputationTag: string;
  creator: Address;
  queryChain: string;
  source: string;
}) {
  if (!walletClient) throw new Error("Wallet not configured");

  return serializedWrite(async () => {
    const hash = await walletClient.writeContract({
      address: config.skcEngineAddress as Address,
      abi: skcEngineAbi,
      functionName: "createQuery",
      args: [
        params.question,
        params.alpha,
        params.k,
        params.flatReward,
        params.bondAmount,
        params.liquidityParam,
        params.initialPrice,
        params.fundingAmount,
        params.minReputation,
        params.reputationTag,
        params.creator,
        params.queryChain,
        params.source,
      ],
      gas: 1_000_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error("Transaction reverted on-chain");
    }
    return { hash, receipt };
  });
}

export async function submitReport(params: {
  queryId: bigint;
  probability: bigint;
  reporter: Address;
  bondAmount: bigint;
  sourceChain: string;
}) {
  if (!walletClient) throw new Error("Wallet not configured");

  return serializedWrite(async () => {
    const hash = await walletClient.writeContract({
      address: config.skcEngineAddress as Address,
      abi: skcEngineAbi,
      functionName: "submitReport",
      args: [
        params.queryId,
        params.probability,
        params.reporter,
        params.bondAmount,
        params.sourceChain,
      ],
      gas: 1_000_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error("Transaction reverted on-chain");
    }
    return { hash, receipt };
  });
}

export async function recordPayoutClaim(queryId: bigint, reporter: Address) {
  if (!walletClient) throw new Error("Wallet not configured");

  return serializedWrite(async () => {
    const hash = await walletClient.writeContract({
      address: config.skcEngineAddress as Address,
      abi: skcEngineAbi,
      functionName: "recordPayoutClaim",
      args: [queryId, reporter],
      gas: 500_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error("Transaction reverted on-chain");
    }
    return { hash, receipt };
  });
}

export async function hasClaimed(queryId: bigint, reporter: Address): Promise<boolean> {
  const result = await publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "hasClaimed",
    args: [queryId, reporter],
  });
  return result as boolean;
}

export async function forceResolve(queryId: bigint) {
  if (!walletClient) throw new Error("Wallet not configured");

  return serializedWrite(async () => {
    const hash = await walletClient.writeContract({
      address: config.skcEngineAddress as Address,
      abi: skcEngineAbi,
      functionName: "forceResolve",
      args: [queryId],
      gas: 3_000_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error("Transaction reverted on-chain");
    }
    return { hash, receipt };
  });
}

// ========== READ FUNCTIONS ==========

export async function getQueryInfo(queryId: bigint) {
  const result = await publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "getQueryInfo",
    args: [queryId],
  });

  const [question, currentPrice, creator, resolved, totalPool, reportCount] = result;
  return { question, currentPrice, creator, resolved, totalPool, reportCount };
}

export async function getQueryParams(queryId: bigint) {
  const result = await publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "getQueryParams",
    args: [queryId],
  });

  const [alpha, k, flatReward, bondAmount, liquidityParam, createdAt] = result;
  return { alpha, k, flatReward, bondAmount, liquidityParam, createdAt };
}

export async function getReport(queryId: bigint, index: bigint) {
  const result = await publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "getReport",
    args: [queryId, index],
  });

  const [agentId, reporter, probability, priceBefore, priceAfter, bondAmount, sourceChain, timestamp] = result;
  return { agentId, reporter, probability, priceBefore, priceAfter, bondAmount, sourceChain, timestamp };
}

export async function getReportCount(queryId: bigint) {
  return publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "getReportCount",
    args: [queryId],
  });
}

export async function getPayoutAmount(queryId: bigint, reporter: Address) {
  return publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "getPayoutAmount",
    args: [queryId, reporter],
  });
}

export async function isQueryActive(queryId: bigint) {
  return publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "isQueryActive",
    args: [queryId],
  });
}

export async function getQueryCount() {
  return publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "queryCount",
  });
}

export async function getQuerySourceOnChain(queryId: bigint): Promise<string> {
  try {
    return await publicClient.readContract({
      address: config.skcEngineAddress as Address,
      abi: skcEngineAbi,
      functionName: "getQuerySource",
      args: [queryId],
    }) as string;
  } catch {
    return "";
  }
}

export async function hasReported(queryId: bigint, reporter: Address) {
  return publicClient.readContract({
    address: config.skcEngineAddress as Address,
    abi: skcEngineAbi,
    functionName: "hasReported",
    args: [queryId, reporter],
  });
}

// ========== AGENT FUNCTIONS ==========

export async function isRegisteredAgent(wallet: Address) {
  return publicClient.readContract({
    address: config.agentRegistryAddress as Address,
    abi: agentRegistryAbi,
    functionName: "isRegisteredAgent",
    args: [wallet],
  });
}

export async function getAgentId(wallet: Address) {
  return publicClient.readContract({
    address: config.agentRegistryAddress as Address,
    abi: agentRegistryAbi,
    functionName: "getAgentId",
    args: [wallet],
  });
}

export async function hasJoined(agentId: bigint) {
  return publicClient.readContract({
    address: config.agentRegistryAddress as Address,
    abi: agentRegistryAbi,
    functionName: "hasJoined",
    args: [agentId],
  });
}

export async function totalJoinedAgents() {
  return publicClient.readContract({
    address: config.agentRegistryAddress as Address,
    abi: agentRegistryAbi,
    functionName: "totalJoinedAgents",
  });
}

// ========== REPUTATION FUNCTIONS ==========

// ERC-8004 Reputation Registry (direct call, bypassing ReputationManager read issue)
const erc8004ReputationAbi = parseAbi([
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 value, uint8 decimals)",
]);

const ERC8004_REPUTATION = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address;

export async function getAgentReputation(agentId: bigint) {
  const result = await publicClient.readContract({
    address: ERC8004_REPUTATION,
    abi: erc8004ReputationAbi,
    functionName: "getSummary",
    args: [agentId, [config.reputationManagerAddress as Address], "skc_accuracy", ""],
  });

  const [count, value, decimals] = result;
  return { count, value, decimals };
}

export async function getAgentReputationByTag(agentId: bigint, tag: string) {
  const result = await publicClient.readContract({
    address: ERC8004_REPUTATION,
    abi: erc8004ReputationAbi,
    functionName: "getSummary",
    args: [agentId, [config.reputationManagerAddress as Address], "skc_accuracy", tag],
  });

  const [count, value, decimals] = result;
  return { count, value, decimals };
}
