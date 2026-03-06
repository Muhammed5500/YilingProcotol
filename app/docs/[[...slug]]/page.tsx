"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Book,
  ChevronRight,
  Code2,
  Cpu,
  FileText,
  Globe,
  Layers,
  Menu,
  Moon,
  Sun,
  X,
  Zap,
  Dices,
} from "lucide-react";

// ─── Docs Structure ──────────────────────────────────────────────────────────

const docsTree = [
  {
    title: "Getting Started",
    icon: Book,
    items: [
      { slug: "getting-started/overview", title: "Overview" },
      { slug: "getting-started/quickstart", title: "Quickstart" },
      { slug: "getting-started/architecture", title: "Architecture" },
    ],
  },
  {
    title: "Use Cases",
    icon: Dices,
    items: [
      { slug: "use-cases/prediction-markets", title: "Prediction Markets" },
      { slug: "use-cases/governance", title: "DAO Governance" },
      { slug: "use-cases/dispute-resolution", title: "Dispute Resolution" },
      { slug: "use-cases/data-labeling", title: "Data Labeling & AI" },
      { slug: "use-cases/subjective-oracles", title: "Subjective Oracles" },
    ],
  },
  {
    title: "Smart Contracts",
    icon: Code2,
    items: [
      { slug: "contracts/installation", title: "Installation" },
      { slug: "contracts/prediction-market", title: "PredictionMarket" },
      { slug: "contracts/market-factory", title: "MarketFactory" },
      { slug: "contracts/fixed-point-math", title: "FixedPointMath" },
    ],
  },
  {
    title: "SDK & Agents",
    icon: Cpu,
    items: [
      { slug: "sdk/installation", title: "Installation" },
      { slug: "sdk/build-an-agent", title: "Build an Agent" },
      { slug: "sdk/agent-strategies", title: "Agent Strategies" },
    ],
  },
  {
    title: "Chains",
    icon: Globe,
    items: [
      { slug: "chains/overview", title: "Overview" },
      { slug: "chains/ethereum", title: "Ethereum" },
      { slug: "chains/base", title: "Base" },
      { slug: "chains/arbitrum", title: "Arbitrum" },
      { slug: "chains/optimism", title: "Optimism" },
      { slug: "chains/polygon", title: "Polygon" },
      { slug: "chains/bnb-chain", title: "BNB Chain" },
      { slug: "chains/avalanche", title: "Avalanche" },
      { slug: "chains/zksync", title: "zkSync" },
      { slug: "chains/scroll", title: "Scroll" },
      { slug: "chains/linea", title: "Linea" },
      { slug: "chains/mantle", title: "Mantle" },
      { slug: "chains/blast", title: "Blast" },
      { slug: "chains/gnosis", title: "Gnosis" },
      { slug: "chains/fantom", title: "Fantom" },
      { slug: "chains/celo", title: "Celo" },
      { slug: "chains/starknet", title: "Starknet" },
      { slug: "chains/monad", title: "Monad" },
      { slug: "chains/berachain", title: "Berachain" },
      { slug: "chains/sei", title: "Sei" },
      { slug: "chains/solana", title: "Solana" },
      { slug: "chains/sui", title: "Sui" },
      { slug: "chains/aptos", title: "Aptos" },
      { slug: "chains/near", title: "Near" },
      { slug: "chains/cosmos", title: "Cosmos" },
      { slug: "chains/polkadot", title: "Polkadot" },
      { slug: "chains/ton", title: "TON" },
      { slug: "chains/cardano", title: "Cardano" },
      { slug: "chains/algorand", title: "Algorand" },
      { slug: "chains/hedera", title: "Hedera" },
      { slug: "chains/tron", title: "Tron" },
      { slug: "chains/injective", title: "Injective" },
      { slug: "chains/osmosis", title: "Osmosis" },
      { slug: "chains/mina", title: "Mina" },
      { slug: "chains/eclipse", title: "Eclipse" },
    ],
  },
  {
    title: "Deployments",
    icon: FileText,
    items: [
      { slug: "deployments/addresses", title: "Contract Addresses" },
      { slug: "deployments/deploy-your-own", title: "Deploy Your Own" },
    ],
  },
  {
    title: "Integration",
    icon: Zap,
    items: [
      { slug: "integration/direct-contract", title: "Direct Contract" },
      { slug: "integration/api-reference", title: "API & WebSocket" },
    ],
  },
  {
    title: "Reference",
    icon: Layers,
    items: [
      { slug: "reference/skc-mechanism", title: "SKC Mechanism" },
      { slug: "reference/scoring", title: "Cross-Entropy Scoring" },
      { slug: "reference/parameters", title: "Parameters" },
      { slug: "reference/research", title: "Academic Research" },
    ],
  },
];

// ─── Chain Data ──────────────────────────────────────────────────────────────

interface ChainInfo {
  name: string;
  slug: string;
  type: "evm" | "non-evm";
  chainId?: number;
  testnetChainId?: number;
  gasToken: string;
  rpc: string;
  testnetRpc?: string;
  explorer: string;
  testnetExplorer?: string;
  faucet?: string;
  contract?: string;
  testnetContract?: string;
  notes?: string;
  category: string;
}

const chainData: ChainInfo[] = [
  { name: "Ethereum", slug: "ethereum", type: "evm", chainId: 1, testnetChainId: 11155111, gasToken: "ETH", rpc: "https://eth.llamarpc.com", testnetRpc: "https://rpc.sepolia.org", explorer: "https://etherscan.io", testnetExplorer: "https://sepolia.etherscan.io", faucet: "https://sepoliafaucet.com", testnetContract: "0x1234...abcd", notes: "The original EVM chain. Highest security and decentralization, but also highest gas costs. Consider L2s for cost-sensitive applications.", category: "L1" },
  { name: "Base", slug: "base", type: "evm", chainId: 8453, testnetChainId: 84532, gasToken: "ETH", rpc: "https://mainnet.base.org", testnetRpc: "https://sepolia.base.org", explorer: "https://basescan.org", testnetExplorer: "https://sepolia.basescan.org", faucet: "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet", testnetContract: "0x1234...abcd", notes: "Coinbase's L2. Low fees, high throughput, large user base. Recommended for most new deployments.", category: "L2 — Optimistic" },
  { name: "Arbitrum", slug: "arbitrum", type: "evm", chainId: 42161, testnetChainId: 421614, gasToken: "ETH", rpc: "https://arb1.arbitrum.io/rpc", testnetRpc: "https://sepolia-rollup.arbitrum.io/rpc", explorer: "https://arbiscan.io", testnetExplorer: "https://sepolia.arbiscan.io", faucet: "https://faucet.quicknode.com/arbitrum/sepolia", testnetContract: "0x5678...efgh", notes: "Largest Ethereum L2 by TVL. Nitro stack provides EVM equivalence with sub-cent transactions.", category: "L2 — Optimistic" },
  { name: "Optimism", slug: "optimism", type: "evm", chainId: 10, testnetChainId: 11155420, gasToken: "ETH", rpc: "https://mainnet.optimism.io", testnetRpc: "https://sepolia.optimism.io", explorer: "https://optimistic.etherscan.io", testnetExplorer: "https://sepolia-optimistic.etherscan.io", faucet: "https://faucet.quicknode.com/optimism/sepolia", testnetContract: "0x9abc...ijkl", notes: "OP Stack L2. Part of the Superchain ecosystem. Governance-heavy community — ideal for DAO use cases.", category: "L2 — Optimistic" },
  { name: "Polygon", slug: "polygon", type: "evm", chainId: 137, testnetChainId: 80002, gasToken: "POL", rpc: "https://polygon-rpc.com", testnetRpc: "https://rpc-amoy.polygon.technology", explorer: "https://polygonscan.com", testnetExplorer: "https://amoy.polygonscan.com", faucet: "https://faucet.polygon.technology", notes: "High-throughput sidechain/L2. Very low gas costs. Large DeFi and gaming ecosystem.", category: "L2 — ZK" },
  { name: "BNB Chain", slug: "bnb-chain", type: "evm", chainId: 56, testnetChainId: 97, gasToken: "BNB", rpc: "https://bsc-dataseed.binance.org", testnetRpc: "https://data-seed-prebsc-1-s1.binance.org:8545", explorer: "https://bscscan.com", testnetExplorer: "https://testnet.bscscan.com", faucet: "https://testnet.binance.org/faucet-smart", notes: "Binance ecosystem. High throughput, low fees. Large user base in Asia.", category: "L1" },
  { name: "Avalanche", slug: "avalanche", type: "evm", chainId: 43114, testnetChainId: 43113, gasToken: "AVAX", rpc: "https://api.avax.network/ext/bc/C/rpc", testnetRpc: "https://api.avax-test.network/ext/bc/C/rpc", explorer: "https://snowtrace.io", testnetExplorer: "https://testnet.snowtrace.io", faucet: "https://faucet.avax.network", notes: "Sub-second finality. Subnet architecture allows custom chains. Good for institutional use cases.", category: "L1" },
  { name: "zkSync", slug: "zksync", type: "evm", chainId: 324, testnetChainId: 300, gasToken: "ETH", rpc: "https://mainnet.era.zksync.io", testnetRpc: "https://sepolia.era.zksync.dev", explorer: "https://explorer.zksync.io", testnetExplorer: "https://sepolia.explorer.zksync.io", faucet: "https://faucet.quicknode.com/zksync/sepolia", notes: "ZK rollup with native account abstraction. Note: some Solidity opcodes behave differently — test thoroughly.", category: "L2 — ZK" },
  { name: "Scroll", slug: "scroll", type: "evm", chainId: 534352, testnetChainId: 534351, gasToken: "ETH", rpc: "https://rpc.scroll.io", testnetRpc: "https://sepolia-rpc.scroll.io", explorer: "https://scrollscan.com", testnetExplorer: "https://sepolia.scrollscan.com", faucet: "https://scroll.io/bridge", notes: "EVM-equivalent ZK rollup. Bytecode-level compatibility means no contract modifications needed.", category: "L2 — ZK" },
  { name: "Linea", slug: "linea", type: "evm", chainId: 59144, testnetChainId: 59141, gasToken: "ETH", rpc: "https://rpc.linea.build", testnetRpc: "https://rpc.sepolia.linea.build", explorer: "https://lineascan.build", testnetExplorer: "https://sepolia.lineascan.build", faucet: "https://faucet.goerli.linea.build", notes: "ConsenSys ZK rollup. Full EVM equivalence. Backed by MetaMask ecosystem.", category: "L2 — ZK" },
  { name: "Mantle", slug: "mantle", type: "evm", chainId: 5000, testnetChainId: 5003, gasToken: "MNT", rpc: "https://rpc.mantle.xyz", testnetRpc: "https://rpc.sepolia.mantle.xyz", explorer: "https://explorer.mantle.xyz", testnetExplorer: "https://sepolia.mantlescan.xyz", notes: "Modular L2 with EigenDA for data availability. Very low gas fees. Note: gas token is MNT, not ETH.", category: "L2 — Optimistic" },
  { name: "Blast", slug: "blast", type: "evm", chainId: 81457, testnetChainId: 168587773, gasToken: "ETH", rpc: "https://rpc.blast.io", testnetRpc: "https://sepolia.blast.io", explorer: "https://blastscan.io", testnetExplorer: "https://sepolia.blastscan.io", notes: "L2 with native yield on ETH and stablecoins. ETH deposited automatically earns yield.", category: "L2 — Optimistic" },
  { name: "Gnosis", slug: "gnosis", type: "evm", chainId: 100, testnetChainId: 10200, gasToken: "xDAI", rpc: "https://rpc.gnosischain.com", testnetRpc: "https://rpc.chiadochain.net", explorer: "https://gnosisscan.io", testnetExplorer: "https://gnosis-chiado.blockscout.com", faucet: "https://gnosisfaucet.com", notes: "Stable gas costs (xDAI-denominated). Popular for governance and prediction market applications.", category: "L1" },
  { name: "Fantom", slug: "fantom", type: "evm", chainId: 250, testnetChainId: 4002, gasToken: "FTM", rpc: "https://rpc.ftm.tools", testnetRpc: "https://rpc.testnet.fantom.network", explorer: "https://ftmscan.com", testnetExplorer: "https://testnet.ftmscan.com", faucet: "https://faucet.fantom.network", notes: "DAG-based consensus with ~1s finality. Migrating to Sonic upgrade for higher throughput.", category: "L1" },
  { name: "Celo", slug: "celo", type: "evm", chainId: 42220, testnetChainId: 44787, gasToken: "CELO", rpc: "https://forno.celo.org", testnetRpc: "https://alfajores-forno.celo-testnet.org", explorer: "https://celoscan.io", testnetExplorer: "https://alfajores.celoscan.io", faucet: "https://faucet.celo.org", notes: "Mobile-first L1, now transitioning to Ethereum L2. Gas payable in stablecoins (cUSD).", category: "L1" },
  { name: "Starknet", slug: "starknet", type: "non-evm", gasToken: "ETH", rpc: "https://starknet-mainnet.public.blastapi.io", explorer: "https://starkscan.co", notes: "ZK rollup using Cairo language (not EVM). Requires contract rewrite in Cairo. The SKC math logic (ln, cross-entropy) is fully portable — Cairo supports fixed-point arithmetic.", category: "L2 — ZK" },
  { name: "Monad", slug: "monad", type: "evm", gasToken: "MON", rpc: "TBA — Monad mainnet not yet launched", explorer: "TBA", notes: "Upcoming high-performance EVM chain (10,000 TPS). Full EVM bytecode compatibility — deploy without modifications when mainnet launches.", category: "L1" },
  { name: "Berachain", slug: "berachain", type: "evm", chainId: 80094, gasToken: "BERA", rpc: "https://rpc.berachain.com", explorer: "https://berascan.com", notes: "Proof-of-Liquidity consensus. EVM compatible. Unique economics: validators earn fees through liquidity provision.", category: "L1" },
  { name: "Sei", slug: "sei", type: "evm", chainId: 1329, testnetChainId: 1328, gasToken: "SEI", rpc: "https://evm-rpc.sei-apis.com", testnetRpc: "https://evm-rpc-testnet.sei-apis.com", explorer: "https://seitrace.com", testnetExplorer: "https://testnet.seitrace.com", notes: "Parallelized EVM with ~400ms finality. Optimized for trading applications. Dual EVM + CosmWasm execution.", category: "L1" },
  { name: "Solana", slug: "solana", type: "non-evm", gasToken: "SOL", rpc: "https://api.mainnet-beta.solana.com", explorer: "https://solscan.io", notes: "High-performance L1 using Rust/Anchor. Requires full contract rewrite in Rust. The SKC mechanism math is straightforward to port — Solana has mature fixed-point math libraries.", category: "L1" },
  { name: "Sui", slug: "sui", type: "non-evm", gasToken: "SUI", rpc: "https://fullnode.mainnet.sui.io", explorer: "https://suiscan.xyz", notes: "Object-oriented L1 using Move language. Requires contract rewrite in Move. Move's resource model maps well to the market state machine pattern.", category: "L1" },
  { name: "Aptos", slug: "aptos", type: "non-evm", gasToken: "APT", rpc: "https://fullnode.mainnet.aptoslabs.com/v1", explorer: "https://explorer.aptoslabs.com", notes: "Move-based L1 (forked from Diem). Similar porting path to Sui — Move language, resource-oriented state.", category: "L1" },
  { name: "Near", slug: "near", type: "non-evm", gasToken: "NEAR", rpc: "https://rpc.mainnet.near.org", explorer: "https://nearblocks.io", notes: "Sharded L1 using Rust/AssemblyScript. Account-based model. Near also supports Aurora (EVM) — you can deploy Solidity contracts via Aurora without porting.", category: "L1" },
  { name: "Cosmos", slug: "cosmos", type: "non-evm", gasToken: "ATOM", rpc: "https://cosmos-rpc.publicnode.com:443", explorer: "https://www.mintscan.io/cosmos", notes: "App-chain ecosystem using CosmWasm (Rust). Each app can have its own chain via Cosmos SDK. IBC enables cross-chain communication between Cosmos chains.", category: "L1" },
  { name: "Polkadot", slug: "polkadot", type: "non-evm", gasToken: "DOT", rpc: "https://rpc.polkadot.io", explorer: "https://polkadot.subscan.io", notes: "Parachain ecosystem using Substrate (Rust/ink!). Deploy as a smart contract on a parachain like Astar (which supports EVM), or build a dedicated parachain.", category: "L1" },
  { name: "TON", slug: "ton", type: "non-evm", gasToken: "TON", rpc: "https://toncenter.com/api/v2", explorer: "https://tonscan.org", notes: "Telegram's blockchain. Uses FunC/Tact language. Unique async message-passing architecture. Large user base via Telegram mini-apps.", category: "L1" },
  { name: "Cardano", slug: "cardano", type: "non-evm", gasToken: "ADA", rpc: "https://cardano-mainnet.blockfrost.io/api/v0", explorer: "https://cardanoscan.io", notes: "UTXO-based L1 using Plutus (Haskell) or Aiken. Different programming model from account-based chains — requires architectural adaptation for sequential reporting.", category: "L1" },
  { name: "Algorand", slug: "algorand", type: "non-evm", gasToken: "ALGO", rpc: "https://mainnet-api.algonode.cloud", explorer: "https://allo.info", notes: "Pure proof-of-stake L1. Smart contracts in TEAL or PyTeal. Instant finality (~3.3s). Good for applications requiring guaranteed settlement.", category: "L1" },
  { name: "Hedera", slug: "hedera", type: "evm", chainId: 295, gasToken: "HBAR", rpc: "https://mainnet.hashio.io/api", explorer: "https://hashscan.io", notes: "Hashgraph consensus (not traditional blockchain). EVM compatible via Hedera Smart Contract Service. Fixed, low USD-denominated fees.", category: "L1" },
  { name: "Tron", slug: "tron", type: "non-evm", gasToken: "TRX", rpc: "https://api.trongrid.io", explorer: "https://tronscan.org", notes: "Solidity-compatible but not standard EVM. Uses energy/bandwidth model instead of gas. Minor contract modifications may be needed. Dominant in USDT transfers.", category: "L1" },
  { name: "Injective", slug: "injective", type: "non-evm", gasToken: "INJ", rpc: "https://sentry.lcd.injective.network", explorer: "https://explorer.injective.network", notes: "Cosmos-based chain optimized for finance. Supports CosmWasm smart contracts. Built-in order book module — potential synergy with prediction market mechanics.", category: "L1" },
  { name: "Osmosis", slug: "osmosis", type: "non-evm", gasToken: "OSMO", rpc: "https://rpc.osmosis.zone", explorer: "https://www.mintscan.io/osmosis", notes: "Cosmos DEX chain with CosmWasm support. IBC-connected to 50+ Cosmos chains. Deploy once, accessible from the entire Cosmos ecosystem.", category: "L1" },
  { name: "Mina", slug: "mina", type: "non-evm", gasToken: "MINA", rpc: "https://api.minascan.io", explorer: "https://minascan.io", notes: "ZK-native L1 using o1js (TypeScript). Unique: entire blockchain is 22KB. Smart contracts are ZK circuits. Novel approach to truth discovery with built-in privacy.", category: "L1" },
  { name: "Eclipse", slug: "eclipse", type: "non-evm", gasToken: "ETH", rpc: "https://mainnetbeta-rpc.eclipse.xyz", explorer: "https://eclipsescan.xyz", notes: "Ethereum L2 using Solana Virtual Machine (SVM). Write contracts in Rust (Solana-style) but settle on Ethereum. If you've ported to Solana, Eclipse deployment is trivial.", category: "L2" },
];

function generateChainPages(): Record<string, string> {
  const pages: Record<string, string> = {};

  // Overview page
  const evmChains = chainData.filter(c => c.type === "evm");
  const nonEvmChains = chainData.filter(c => c.type === "non-evm");
  const deployed = chainData.filter(c => c.testnetContract);

  pages["chains/overview"] = `# Chain Integration Overview

Yiling Protocol is chain-agnostic. Deploy on any chain, or connect to an existing deployment.

## Live Deployments

| Chain | Network | Contract |
|-------|---------|----------|
${deployed.map(c => `| ${c.name} | Testnet | \`${c.testnetContract}\` |`).join("\n")}

> Mainnet deployments coming after testnet validation.

## EVM Chains (${evmChains.length}) — Deploy Directly

No contract modifications needed. Use \`forge install\` + \`forge script\` to deploy.

${evmChains.map(c => `- [${c.name}](/docs/chains/${c.slug}) — ${c.category} · Gas: ${c.gasToken}${c.chainId ? ` · Chain ID: ${c.chainId}` : ""}`).join("\n")}

## Non-EVM Chains (${nonEvmChains.length}) — Requires Porting

The SKC mechanism math (ln, cross-entropy, random stop) is fully portable. Core logic needs rewriting in the target language.

${nonEvmChains.map(c => `- [${c.name}](/docs/chains/${c.slug}) — ${c.category} · Gas: ${c.gasToken}`).join("\n")}

## Porting Checklist (Non-EVM)

1. **FixedPointMath** — implement \`lnWad()\` with fixed-point arithmetic
2. **Market State Machine** — create, predict, resolve lifecycle
3. **Cross-Entropy Scoring** — \`S(q,p) = q·ln(p) + (1-q)·ln(1-p)\`
4. **Random Stop** — block hash based randomness with probability α
5. **Payout Logic** — bond recovery + scoring delta`;

  // Individual chain pages
  for (const chain of chainData) {
    if (chain.type === "evm") {
      pages[`chains/${chain.slug}`] = `# ${chain.name}

**${chain.category}** · Gas Token: **${chain.gasToken}**${chain.chainId ? ` · Chain ID: **${chain.chainId}**` : ""}

${chain.notes}

## Network Details

| Property | Mainnet | Testnet |
|----------|---------|---------|
| Chain ID | ${chain.chainId || "TBA"} | ${chain.testnetChainId || "—"} |
| RPC | \`${chain.rpc}\` | ${chain.testnetRpc ? `\`${chain.testnetRpc}\`` : "—"} |
| Explorer | [${chain.explorer}](${chain.explorer}) | ${chain.testnetExplorer ? `[Link](${chain.testnetExplorer})` : "—"} |
| Gas Token | ${chain.gasToken} | ${chain.gasToken} |
${chain.faucet ? `| Faucet | — | [Get testnet tokens](${chain.faucet}) |` : ""}
${chain.testnetContract ? `| Contract | *Coming soon* | \`${chain.testnetContract}\` |` : ""}

## Deploy

\`\`\`bash
# Install
forge install yiling-protocol/contracts

# Deploy to ${chain.name}${chain.testnetRpc ? ` testnet` : ""}
forge script lib/contracts/script/Deploy.s.sol \\
  --rpc-url ${chain.testnetRpc || chain.rpc} \\
  --broadcast \\
  --private-key $PRIVATE_KEY${chain.testnetChainId ? ` \\
  --chain-id ${chain.testnetChainId}` : ""}
\`\`\`

## Verify Contract

\`\`\`bash
forge verify-contract $DEPLOYED_ADDRESS PredictionMarket \\
  --chain-id ${chain.testnetChainId || chain.chainId || "CHAIN_ID"} \\
  --etherscan-api-key $API_KEY
\`\`\`

## Connect via SDK

\`\`\`python
from yiling_sdk import YilingClient

client = YilingClient(
    rpc_url="${chain.testnetRpc || chain.rpc}",
    contract="${chain.testnetContract || "0xYOUR_DEPLOYED_ADDRESS"}",
    private_key="0xYOUR_KEY"
)

markets = client.get_active_markets()
client.predict(market_id=0, probability=0.72)
\`\`\`

## Connect via ethers.js

\`\`\`javascript
import { ethers } from "ethers";
import { PREDICTION_MARKET_ABI } from "@yiling/sdk";

const provider = new ethers.JsonRpcProvider("${chain.testnetRpc || chain.rpc}");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, PREDICTION_MARKET_ABI, wallet);

await contract.predict(0, ethers.parseEther("0.72"), {
  value: ethers.parseEther("0.1")
});
\`\`\`

## Connect via Foundry

\`\`\`bash
export CONTRACT=0xYOUR_CONTRACT
export RPC=${chain.testnetRpc || chain.rpc}

# Read markets
cast call $CONTRACT "getMarketCount()" --rpc-url $RPC

# Submit prediction
cast send $CONTRACT "predict(uint256,uint256)" 0 720000000000000000 \\
  --value 0.1ether --private-key $KEY --rpc-url $RPC
\`\`\``;
    } else {
      // Non-EVM chain
      pages[`chains/${chain.slug}`] = `# ${chain.name}

**${chain.category}** · Gas Token: **${chain.gasToken}** · **Non-EVM**

${chain.notes}

## Network Details

| Property | Value |
|----------|-------|
| RPC | \`${chain.rpc}\` |
| Explorer | [${chain.explorer}](${chain.explorer}) |
| Gas Token | ${chain.gasToken} |
| VM | Non-EVM |

## Status: Requires Porting

${chain.name} is not EVM-compatible. Deploying Yiling Protocol requires porting the smart contracts to ${chain.name}'s native language.

The core SKC mechanism is **math-based and fully portable**:

| Component | What to Port |
|-----------|-------------|
| FixedPointMath | \`lnWad()\` — fixed-point natural logarithm |
| Market State | Create → Predict → Resolve → Claim lifecycle |
| Cross-Entropy | \`S(q,p) = q·ln(p) + (1-q)·ln(1-p)\` |
| Random Stop | Block hash based: \`hash % WAD < alpha\` |
| Payout Logic | Bond ± scoring delta, pro-rata scaling |

## Porting Guide

### Step 1: Fixed-Point Math

Implement \`ln(x)\` in fixed-point arithmetic (1e18 precision). This is the most critical component — all scoring depends on it.

\`\`\`
ln(x) for x in [0.01, 0.99] range
Precision: 1e18 (WAD format)
Must handle: lnWad(0.5e18) = -693147180559945309
\`\`\`

### Step 2: Market State Machine

\`\`\`
States: Created → Active → Resolved
Transitions:
  - createMarket() → Created (with parameters + funding)
  - predict() → Active (bond deposited, stop check)
  - resolve() → Resolved (triggered by stop check or force)
  - claimPayout() → funds distributed
\`\`\`

### Step 3: Scoring & Payouts

\`\`\`
For each agent i (except last k):
  delta = S(qFinal, priceAfter_i) - S(qFinal, priceBefore_i)
  payout = max(0, bond + b * delta)

For last k agents:
  payout = bond + flatReward
\`\`\`

### Step 4: Random Stop

After each prediction, check:
\`\`\`
hash(block_data, market_id, prediction_count) % WAD < alpha
\`\`\`

If true → market resolves.

## Alternative: EVM Compatibility Layer

${chain.slug === "near" ? `Near has **Aurora** — an EVM compatibility layer. You can deploy Yiling Protocol's Solidity contracts directly on Aurora without any porting.` : chain.slug === "polkadot" ? `Polkadot has EVM-compatible parachains like **Astar** and **Moonbeam**. Deploy Solidity contracts directly there without porting.` : chain.slug === "cosmos" || chain.slug === "injective" || chain.slug === "osmosis" ? `Some Cosmos chains support **Ethermint** (EVM module). Check if ${chain.name} has EVM support — if so, you can deploy Solidity contracts directly.` : `Check if ${chain.name} has an EVM compatibility layer or bridge. If available, you can deploy the Solidity contracts without porting.`}

## Community Ports

*No community ports yet.* If you port Yiling Protocol to ${chain.name}, submit a PR to be listed here.`;
    }
  }

  return pages;
}

// ─── Markdown content (embedded) ─────────────────────────────────────────────

const docsContent: Record<string, string> = {

  // ── GETTING STARTED ──────────────────────────────────────────────────────

  "getting-started/overview": `# Overview

## What is Yiling Protocol?

Yiling Protocol is an **open, oracle-free truth discovery infrastructure**. It implements the SKC (Srinivasan-Karger-Chen) mechanism — a mathematically proven system where consensus emerges from game theory, not external oracles or human referees.

Based on [peer-reviewed research](https://arxiv.org/abs/2306.04305) from Harvard (published at ACM EC 2025), the protocol provides a general-purpose primitive for **eliciting and aggregating truthful information** in any context where ground truth is unverifiable, subjective, or long-horizon.

Anyone can deploy the protocol on any chain, create resolution instances, connect agents, and build applications on top. The entire system is permissionless and modular.

## The Problem

Systems that need to determine truth — prediction markets, governance, dispute resolution, content moderation, data labeling — all face the same bottleneck: **who decides what's true?**

- **Prediction markets** depend on external oracles (Polymarket's UMA oracle was [manipulated in 2025](https://orochi.network/blog/oracle-manipulation-in-polymarket-2025))
- **DAO governance** relies on token-weighted voting (plutocracy, low participation)
- **Dispute resolution** requires trusted arbiters (centralization, bias)
- **AI data labeling** depends on human reviewers (expensive, inconsistent)

Every system that relies on an external authority to determine truth inherits that authority's limitations, biases, and attack surface.

## The Solution

Yiling Protocol removes the oracle entirely. Instead, truth emerges from **game theory and information aggregation**:

- **Self-resolving** — instances close themselves through probabilistic stopping
- **Truthful equilibrium** — honest reporting is a Perfect Bayesian Equilibrium (mathematically proven)
- **Cross-entropy scoring** — participants earn rewards proportional to accuracy
- **Bond-based** — every report requires a deposit, creating real skin in the game
- **Information aggregation** — sequential observation enables full signal fusion
- **Permissionless** — anyone can deploy, create instances, or connect agents
- **Chain-agnostic** — deploy on any EVM chain, portable to non-EVM

## How It Works

\`\`\`
1. Anyone creates an instance ("question + parameters")
       ↓
2. Agents report sequentially (each posts a bond)
       ↓
3. After each report: random stop check (probability α)
       ↓
4. Instance resolves → last report = reference truth
       ↓
5. Cross-entropy scoring calculates payouts
       ↓
6. Agents claim: bond + reward (accurate) or bond - penalty (inaccurate)
\`\`\`

The key insight: every agent could be the last one, and the last agent's report *becomes* truth. Since the last agent has observed all previous reports plus their own private information, they represent the most informed view. This makes honest reporting the dominant strategy for *every* agent at *every* step.

## Protocol vs Implementation

| Component | Type | Description |
|-----------|------|-------------|
| Smart Contracts | **Core Protocol** | The only required piece |
| SDK & Agents | Reference Implementation | Agent framework with 7 strategies |
| Frontend | Reference Implementation | Example UI |

**Only the smart contracts are the protocol.** Everything else is optional — use our SDK, build your own, or interact directly.

## Applications

Yiling Protocol is a general-purpose truth discovery primitive. Any system that needs decentralized consensus without an oracle can use it:

| Application | What It Replaces |
|-------------|-----------------|
| [Prediction Markets](/docs/use-cases/prediction-markets) | External oracles (UMA, Chainlink) |
| [DAO Governance](/docs/use-cases/governance) | Token-weighted voting |
| [Dispute Resolution](/docs/use-cases/dispute-resolution) | Trusted arbiters, courts |
| [Data Labeling & AI](/docs/use-cases/data-labeling) | Human review pipelines |
| [Subjective Oracles](/docs/use-cases/subjective-oracles) | Oracle committees |

See [Use Cases](/docs/use-cases/prediction-markets) for detailed integration guides.`,

  "getting-started/quickstart": `# Quickstart

Get started with Yiling Protocol in under 5 minutes.

## Option 1: Use an Existing Deployment

The fastest way to start — connect to an already-deployed instance.

\`\`\`bash
# Install the SDK
pip install yiling-sdk
# or
npm install @yiling/sdk
\`\`\`

\`\`\`python
from yiling_sdk import YilingClient

client = YilingClient(
    rpc_url="https://sepolia.base.org",
    contract="0x1234...abcd",  # See Deployments page
    private_key="0xYOUR_KEY"
)

# List active instances
instances = client.get_active_markets()

# Submit a report (72% probability, bond auto-attached)
client.predict(market_id=0, probability=0.72)

# Claim payouts from resolved instances
client.claim_all()
\`\`\`

See [Contract Addresses](/docs/deployments/addresses) for live deployments.

## Option 2: Deploy Your Own Instance

### Prerequisites

- [Foundry](https://getfoundry.sh/) installed
- A funded wallet on your target chain

### Install Contracts

\`\`\`bash
forge install yiling-protocol/contracts
\`\`\`

### Deploy

\`\`\`bash
forge script lib/contracts/script/Deploy.s.sol \\
  --rpc-url $RPC_URL \\
  --broadcast \\
  --private-key $PRIVATE_KEY
\`\`\`

### Create Your First Instance

\`\`\`bash
cast send $CONTRACT \\
  "createMarket(string,uint256,uint256,uint256,uint256,uint256,uint256)" \\
  "Will ETH mass adoption happen by 2028?" \\
  200000000000000000 2 10000000000000000 \\
  100000000000000000 1000000000000000000 500000000000000000 \\
  --value 0.7ether \\
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
\`\`\`

## Option 3: Run an Agent

\`\`\`bash
pip install yiling-sdk

yiling agent run \\
  --contract $CONTRACT \\
  --rpc $RPC_URL \\
  --key $AGENT_KEY \\
  --provider openai --llm-key sk-...
\`\`\`

## Next Steps

- [Use Cases](/docs/use-cases/prediction-markets) — see what you can build
- [Contract Addresses](/docs/deployments/addresses) — find live deployments
- [Build an Agent](/docs/sdk/build-an-agent) — write your own reporting agent
- [Deploy Your Own](/docs/deployments/deploy-your-own) — deploy on any chain`,

  "getting-started/architecture": `# Architecture

Yiling Protocol is designed as a modular infrastructure stack. Only the smart contracts are required — everything else is optional.

## System Overview

\`\`\`
┌─────────────────────────────────────────────────┐
│            YOUR APPLICATION LAYER                │
│  (prediction market, governance, dispute system, │
│   data labeling, oracle, or any truth-dependent) │
└───────────────────┬─────────────────────────────┘
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
   ┌──────────┐ ┌────────┐ ┌──────────┐
   │   SDK    │ │  WS    │ │Direct RPC│
   │(optional)│ │(option)│ │(always)  │
   └────┬─────┘ └───┬────┘ └────┬─────┘
        └────────────┼──────────┘
                     │
        ┌────────────▼────────────┐
        │    YILING CONTRACTS     │
        │  (Truth Discovery Core) │
        └────────────┬────────────┘
                     │
              ┌──────▼──────┐
              │  ANY CHAIN  │
              └─────────────┘
\`\`\`

## Components

### Core Protocol (Required)

| Contract | Purpose |
|----------|---------|
| \`PredictionMarket.sol\` | Instance creation, signal reporting, SKC resolution, payouts |
| \`MarketFactory.sol\` | Factory for deploying isolated protocol instances |
| \`FixedPointMath.sol\` | On-chain ln() and cross-entropy scoring with 1e18 precision |

### SDK & Agent Framework (Optional)

| Package | Language | Description |
|---------|----------|-------------|
| \`yiling-sdk\` | Python | Client, agent runner, strategies |
| \`@yiling/sdk\` | JavaScript | Client, TypeScript types, utilities |

### Integration Patterns

**Pattern 1: Truth Discovery Layer** — Embed Yiling as a resolution primitive in your protocol. Your governance, dispute, or oracle system calls the contracts to resolve questions.

**Pattern 2: SDK Integration** — Use the official SDK for quick integration into apps, bots, or dashboards.

**Pattern 3: Direct Contract** — Use any web3 library (ethers.js, viem, web3.py) to interact with deployed contracts.

**Pattern 4: Full Stack** — Deploy contracts + run agents + serve API for a complete application.

## Design Principles

- **Minimal core** — The contracts contain only the SKC mechanism. No UI, no API, no opinions about your application layer.
- **Composable** — Use Yiling as a building block inside larger systems. A DAO can use it for governance decisions. A marketplace can use it for dispute resolution.
- **Chain-agnostic** — No chain-specific dependencies. Deploy wherever your application lives.
- **Agent-agnostic** — Agents can be humans, LLMs, algorithms, ensembles, or any combination. The mechanism doesn't care — it only cares about the signals they submit.`,

  // ── USE CASES ───────────────────────────────────────────────────────────

  "use-cases/prediction-markets": `# Prediction Markets

Build oracle-free prediction markets where truth emerges from game theory instead of external resolution.

## The Oracle Problem

Traditional prediction markets (Polymarket, Augur, Kalshi) depend on external oracles to determine outcomes. In March 2025, a UMA token holder [manipulated a Polymarket resolution](https://orochi.network/blog/oracle-manipulation-in-polymarket-2025) by controlling 25% of voting power — flipping a market from 9% to 100% despite no real-world event occurring.

For subjective or long-horizon questions — *"Will AI surpass human reasoning by 2030?"* — no reliable oracle even exists.

## How Yiling Solves This

Yiling Protocol implements self-resolving markets: the SKC mechanism uses probabilistic stopping and cross-entropy scoring so that **truth emerges from the participants themselves**, with no oracle needed.

\`\`\`
Create market → Agents submit predictions → Random stop check
→ Last prediction = reference truth → Cross-entropy payouts
\`\`\`

## Integration Example

\`\`\`python
from yiling_sdk import YilingClient

client = YilingClient(rpc_url=RPC, contract=CONTRACT, private_key=KEY)

# Create a prediction market
client.create_market(
    question="Will Bitcoin ETF daily volume exceed $10B by Q4 2026?",
    alpha=0.2,        # 20% stop probability → ~5 predictions avg
    bond=0.1,         # 0.1 ETH per prediction
    liquidity=1.0,    # LMSR scaling
    initial_price=0.5 # Start at 50/50
)
\`\`\`

## Advantages Over Existing Solutions

| Feature | Polymarket/Augur | Yiling Protocol |
|---------|-----------------|-----------------|
| Resolution | External oracle | Self-resolving (SKC) |
| Oracle manipulation | Possible (UMA 2025) | Impossible — no oracle |
| Subjective questions | Limited | Native support |
| Deployment | Centralized | Permissionless, any chain |
| Truthfulness | Not guaranteed | Perfect Bayesian Equilibrium |

## Best For

- Subjective or unverifiable questions
- Long-horizon forecasting (years, decades)
- Markets where oracle manipulation is a risk
- Permissionless, decentralized prediction platforms`,

  "use-cases/governance": `# DAO Governance

Replace token-weighted voting with game-theoretically optimal truth discovery.

## The Problem with Token Voting

Most DAOs use token-weighted voting: 1 token = 1 vote. This creates well-documented problems:

- **Plutocracy** — whales dominate decisions
- **Low participation** — voter apathy (often <5% turnout)
- **No skin in the game** — voting is free, so uninformed voting costs nothing
- **Binary choices** — up/down vote loses nuance

## How Yiling Solves This

Instead of voting on proposals, DAO members **report their honest belief** about whether a proposal will achieve its stated goal. The SKC mechanism ensures honesty is the dominant strategy because:

1. Every reporter posts a bond (skin in the game)
2. Cross-entropy scoring rewards accuracy, not majority position
3. Probabilistic stopping makes manipulation impossible

\`\`\`
Proposal: "Should we allocate 500K to marketing?"
        ↓
Reframed: "Will allocating 500K to marketing increase TVL by >20%?"
        ↓
Agents report probability → SKC resolves → consensus emerges
\`\`\`

## Integration Pattern

\`\`\`solidity
import {PredictionMarket} from "yiling-protocol/src/PredictionMarket.sol";

contract GovernanceModule {
    PredictionMarket public yiling;

    function createProposalResolution(string calldata question) external {
        yiling.createMarket{value: 0.7 ether}(
            question,
            0.2e18,   // alpha
            2,        // k
            0.01e18,  // flat reward
            0.1e18,   // bond
            1e18,     // liquidity
            0.5e18    // initial price
        );
    }

    // After resolution, read the final consensus
    function getConsensus(uint256 id) external view returns (uint256) {
        (,,uint256 finalPrice,,,) = yiling.getMarketInfo(id);
        return finalPrice; // WAD-format probability
    }
}
\`\`\`

## Advantages Over Token Voting

| Feature | Token Voting | Yiling Governance |
|---------|-------------|-------------------|
| Sybil resistance | Requires token | Bond-based |
| Informed decisions | No incentive | Accuracy rewarded |
| Manipulation | Whale dominance | Game-theoretically secure |
| Nuance | Binary yes/no | Continuous probability |
| Participation | Free (apathy) | Bonded (skin in game) |

## Best For

- Subjective governance decisions ("Is this grant worth funding?")
- Parameter tuning ("Should we change the fee to 3%?")
- Treasury allocation decisions
- Protocol upgrade assessments`,

  "use-cases/dispute-resolution": `# Dispute Resolution

Resolve disputes without trusted arbiters, courts, or centralized panels.

## The Problem

Decentralized systems — marketplaces, insurance, escrow — need dispute resolution but face a dilemma: any human arbiter introduces centralization, bias, and cost. Existing solutions (Kleros, Aragon Court) use token-staked juries, which still suffer from whale manipulation and low-quality judgments.

## How Yiling Solves This

Frame any dispute as a question and let the SKC mechanism resolve it. Reporters bond tokens to submit their assessment. The mechanism's game-theoretic properties ensure honest reporting without needing a trusted judge.

\`\`\`
Dispute: "Did the contractor deliver the work as specified?"
        ↓
Instance created → Assessors submit probability reports
        ↓
SKC resolves → Consensus probability = resolution
        ↓
If probability > threshold → resolved in favor of contractor
\`\`\`

## Integration Example

\`\`\`python
# E-commerce / freelance marketplace dispute
client.create_market(
    question="Did seller deliver item matching the listing description?",
    alpha=0.3,        # Quick resolution (~3 reports)
    bond=0.05,        # Low bond for accessibility
    liquidity=0.5,
    initial_price=0.5
)

# After resolution
info = client.get_market_info(dispute_id)
if info.final_price > 0.5e18:
    release_escrow_to_seller()
else:
    refund_buyer()
\`\`\`

## Use Cases

- **Marketplace disputes** — buyer/seller disagreements
- **Insurance claims** — "Did the insured event occur?"
- **Bounty verification** — "Was the bounty completed satisfactorily?"
- **Content takedown appeals** — "Does this content violate policy?"
- **Smart contract escrow** — automated release based on consensus

## Advantages

| Feature | Traditional Arbitration | Yiling Resolution |
|---------|----------------------|-------------------|
| Speed | Days to weeks | Minutes to hours |
| Cost | Expensive | Bond-based (recovered if honest) |
| Bias | Arbiter-dependent | Game-theoretically neutral |
| Scalability | Limited by humans | Unlimited on-chain |
| Transparency | Opaque | Fully on-chain |`,

  "use-cases/data-labeling": `# Data Labeling & AI

Incentivize truthful data labeling for AI training without centralized review pipelines.

## The Problem

AI training requires massive labeled datasets. Current approaches:

- **Human review** — expensive ($0.10–$2.00 per label), inconsistent, slow
- **Crowdsourcing** — quality varies wildly, gaming incentives
- **Expert panels** — doesn't scale, bottleneck
- **LLM self-labeling** — circular, amplifies biases

The core issue: **how do you verify label quality without a ground truth oracle?** This is exactly the problem the SKC mechanism was designed to solve.

## How Yiling Solves This

Each labeling task becomes an instance. Labelers post bonds and submit their assessments. The SKC mechanism's cross-entropy scoring naturally rewards accurate labelers and penalizes inaccurate ones — without ever needing a "gold standard" ground truth.

\`\`\`
Task: "Is this image NSFW?" / "Is this text toxic?" / "Is claim X supported by evidence Y?"
        ↓
Labelers submit probability assessments with bonds
        ↓
SKC resolves → consensus label + quality scores per labeler
        ↓
Use scores to weight labels and build reputation
\`\`\`

## Integration Example

\`\`\`python
# Create labeling tasks in batch
for item in unlabeled_dataset:
    client.create_market(
        question=f"Is this content toxic? Content: {item.text[:200]}",
        alpha=0.33,       # Quick resolution (~3 labels)
        bond=0.001,       # Micro-bond for high throughput
        liquidity=0.01,
        initial_price=0.5
    )

# After resolution, collect labels
for task_id in range(task_count):
    info = client.get_market_info(task_id)
    label = 1 if info.final_price > 0.5e18 else 0
    confidence = abs(info.final_price - 0.5e18) / 0.5e18
    dataset.add_label(task_id, label, confidence)
\`\`\`

## Why This Works

The SKC mechanism is a form of **information elicitation without verification** — a well-studied problem in mechanism design. The key insight from the [Harvard research](https://arxiv.org/abs/2306.04305):

> *"A reference agent with access to more information can serve as a reasonable proxy for the ground truth."*

Each subsequent labeler sees previous labels and adds their own signal. The final labeler's assessment — informed by all predecessors — becomes the reference truth. This creates the same incentive structure as if there were a ground truth oracle, but without one.

## Applications

- **Content moderation** — toxic, NSFW, misinformation detection
- **RLHF data** — preference labels for AI alignment
- **Medical imaging** — diagnostic label consensus
- **Fact-checking** — claim verification
- **Sentiment analysis** — subjective classification at scale`,

  "use-cases/subjective-oracles": `# Subjective Oracles

Provide on-chain oracle services for questions that have no objective, verifiable answer.

## The Problem

Existing oracles (Chainlink, Pyth, UMA) work well for objective data: prices, sports scores, weather. But a large class of on-chain decisions depend on **subjective** information:

- *"Is this NFT derivative art or a copy?"*
- *"Did this protocol deliver on its roadmap?"*
- *"Is this community proposal beneficial?"*
- *"Has this real-world event meaningfully occurred?"* (e.g., "AI surpassing human reasoning")

No price feed or API can answer these questions. Traditional optimistic oracles (UMA) use token-staked voting, which is vulnerable to whale manipulation — as demonstrated in the March 2025 Polymarket incident.

## How Yiling Solves This

Yiling Protocol acts as a **subjective oracle primitive**. Any smart contract can request a resolution by creating an instance, and the SKC mechanism produces a consensus probability that other contracts can consume.

\`\`\`solidity
import {PredictionMarket} from "yiling-protocol/src/PredictionMarket.sol";

contract SubjectiveOracle {
    PredictionMarket public yiling;

    // Any contract can request a subjective resolution
    function requestResolution(
        string calldata question
    ) external payable returns (uint256 instanceId) {
        return yiling.createMarket{value: msg.value}(
            question,
            0.2e18, 2, 0.01e18, 0.1e18, 1e18, 0.5e18
        );
    }

    // Consumer contracts read the result
    function getResolution(uint256 id) external view returns (uint256 probability) {
        (,,probability,,,) = yiling.getMarketInfo(id);
    }
}
\`\`\`

## Architecture: Yiling as Oracle Layer

\`\`\`
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Insurance DApp  │  │  Governance DAO   │  │  NFT Marketplace │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │
         └─────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   YILING PROTOCOL   │
                    │  (Subjective Oracle)│
                    └──────────┬──────────┘
                               │
                         ┌─────▼─────┐
                         │   Chain   │
                         └───────────┘
\`\`\`

## Comparison

| Feature | Chainlink | UMA | Yiling |
|---------|-----------|-----|--------|
| Objective data | Yes | Yes | No (use Chainlink) |
| Subjective data | No | Limited | Yes (native) |
| Oracle manipulation | N/A | Possible (2025) | Impossible |
| Resolution method | Data feeds | Token voting | SKC mechanism |
| Truthfulness guarantee | Data quality | Economic | Mathematical (PBE) |

## Best For

- **Subjective on-chain decisions** that no data feed can answer
- **Complementing existing oracles** — use Chainlink for prices, Yiling for everything else
- **Cross-protocol resolution** — multiple dApps can share a single Yiling deployment as their subjective oracle`,

  // ── SMART CONTRACTS ────────────────────────────────────────────────────

  "contracts/installation": `# Installation

Install Yiling Protocol contracts as a dependency in your Foundry project.

## Using Foundry (Recommended)

\`\`\`bash
forge install yiling-protocol/contracts
\`\`\`

This adds the contracts to your \`lib/\` directory. Import them in your Solidity code:

\`\`\`solidity
import {PredictionMarket} from "yiling-protocol/src/PredictionMarket.sol";
import {MarketFactory} from "yiling-protocol/src/MarketFactory.sol";
import {FixedPointMath} from "yiling-protocol/src/libraries/FixedPointMath.sol";
\`\`\`

Update your \`remappings.txt\`:

\`\`\`
yiling-protocol/=lib/contracts/
\`\`\`

## Using npm

\`\`\`bash
npm install @yiling/contracts
\`\`\`

## Build & Test

\`\`\`bash
cd lib/contracts
forge build
forge test
\`\`\`

## Contract Overview

| Contract | Description |
|----------|-------------|
| \`PredictionMarket.sol\` | Core SKC market logic — create markets, predict, resolve, claim |
| \`MarketFactory.sol\` | Factory for deploying isolated PredictionMarket instances |
| \`FixedPointMath.sol\` | Library for on-chain ln() and cross-entropy scoring |

## Requirements

- Solidity ^0.8.24
- Foundry (forge, cast, anvil)

## Gas Estimates

| Function | Gas |
|----------|-----|
| \`createMarket()\` | ~250,000 |
| \`predict()\` | ~150,000–500,000 |
| \`claimPayout()\` | ~80,000 |`,

  "contracts/prediction-market": `# PredictionMarket.sol

Core contract implementing the SKC mechanism.

## Constants

| Name | Value | Description |
|------|-------|-------------|
| WAD | 1e18 | Fixed-point precision |
| MIN_PROBABILITY | 0.01e18 | Minimum prediction (1%) |
| MAX_PROBABILITY | 0.99e18 | Maximum prediction (99%) |
| MAX_FEE_BPS | 1000 | Maximum protocol fee (10%) |

## Write Functions

### \`createMarket\`

\`\`\`solidity
function createMarket(
    string calldata question,
    uint256 alpha,          // Stop probability (WAD)
    uint256 k,              // Last k agents get flat reward
    uint256 flatReward,     // Flat reward R (wei)
    uint256 bondAmount,     // Bond per prediction (wei)
    uint256 liquidityParam, // LMSR scaling b (wei)
    uint256 initialPrice    // Starting price (WAD)
) external payable returns (uint256 marketId)
\`\`\`

Creates a new prediction market. Must send sufficient ETH to fund the market pool (see [Parameters](/docs/reference/parameters) for minimum funding formula).

### \`predict\`

\`\`\`solidity
function predict(uint256 marketId, uint256 probability) external payable
\`\`\`

Submit a prediction with bond attached. Triggers random stop check after each call. One prediction per wallet per market.

### \`claimPayout\`

\`\`\`solidity
function claimPayout(uint256 marketId) external
\`\`\`

Claim your payout from a resolved market. Payout = bond ± scoring reward/penalty.

### \`forceResolve\`

\`\`\`solidity
function forceResolve(uint256 marketId) external
\`\`\`

Force-resolve a stale market. Owner can call anytime, anyone can call after 2 days of inactivity.

## Read Functions

| Function | Returns | Description |
|----------|---------|-------------|
| \`getMarketCount()\` | uint256 | Total markets created |
| \`getMarketInfo(id)\` | tuple | Core market data (question, price, status) |
| \`getMarketParams(id)\` | tuple | Market configuration (alpha, k, bond, etc.) |
| \`getPrediction(id, idx)\` | tuple | Specific prediction details |
| \`getPayoutAmount(id, addr)\` | uint256 | Net payout amount (post-fee) |
| \`isMarketActive(id)\` | bool | Whether market is accepting predictions |
| \`hasPredicted(id, addr)\` | bool | Whether address has already predicted |

## Events

\`\`\`solidity
event MarketCreated(uint256 indexed marketId, string question, ...)
event PredictionMade(uint256 indexed marketId, address indexed predictor, ...)
event MarketResolved(uint256 indexed marketId, uint256 finalPrice, ...)
event PayoutClaimed(uint256 indexed marketId, address indexed predictor, ...)
\`\`\``,

  "contracts/market-factory": `# MarketFactory.sol

Convenience wrapper for deploying new PredictionMarket instances.

## Usage

\`\`\`solidity
import {MarketFactory} from "yiling-protocol/src/MarketFactory.sol";

MarketFactory factory = new MarketFactory();
address newMarket = factory.createMarket(treasuryAddress, 200);
\`\`\`

Each instance is fully independent — its own markets, treasury, and fee config.

## When to Use

| Pattern | When |
|---------|------|
| **Single instance** | Deploy PredictionMarket.sol directly. All markets share one contract. Simpler to manage. |
| **Factory pattern** | Use MarketFactory when you need isolated instances per user, project, or tenant. |

## Integration Example

\`\`\`solidity
// Deploy factory once
MarketFactory factory = new MarketFactory();

// Each project gets its own isolated instance
address projectA = factory.createMarket(treasuryA, 200);
address projectB = factory.createMarket(treasuryB, 100);
\`\`\``,

  "contracts/fixed-point-math": `# FixedPointMath.sol

On-chain fixed-point math library for cross-entropy scoring.

## Installation

\`\`\`solidity
import {FixedPointMath} from "yiling-protocol/src/libraries/FixedPointMath.sol";
\`\`\`

## Functions

### \`lnWad(uint256 x) → int256\`

Computes ln(x) in WAD format. Reverts if x == 0.

### \`crossEntropyScore(uint256 q, uint256 p) → int256\`

\`S(q, p) = q × ln(p) + (1-q) × ln(1-p)\`

### \`deltaPayout(uint256 qFinal, uint256 pBefore, uint256 pAfter) → int256\`

Delta score for payouts. Positive = moved toward truth. Used internally by PredictionMarket to calculate agent payouts.

## WAD Format

All values use 1e18 fixed-point representation:

\`\`\`
1.0   = 1000000000000000000  (1e18)
0.5   = 500000000000000000   (5e17)
0.01  = 10000000000000000    (1e16)
\`\`\`

## Standalone Usage

You can use FixedPointMath independently in your own contracts for on-chain logarithmic calculations:

\`\`\`solidity
int256 result = FixedPointMath.lnWad(500000000000000000); // ln(0.5)
\`\`\``,

  // ── SDK & AGENTS ───────────────────────────────────────────────────────

  "sdk/installation": `# SDK Installation

Install the Yiling SDK to interact with deployed contracts, run agents, and build integrations.

## Python

\`\`\`bash
pip install yiling-sdk
\`\`\`

\`\`\`python
from yiling_sdk import YilingClient

client = YilingClient(
    rpc_url="https://sepolia.base.org",
    contract="0x1234...abcd",
    private_key="0xYOUR_KEY"
)

# Read markets
markets = client.get_active_markets()
info = client.get_market_info(0)

# Predict
client.predict(market_id=0, probability=0.72)

# Claim
client.claim_all()
\`\`\`

## JavaScript / TypeScript

\`\`\`bash
npm install @yiling/sdk
\`\`\`

\`\`\`typescript
import { YilingClient } from "@yiling/sdk";

const client = new YilingClient({
  rpcUrl: "https://sepolia.base.org",
  contract: "0x1234...abcd",
  privateKey: "0xYOUR_KEY",
});

const markets = await client.getActiveMarkets();
await client.predict(0, 0.72);
await client.claimAll();
\`\`\`

## CLI

The SDK includes a CLI for quick operations:

\`\`\`bash
# List markets
yiling markets list --rpc $RPC --contract $CONTRACT

# Submit prediction
yiling predict --market 0 --probability 0.72 --key $KEY

# Run agent
yiling agent run --provider openai --llm-key sk-... --key $KEY

# Claim all payouts
yiling claim --key $KEY
\`\`\`

## Configuration

Create a \`.yiling.json\` in your project root to avoid passing flags:

\`\`\`json
{
  "rpcUrl": "https://sepolia.base.org",
  "contract": "0x1234...abcd"
}
\`\`\`

## ABI Access

The SDK exports the contract ABI for direct use:

\`\`\`python
from yiling_sdk import PREDICTION_MARKET_ABI
\`\`\`

\`\`\`typescript
import { PREDICTION_MARKET_ABI } from "@yiling/sdk";
\`\`\``,

  "sdk/build-an-agent": `# Build an Agent

Write your own AI prediction agent using the SDK or directly with any web3 library.

## Using the SDK (Recommended)

\`\`\`python
from yiling_sdk import YilingAgent

class MyAgent(YilingAgent):
    def predict(self, market):
        # Your logic here — LLM, algorithm, ensemble, anything
        # market.question, market.current_price, market.history available
        return 0.72  # Return a probability between 0.01 and 0.99

agent = MyAgent(
    rpc_url="https://sepolia.base.org",
    contract="0x1234...abcd",
    private_key="0xYOUR_KEY"
)
agent.run(interval=30)  # Poll every 30s
\`\`\`

## Using ethers.js Directly

\`\`\`javascript
import { ethers } from "ethers";
import { PREDICTION_MARKET_ABI } from "@yiling/sdk";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT, PREDICTION_MARKET_ABI, wallet);

const count = await contract.getMarketCount();
for (let id = 0; id < count; id++) {
  if (!(await contract.isMarketActive(id))) continue;
  const info = await contract.getMarketInfo(id);

  const probability = await yourStrategy(info);
  const probWad = ethers.parseEther(probability.toFixed(18));
  await contract.predict(id, probWad, { value: bondAmount });
}
\`\`\`

## Using web3.py Directly

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider(RPC_URL))
contract = w3.eth.contract(address=CONTRACT, abi=abi)

count = contract.functions.getMarketCount().call()
for mid in range(count):
    if not contract.functions.isMarketActive(mid).call():
        continue
    info = contract.functions.getMarketInfo(mid).call()

    probability = your_strategy(info)
    prob_wad = int(probability * 1e18)
    tx = contract.functions.predict(mid, prob_wad).build_transaction({
        "from": account.address,
        "value": bond_amount,
    })
\`\`\`

## Agent Lifecycle

\`\`\`
Initialize → Connect to chain → Poll for active markets
→ Check eligibility (not already predicted)
→ Read market data + prediction history
→ Generate prediction (your strategy)
→ Submit on-chain with bond
→ Claim payouts from resolved markets
→ Repeat
\`\`\`

## Tips

- One prediction per market per wallet
- Use prediction history to inform your strategy — the SDK provides \`market.history\`
- Contrarian strategies can be highly profitable
- The optimal strategy is always **honest reporting** — this is mathematically proven
- Always claim payouts after resolution`,

  "sdk/agent-strategies": `# Agent Strategies

The SDK includes 7 built-in agent personas with distinct reasoning approaches.

## Built-in Strategies

| Strategy | Approach |
|----------|----------|
| **Analyst** | Data-driven, reference class forecasting |
| **Bayesian** | Explicit prior → likelihood → posterior |
| **Economist** | Macro forces, incentives, structural trends |
| **Statistician** | Base rates, confidence intervals |
| **CrowdSynth** | Meta-cognitive aggregation of previous predictions |
| **Contrarian** | Challenges consensus, detects groupthink |
| **Historian** | Historical analogies, precedent matching |

## Using Built-in Strategies

\`\`\`python
from yiling_sdk import YilingAgent
from yiling_sdk.strategies import BayesianStrategy

agent = YilingAgent(
    rpc_url=RPC_URL,
    contract=CONTRACT,
    private_key=KEY,
    strategy=BayesianStrategy(provider="openai", api_key="sk-...")
)
agent.run()
\`\`\`

## Custom Strategies

You're not limited to LLMs. Any function that returns a probability works:

\`\`\`python
from yiling_sdk import YilingAgent

class AlgoAgent(YilingAgent):
    def predict(self, market):
        # Algorithm-based
        avg = sum(p.probability for p in market.history) / len(market.history)
        return 0.5 + (avg - market.current_price) * 0.3

class EnsembleAgent(YilingAgent):
    def predict(self, market):
        # Multi-model ensemble
        results = [ask_gpt4(market), ask_claude(market), ask_gemini(market)]
        return sum(results) / len(results)
\`\`\`

## Scoring Implications

The SKC mechanism rewards:
- **Bold early moves** toward truth — larger price shifts earn more
- **Contrarian accuracy** — going against wrong consensus is highly rewarded

It penalizes:
- **Moving price away from truth** — inaccurate predictions lose bond
- **Herding without accuracy** — following the crowd when it's wrong

The optimal strategy is always **honest reporting** — this is a Perfect Bayesian Equilibrium.`,

  // ── CHAINS ──────────────────────────────────────────────────────────────

  ...generateChainPages(),

  // ── DEPLOYMENTS ────────────────────────────────────────────────────────

  "deployments/addresses": `# Contract Addresses

Official Yiling Protocol deployments. Use these addresses to interact with existing markets or connect agents.

## Testnets

| Network | Contract | Explorer |
|---------|----------|----------|
| Base Sepolia | \`0x1234...abcd\` | [View](https://sepolia.basescan.org) |
| Arbitrum Sepolia | \`0x5678...efgh\` | [View](https://sepolia.arbiscan.io) |
| Optimism Sepolia | \`0x9abc...ijkl\` | [View](https://sepolia-optimistic.etherscan.io) |

## Mainnets

| Network | Contract | Explorer |
|---------|----------|----------|
| *Coming soon* | — | — |

> Mainnet deployments will be announced after testnet validation is complete.

## Connecting to a Deployment

### Using the SDK

\`\`\`python
from yiling_sdk import YilingClient

client = YilingClient(
    rpc_url="https://sepolia.base.org",
    contract="0x1234...abcd",
    private_key="0xYOUR_KEY"
)
\`\`\`

### Using ethers.js

\`\`\`javascript
import { ethers } from "ethers";
import { PREDICTION_MARKET_ABI } from "@yiling/sdk";

const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const contract = new ethers.Contract("0x1234...abcd", PREDICTION_MARKET_ABI, provider);
\`\`\`

### Using Foundry

\`\`\`bash
export CONTRACT=0x1234...abcd
export RPC=https://sepolia.base.org

cast call $CONTRACT "getMarketCount()" --rpc-url $RPC
\`\`\`

## Verifying Contracts

All deployments are verified on their respective block explorers. You can also verify locally:

\`\`\`bash
forge verify-contract $CONTRACT PredictionMarket \\
  --chain-id 84532 --etherscan-api-key $KEY
\`\`\``,

  "deployments/deploy-your-own": `# Deploy Your Own

Deploy Yiling Protocol on any EVM-compatible chain.

## Prerequisites

- [Foundry](https://getfoundry.sh/) installed
- A funded deployer wallet
- RPC URL for your target chain

## Step 1: Install Contracts

\`\`\`bash
mkdir my-deployment && cd my-deployment
forge init
forge install yiling-protocol/contracts
\`\`\`

## Step 2: Create Deploy Script

\`\`\`solidity
// script/Deploy.s.sol
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PredictionMarket} from "yiling-protocol/src/PredictionMarket.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        PredictionMarket market = new PredictionMarket(
            msg.sender,   // treasury address
            200            // 2% protocol fee (basis points)
        );
        vm.stopBroadcast();
    }
}
\`\`\`

## Step 3: Deploy

\`\`\`bash
forge script script/Deploy.s.sol \\
  --rpc-url $RPC_URL \\
  --broadcast \\
  --private-key $PRIVATE_KEY \\
  --verify
\`\`\`

## Step 4: Verify

\`\`\`bash
forge verify-contract $DEPLOYED_ADDRESS PredictionMarket \\
  --chain-id $CHAIN_ID \\
  --etherscan-api-key $ETHERSCAN_KEY
\`\`\`

## Post-Deployment Configuration

\`\`\`bash
# Update treasury
cast send $CONTRACT "setTreasury(address)" $NEW_TREASURY \\
  --private-key $KEY --rpc-url $RPC

# Update protocol fee
cast send $CONTRACT "setProtocolFee(uint256)" 300 \\
  --private-key $KEY --rpc-url $RPC

# Transfer ownership
cast send $CONTRACT "transferOwnership(address)" $NEW_OWNER \\
  --private-key $KEY --rpc-url $RPC
\`\`\`

## Multi-Chain Deployment

Each deployment is fully isolated — its own markets, agents, and treasury:

\`\`\`
Base:      0xAAA... → own markets, agents, treasury
Arbitrum:  0xBBB... → own markets, agents, treasury
Polygon:   0xCCC... → own markets, agents, treasury
\`\`\`

No cross-chain dependencies.

## Non-EVM Chains

For Solana, Sui, Aptos, and other non-EVM chains, the contracts need to be ported to the target language. The core logic (SKC mechanism, cross-entropy scoring, random stop) is math-based and fully portable.

Porting checklist:
1. Implement FixedPointMath (ln with fixed-point arithmetic)
2. Implement market state machine
3. Implement cross-entropy scoring formula
4. Implement random stop with block randomness`,

  // ── INTEGRATION ────────────────────────────────────────────────────────

  "integration/direct-contract": `# Direct Contract Interaction

No SDK or middleware needed. Use any web3 library or CLI tool to interact with Yiling Protocol contracts directly.

## Foundry (cast)

\`\`\`bash
# Read market count
cast call $CONTRACT "getMarketCount()" --rpc-url $RPC

# Get market info
cast call $CONTRACT "getMarketInfo(uint256)" 0 --rpc-url $RPC

# Create a market
cast send $CONTRACT \\
  "createMarket(string,uint256,uint256,uint256,uint256,uint256,uint256)" \\
  "Will ETH reach 10K?" \\
  200000000000000000 2 10000000000000000 \\
  100000000000000000 1000000000000000000 500000000000000000 \\
  --value 0.7ether --private-key $KEY --rpc-url $RPC

# Submit prediction (72%)
cast send $CONTRACT "predict(uint256,uint256)" 0 720000000000000000 \\
  --value 0.1ether --private-key $KEY --rpc-url $RPC

# Claim payout
cast send $CONTRACT "claimPayout(uint256)" 0 --private-key $KEY --rpc-url $RPC
\`\`\`

## ethers.js / viem

\`\`\`javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

// Read
const count = await contract.getMarketCount();
const info = await contract.getMarketInfo(0);
const isActive = await contract.isMarketActive(0);

// Write
await contract.predict(0, ethers.parseEther("0.72"), {
  value: ethers.parseEther("0.1")
});
await contract.claimPayout(0);
\`\`\`

## Event Listening

Subscribe to on-chain events for real-time updates:

\`\`\`javascript
contract.on("MarketCreated", (id, question) => {
  console.log("New market:", id, question);
});

contract.on("PredictionMade", (id, predictor, probability) => {
  console.log("Prediction:", id, predictor, Number(probability) / 1e18);
});

contract.on("MarketResolved", (id, finalPrice) => {
  console.log("Resolved:", id, Number(finalPrice) / 1e18);
});
\`\`\`

## ABI

Get the contract ABI from the SDK or compile from source:

\`\`\`bash
# From SDK
npx @yiling/sdk abi

# From source
forge inspect PredictionMarket abi
\`\`\``,

  "integration/api-reference": `# API & WebSocket Reference

Optional REST API and WebSocket server for convenience. You can always use [direct contract calls](/docs/integration/direct-contract) instead.

## Installation

\`\`\`bash
pip install yiling-sdk

yiling serve --contract $CONTRACT --rpc $RPC --port 8000
\`\`\`

## REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/markets\` | List all markets |
| GET | \`/api/markets/{id}\` | Market details |
| GET | \`/api/markets/{id}/predictions\` | Prediction history |
| GET | \`/api/leaderboard\` | Agent rankings |
| GET | \`/api/abi\` | Contract ABI |
| GET | \`/api/health\` | Health check |
| POST | \`/api/agents/register\` | Register webhook agent |

## WebSocket Events

Connect to \`ws://localhost:8000/ws\` for real-time updates:

| Event | Payload | Description |
|-------|---------|-------------|
| \`market_created\` | Market object | New market created |
| \`prediction_submitted\` | Prediction object | New prediction submitted |
| \`dice_roll\` | Roll result | Random stop check result |
| \`market_resolved\` | Resolution data | Market resolved with final price |

## Example

\`\`\`javascript
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.event === "market_resolved") {
    console.log("Resolved:", data.payload.market_id, data.payload.final_price);
  }
};
\`\`\``,

  // ── REFERENCE ──────────────────────────────────────────────────────────

  "reference/skc-mechanism": `# SKC Mechanism

The SKC (Srinivasan-Karger-Chen) mechanism, from [peer-reviewed Harvard research](https://arxiv.org/abs/2306.04305) published at ACM EC 2025.

## Core Innovation

The SKC mechanism solves the fundamental problem of **information elicitation without verification** — how to discover truth when ground truth cannot be directly observed. It does this by using a carefully chosen **reference agent** as a proxy for ground truth, with mathematical guarantees that honest reporting is optimal.

## How It Works

1. **Instance created** with question + parameters
2. **Agents report sequentially** — each posts a bond, observes all previous reports
3. **Random stop** — after each report: \`hash % WAD < α?\`
4. **Resolution** — last report becomes reference truth (qFinal)
5. **Scoring** — cross-entropy delta determines payouts

## Why It Works: The Key Insight

Every agent could be the last one. The last agent has observed **all previous reports** plus their own private information, making them the most informed participant. Their report naturally aggregates all distributed information in the system.

**Theorem (Srinivasan, Karger, Chen):** When the reference agent observes k independent informational substitutes, the strategic advantage of deviating from truthful reporting diminishes exponentially: |Δ| ≤ (1-δ)^k. This means that with sufficient information aggregation, manipulation is negligible.

This constitutes a **Perfect Bayesian Equilibrium** — no agent benefits from lying, regardless of what other agents do.

## Information Aggregation

Under the mechanism's sequential structure, full information aggregation occurs naturally:

1. Agent 1 reports based on private signal
2. Agent 2 observes Agent 1's report + their own signal → can infer Agent 1's signal
3. Agent N observes all N-1 previous reports → has access to all distributed information

This is equivalent to the Aumannian protocol for reaching consensus, achieved in a single round.

## Payout Types

**Scored agents** (first n-k):
\`\`\`
payout = max(0, bond + b × [S(qFinal, priceAfter) - S(qFinal, priceBefore)])
\`\`\`

**Last k agents:**
\`\`\`
payout = bond + R
\`\`\`

The last k agents always profit, which incentivizes late participation even when consensus is mature.

## Handling Strategic Behavior

The mechanism addresses three potential manipulation vectors:

1. **Misleading the reference agent** — Agents might report extremes to nudge the final agent. Solved by the reference agent having k independent informational substitutes that "wash out" any single agent's influence.

2. **Hedging toward the prior** — If an agent's report won't be observed by the reference, they might hedge. Solved by market termination structure ensuring most agents are observed.

3. **Uninformative equilibria** — All agents reporting identically. Solved by flat rewards only for final k agents; earlier agents must differentiate to earn scoring rewards.

## Pro-Rata Scaling

If total payouts exceed the pool, a scaling factor ensures solvency:
\`\`\`
scaleFactor = totalPool / totalAllocated
actualPayout = rawPayout × scaleFactor
\`\`\`

The protocol always remains solvent — no under-collateralization is possible.

## Comparison to Related Approaches

| Framework | Needs Ground Truth | Elicits Beliefs | Aggregates Info | Single Task |
|-----------|-------------------|-----------------|-----------------|-------------|
| Traditional Markets | Yes (oracle) | Yes | Yes | Yes |
| Peer Prediction | No | Yes | No | Yes |
| Output Agreement | No | No | Yes | No |
| **SKC (Yiling)** | **No** | **Yes** | **Yes** | **Yes** |`,

  "reference/scoring": `# Cross-Entropy Scoring

## The Formula

\`\`\`
S(q, p) = q × ln(p) + (1-q) × ln(1-p)
\`\`\`

- q = final market price (reference truth)
- p = predicted probability

## Delta Payout

Each agent's payout is based on how much they moved the price toward truth:

\`\`\`
Δ = S(qFinal, priceAfter) - S(qFinal, priceBefore)
payout = max(0, bond + b × Δ)
\`\`\`

## Example: Accurate Prediction

\`\`\`
qFinal = 0.80, priceBefore = 0.50, priceAfter = 0.75

S(0.80, 0.75) = -0.507
S(0.80, 0.50) = -0.693
Δ = +0.186

bond=0.1, b=1: payout = 0.1 + 0.186 = 0.286 (+186% profit)
\`\`\`

## Example: Inaccurate Prediction

\`\`\`
qFinal = 0.80, priceBefore = 0.70, priceAfter = 0.40

Δ = -0.309
payout = max(0, 0.1 - 0.309) = 0 (bond lost)
\`\`\`

## Key Properties

- **Incentive compatible** — honesty maximizes expected payoff
- **Bold correct moves** earn more than small adjustments
- **Max loss** = bond amount (never more)
- All computed on-chain in FixedPointMath.sol`,

  "reference/parameters": `# Parameters

## Market Parameters

Set when creating a market via \`createMarket()\`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Alpha (α) | 20% | Stop probability per prediction |
| K | 2 | Last k agents get flat reward |
| Flat Reward (R) | 0.01 ETH | Reward per last-k agent |
| Bond | 0.1 ETH | Deposit per prediction |
| Liquidity (b) | 1.0 ETH | LMSR scaling parameter |
| Initial Price | 0.5 | Starting market price |

## Alpha Tuning

| Alpha | Avg Predictions | Use Case |
|-------|----------------|----------|
| 10% | ~10 | Deep analysis, many agents |
| 20% | ~5 | Balanced (default) |
| 33% | ~3 | Quick resolution |
| 50% | ~2 | Very fast, binary |

Formula: expected predictions = 1/α

## Minimum Funding

\`\`\`
minFunding = flatReward × k + (liquidity × ln(2))
\`\`\`

Default: ~0.71 ETH

## Recommended Configurations

| Profile | Alpha | K | Bond | Liquidity | Funding |
|---------|-------|---|------|-----------|---------|
| Testing | 30% | 1 | 0.01 | 0.1 | ~0.07 ETH |
| Standard | 20% | 2 | 0.1 | 1.0 | ~0.71 ETH |
| High Stakes | 10% | 3 | 1.0 | 10.0 | ~7.1 ETH |

## Protocol Parameters

Set at deployment, configurable by owner:

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Protocol Fee | 200 bps (2%) | 0-1000 bps | Fee on payouts |
| Treasury | Deployer | Any address | Where fees go |

## WAD Format

All on-chain values use 1e18 fixed-point:
\`\`\`
1.0  = 1000000000000000000
0.5  = 500000000000000000
0.2  = 200000000000000000
0.1  = 100000000000000000
0.01 = 10000000000000000
\`\`\``,

  "reference/research": `# Academic Research

Yiling Protocol is built on peer-reviewed academic research. This page documents the theoretical foundations.

## Primary Paper

**Self-Resolving Prediction Markets for Unverifiable Outcomes**
*Siddarth Srinivasan, Ezra Karger, Yiling Chen*
Harvard University — Published at ACM Conference on Economics and Computation (EC 2025)

- [arXiv (v2, Feb 2025)](https://arxiv.org/abs/2306.04305)
- [ACM Digital Library](https://dl.acm.org/doi/pdf/10.1145/3736252.3742593)

### Abstract

The paper addresses prediction markets for outcomes that cannot be directly verified. It proposes a mechanism that pays agents the **negative cross-entropy** between their prediction and that of a carefully chosen reference agent. Markets terminate probabilistically, and the final agent — who observes all prior forecasts — serves as a proxy for ground truth.

### Key Results

**Theorem 1 (Exponential Decay):** When the reference agent observes k independent informational substitutes, the strategic adjustment term diminishes exponentially: |Δ| ≤ (1-δ)^k, where δ measures signal informativeness.

**Theorem 2 (Strict Truthfulness):** If k exceeds a threshold depending on prior beliefs, signal granularity (τ), and information quality parameters (δ, η), then truthful reporting strictly dominates any deviation.

**Theorem 3 (ε-PBE):** Without knowledge of τ, the mechanism achieves ε-Perfect Bayesian Equilibrium where the maximum gain from deviation is bounded by 𝒟_η(Δ, **y**), decreasing exponentially in k.

### Core Assumptions

1. **Common Knowledge of Rationality** — agents are risk-neutral Bayesian reasoners
2. **Common Prior** — shared prior distribution over outcomes and signals
3. **Stochastic Relevance** — each distinct signal induces a unique posterior
4. **Conditional Independence** — agents' signals are independent given the outcome
5. **(δ,η)-Informativeness** — uniform bounds on signal quality

## Related Work

### Information Elicitation Without Verification

The SKC mechanism belongs to the broader field of **IEWV (Information Elicitation Without Verification)**. Related approaches include:

| Mechanism | Key Idea | Limitation |
|-----------|----------|------------|
| Peer Prediction (Miller et al. 2005) | Score based on peer agreement | No information aggregation |
| Bayesian Truth Serum (Prelec 2004) | Reward surprisingly common answers | Requires many tasks |
| Output Agreement (von Ahn 2006) | Reward matching outputs | Doesn't elicit beliefs |
| **SKC (this work)** | Cross-entropy against reference agent | Requires conditional independence |

### Market Scoring Rules

The mechanism uses the **Logarithmic Market Scoring Rule (LMSR)** from Hanson (2003), implemented as a cost function:

\`\`\`
C(q) = b × ln(Σ exp(q_i / b))
\`\`\`

This is equivalent to the cross-entropy market scoring rule used for payouts.

## Open Research Questions

From the paper's discussion and the broader literature:

- **Relaxing conditional independence** — can the mechanism work with correlated signals?
- **Continuous outcomes** — extending beyond binary to multi-dimensional predictions
- **Coalition resistance** — formal analysis of colluding agents
- **Empirical validation** — behavioral studies of the mechanism with human subjects
- **Optimal α selection** — adaptive stopping probability based on information flow
- **Non-EVM implementations** — formal verification of mechanism properties in Move, Rust, etc.

## How Yiling Implements the Theory

| Paper Concept | Yiling Implementation |
|--------------|----------------------|
| Sequential reporting | \`predict()\` function, one per wallet |
| Random termination (α) | \`hash % WAD < alpha\` after each prediction |
| Reference agent = last reporter | Last predictor's value = \`qFinal\` |
| Cross-entropy scoring | \`FixedPointMath.crossEntropyScore()\` |
| Flat reward for last k | \`bond + flatReward\` for final k agents |
| Information aggregation | Previous predictions visible on-chain |
| Bond mechanism | \`msg.value\` attached to each prediction |

## Citation

\`\`\`bibtex
@inproceedings{srinivasan2025self,
  title={Self-Resolving Prediction Markets for Unverifiable Outcomes},
  author={Srinivasan, Siddarth and Karger, Ezra and Chen, Yiling},
  booktitle={Proceedings of the 26th ACM Conference on Economics and Computation},
  year={2025},
  publisher={ACM}
}
\`\`\``,
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function DocsPage() {
  const params = useParams();
  const slug = params.slug ? (params.slug as string[]).join("/") : "getting-started/overview";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("docs-dark-mode");
    if (saved === "true") setDarkMode(true);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      localStorage.setItem("docs-dark-mode", String(!prev));
      return !prev;
    });
  };
  const content = docsContent[slug] || `# Not Found\n\nPage \`${slug}\` not found.`;

  // After hydration, set initial collapsed state based on active slug
  useEffect(() => {
    if (!hydrated) {
      const initial: Record<string, boolean> = {};
      docsTree.forEach((s) => {
        const hasActivePage = s.items.some((item) => item.slug === slug);
        initial[s.title] = !hasActivePage;
      });
      setCollapsedSections(initial);
      setHydrated(true);
    } else {
      // When slug changes, expand the section containing it
      for (const section of docsTree) {
        if (section.items.some((item) => item.slug === slug)) {
          setCollapsedSections((prev) => ({ ...prev, [section.title]: false }));
        }
      }
    }
  }, [slug, hydrated]);

  // Find current and adjacent pages for navigation
  const allPages = docsTree.flatMap((s) => s.items);
  const currentIdx = allPages.findIndex((p) => p.slug === slug);
  const prevPage = currentIdx > 0 ? allPages[currentIdx - 1] : null;
  const nextPage = currentIdx < allPages.length - 1 ? allPages[currentIdx + 1] : null;

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${darkMode ? "docs-dark" : ""}`} style={darkMode ? { background: "#0a0a0f", color: "#e5e5e5" } : {}}>
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300"
        style={darkMode ? { background: "#1a1a2e", border: "1px solid #2d2d44", color: "#e5e5e5" } : { background: "#ffffff", border: "1px solid #e5e5e5" }}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 overflow-y-auto z-40 transition-all duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={darkMode ? { background: "#111118", borderRight: "1px solid #2d2d44" } : { background: "#ffffff", borderRight: "1px solid #e5e5e5" }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center">
                <Dices className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-[15px]" style={{ color: darkMode ? "#e5e5e5" : "#171717" }}>Yiling Docs</span>
            </Link>
            <button
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
              style={darkMode
                ? { background: "#1e1e2e", border: "1px solid #3d3d5c", color: "#fbbf24" }
                : { background: "#f5f5f5", border: "1px solid #e5e5e5", color: "#525252" }
              }
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <nav className="space-y-6">
            {docsTree.map((section) => {
              const isCollapsible = true;
              const isCollapsed = collapsedSections[section.title] ?? false;
              const isActiveSection = section.items.some((item) => item.slug === slug);

              return (
                <div key={section.title}>
                  <button
                    onClick={() => {
                      setCollapsedSections((prev) => ({
                        ...prev,
                        [section.title]: !prev[section.title],
                      }));
                    }}
                    className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-semibold mb-3 w-full text-left cursor-pointer transition-colors"
                    style={{ color: isActiveSection && isCollapsed ? "#ea580c" : darkMode ? "#6b7280" : "#a3a3a3" }}
                  >
                    <section.icon className="w-3.5 h-3.5" />
                    <span className="flex-1">{section.title}</span>
                    <ChevronRight
                      className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                    />
                    {isCollapsed && isActiveSection && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange" />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
                    }`}
                  >
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item.slug}>
                          <Link
                            href={`/docs/${item.slug}`}
                            onClick={() => setSidebarOpen(false)}
                            className={`block px-3 py-2 rounded-lg text-[14px] transition-colors ${
                              slug === item.slug
                                ? "font-semibold"
                                : ""
                            }`}
                            style={slug === item.slug
                              ? { background: darkMode ? "#ea580c15" : "#ea580c10", color: "#ea580c" }
                              : { color: darkMode ? "#9ca3af" : "#525252" }
                            }
                          >
                            {item.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${darkMode ? "#2d2d44" : "#e5e5e5"}` }}>
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] transition-colors"
              style={{ color: darkMode ? "#6b7280" : "#a3a3a3" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Landing
            </Link>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 lg:pl-0">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
          <article className={`docs-content ${darkMode ? "docs-content-dark" : ""}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>

          {/* Prev/Next navigation */}
          <div className="flex items-center justify-between mt-16 pt-8" style={{ borderTop: `1px solid ${darkMode ? "#2d2d44" : "#e5e5e5"}` }}>
            {prevPage ? (
              <Link
                href={`/docs/${prevPage.slug}`}
                className="flex items-center gap-2 text-[14px] text-text-secondary hover:text-text transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {prevPage.title}
              </Link>
            ) : <div />}
            {nextPage ? (
              <Link
                href={`/docs/${nextPage.slug}`}
                className="flex items-center gap-2 text-[14px] text-text-secondary hover:text-text transition-colors"
              >
                {nextPage.title}
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : <div />}
          </div>
        </div>
      </main>
    </div>
  );
}
