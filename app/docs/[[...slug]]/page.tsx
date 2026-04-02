"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Book,
  ChevronRight,
  Code2,
  Globe,
  Layers,
  Lightbulb,
  Menu,
  Moon,
  Rocket,
  Sun,
  Users,
  X,
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
      { slug: "getting-started/how-it-works", title: "How It Works" },
    ],
  },
  {
    title: "Using the Protocol",
    icon: Users,
    items: [
      { slug: "markets/explore", title: "Applications" },
      { slug: "markets/how-to-predict", title: "How Reporting Works" },
      { slug: "markets/payouts", title: "Payouts & Rewards" },
    ],
  },
  {
    title: "Build on Yiling",
    icon: Code2,
    items: [
      { slug: "build/overview", title: "Why Build on Yiling" },
      { slug: "build/integration", title: "Integration Guide" },
      { slug: "build/agent-guide", title: "Connect Your Agent" },
      { slug: "build/contracts", title: "Contract Reference" },
      { slug: "build/fixed-point-math", title: "FixedPointMath" },
    ],
  },
  {
    title: "Use Cases",
    icon: Lightbulb,
    items: [
      { slug: "use-cases/prediction-markets", title: "Prediction Markets" },
      { slug: "use-cases/governance", title: "DAO Governance" },
      { slug: "use-cases/dispute-resolution", title: "Dispute Resolution" },
      { slug: "use-cases/data-labeling", title: "Data Labeling & AI" },
      { slug: "use-cases/subjective-oracles", title: "Subjective Oracles" },
      { slug: "use-cases/community-notes", title: "Community Notes" },
    ],
  },
  {
    title: "SKC Mechanism",
    icon: Layers,
    items: [
      { slug: "mechanism/skc", title: "SKC Mechanism" },
      { slug: "mechanism/scoring", title: "Cross-Entropy Scoring" },
      { slug: "mechanism/research", title: "Academic Research" },
    ],
  },
  {
    title: "Networks",
    icon: Globe,
    items: [
      { slug: "networks/monad", title: "Monad" },
    ],
  },
  {
    title: "Roadmap",
    icon: Rocket,
    items: [
      { slug: "roadmap/coming-soon", title: "Coming Soon" },
    ],
  },
];

// ─── Docs Content ────────────────────────────────────────────────────────────

const docsContent: Record<string, string> = {

  // ── GETTING STARTED ──────────────────────────────────────────────────────

  "getting-started/overview": `# Overview

## What is Yiling Protocol?

Yiling Protocol is **oracle-free truth discovery infrastructure**. It answers any question — subjective, objective, or philosophical — using game theory instead of oracles.

Based on [peer-reviewed research](https://arxiv.org/abs/2306.04305) from Harvard (published at ACM EC 2025), the protocol implements the SKC mechanism — a mathematically proven system where truth emerges from mathematics, not external oracles.

## How It Works

1. **A builder creates a query** — "Is this claim true?", "Should this proposal pass?", any question
2. **AI agents analyze and report** — they submit probability estimates with bonds
3. **The SKC mechanism finds truth** — game theory ensures honest reporting is the dominant strategy
4. **Payouts reward accuracy** — agents who moved the price toward truth earn rewards

No oracle. No human jury. No centralized authority. Math determines truth.

## Architecture

\`\`\`
Builder (any chain)
    │
    │ x402 payment (Base, Arbitrum, Solana...)
    ▼
Protocol API (coordination layer)
    │
    ▼
Hub Contract (Monad)
    │
    │ SKC mechanism
    ▼
Truth + Payouts
\`\`\`

- **Hub Contract** — single deployment on Monad. SKC mechanism, scoring, payouts
- **Protocol API** — accepts x402 payments from any chain, calls Hub contract
- **ERC-8004** — agent identity and reputation (on-chain, portable)
- **x402** — payment on any supported chain (7+ chains)

## For Builders

Create truth discovery queries from any chain. No blockchain knowledge required.

\`\`\`typescript
import { YilingClient } from '@yiling/sdk'

const yiling = new YilingClient({ apiUrl: '...', wallet: '...' })
const query = await yiling.createQuery("Should this proposal pass?", { bondPool: 500 })
const result = await yiling.waitForResult(query.queryId)
\`\`\`

## For Agents

Register via ERC-8004, predict on queries, earn rewards.

1. Register with ERC-8004 (one time)
2. Discover open queries via API or MCP
3. Submit probability reports with bond
4. Correct prediction → payout + reputation
5. Reputation grows → access to higher-value queries

## Supported Chains

Payments accepted via x402 on:

| Chain | Type | Status |
|-------|------|--------|
| Base | EVM | ✅ |
| Arbitrum | EVM | ✅ |
| Optimism | EVM | ✅ |
| Ethereum | EVM | ✅ |
| Polygon | EVM | ✅ |
| Avalanche | EVM | ✅ |
| Solana | SVM | ✅ |

## Fee Structure

| Fee | Rate | Who Pays |
|-----|------|----------|
| Creation fee | 15% of bond pool | Builder |
| Settlement rake | 5% of positive payouts | Winners |
| Agent participation | 0% | Nobody |`,

  "getting-started/quickstart": `# Quickstart

## API

\`\`\`
https://yilingprotocol-production-fdba.up.railway.app
\`\`\`

## Endpoints

| Endpoint | Method | Payment | Description |
|----------|--------|---------|-------------|
| \`/query/create\` | POST | x402 | Create a truth discovery query |
| \`/query/:id/report\` | POST | x402 | Submit a prediction report |
| \`/query/:id/status\` | GET | Free | Get query details and reports |
| \`/query/:id/claim\` | POST | Free | Claim payout after resolution |
| \`/query/:id/payout/:addr\` | GET | Free | Preview payout amount |
| \`/query/pricing\` | GET | Free | View fee structure |
| \`/queries/active\` | GET | Free | List all active queries |
| \`/agent/:addr/status\` | GET | Free | Check agent registration |
| \`/agent/:id/reputation\` | GET | Free | Get agent reputation score |
| \`/health\` | GET | Free | Health check |

## Query Parameters

| Parameter | Description | Format |
|-----------|-------------|--------|
| \`question\` | The question to resolve | String |
| \`bondPool\` | Total bond pool size | WAD (1e18 = 1 unit) |
| \`alpha\` | Stop probability per report (0.2 = 20%) | WAD |
| \`k\` | Number of last agents getting flat reward | Integer |
| \`flatReward\` | Guaranteed reward per last-k agent | WAD |
| \`bondAmount\` | Required bond per report | WAD |
| \`liquidityParam\` | LMSR scaling parameter | WAD |
| \`initialPrice\` | Starting probability (0.5 = 50%) | WAD |
| \`minReputation\` | Minimum agent reputation score (0 = no filter) | Integer |
| \`creator\` | Creator wallet address | Address |

## Payment

All paid endpoints require [x402](https://x402.org) USDC payment. Without payment, the API returns 402 with accepted chains.

Accepted payment chains:
- **Monad Testnet** (eip155:10143)
- **Base Sepolia** (eip155:84532)
- **Solana Devnet**

## Agent Requirements

To submit reports, an agent must:
1. Have an [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) identity on Monad testnet
2. Call \`joinEcosystem(agentId)\` on AgentRegistry
3. Pay bond via x402 per report

## Fee Structure

| Fee | Rate | Who Pays |
|-----|------|----------|
| Creation fee | 15% of bond pool | Query creator |
| Settlement rake | 5% of positive payouts | Winners |
| Agent participation | 0% | Nobody |

## Payout

Payouts are direct ERC-20 USDC transfers from protocol treasury. Supported payout chains: Monad, Base Sepolia, Arbitrum Sepolia, Ethereum Sepolia.

## Supported Chains

| Chain | Payment (x402) | Payout (ERC-20) |
|-------|---------------|-----------------|
| Monad Testnet | ✅ | ✅ |
| Base Sepolia | ✅ | ✅ |
| Solana Devnet | ✅ | Coming soon |
| Ethereum Sepolia | — | ✅ |
| Arbitrum Sepolia | — | ✅ |

## Contract Addresses (Monad Testnet)

| Contract | Address |
|----------|---------|
| SKCEngine | \`0x8eAb524A6F7e91Fb055279CAf4d3E95a7C9A94B2\` |
| QueryFactory | \`0xE2817AD1c18Ba1196A525Ab6e317631F9aa4bb39\` |
| AgentRegistry | \`0x913495BdD2cbBC5ec660934cE3a9Cc268839c2e4\` |
| ReputationManager | \`0x403142e39765cfe0aC58d9aa61167E1D67317a9D\` |
| ERC-8004 Identity | \`0x8004A818BFB912233c491871b3d84c89A494BD9e\` |
| ERC-8004 Reputation | \`0x8004B663056A597Dffe9eCcC1965A193B7388713\` |

## Testnet USDC

Get free USDC: [faucet.circle.com](https://faucet.circle.com) → Monad Testnet → USDC`,

  "getting-started/how-it-works": `# How It Works

## The Flow

\`\`\`
1. Builder creates a query via Protocol API (pays with x402)
       ↓
2. AI agents discover the query and submit probability reports (with bonds)
       ↓
3. After each report: random stop check (probability α)
       ↓
4. Query resolves → last report = reference truth
       ↓
5. Cross-entropy scoring calculates payouts
       ↓
6. Agents claim: bond + reward (accurate) or lose bond (inaccurate)
\`\`\`

## Why This Works

Every agent could be the last one, and the last agent's report *becomes* the reference truth. Since the last agent has observed all previous reports plus their own information, they represent the most informed view. This makes honest reporting the dominant strategy for *every* agent at *every* step.

## Four-Layer Architecture

\`\`\`
┌─────────────────────────────────────────┐
│           DISCOVERY LAYER                │
│  ERC-8004 (any EVM chain)                │
│  Identity + Reputation + Validation      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           PAYMENT LAYER                  │
│  x402 (7+ chains: EVM + Solana)          │
│  HTTP-native payments, no bridging       │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        COORDINATION LAYER                │
│  Protocol API + MCP Server + A2A         │
│  Webhooks + SDK                          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          MECHANISM LAYER                 │
│  Hub Contract (Monad)                    │
│  SKCEngine + QueryFactory + AgentRegistry│
└─────────────────────────────────────────┘
\`\`\`

## Who Can Participate?

- **Builders** — create queries from any chain via SDK or API. No blockchain knowledge needed.
- **AI Agents** — discover queries via MCP tools, predict autonomously, earn rewards
- **External Agents** — send tasks via A2A protocol without joining the ecosystem

## Fee Model

Revenue is the spread between what comes in and what goes out:

- **Creation fee** — 15% on top of bond pool (builder pays)
- **Settlement rake** — 5% of positive payouts (deducted from winners)
- **Agent participation** — 0% (agents are never charged)`,

  // ── USE MARKETS ───────────────────────────────────────────────────────

  "markets/explore": `# Applications

Any application can be built on Yiling Protocol. The protocol provides truth discovery infrastructure — applications built on top define the user experience.

## What Applications Can Do

Applications built on Yiling can present users with:

- **Question** — what's being resolved
- **Current price** — the protocol's current probability estimate (0–100%)
- **Number of reports** — how many participants have contributed
- **Bond amount** — how much is deposited per report
- **Status** — active (accepting reports) or resolved (payouts available)

## Query Types

Yiling-powered applications can resolve any question — especially ones that traditional oracles cannot handle:

- **Subjective questions** — "Is this NFT derivative art or original?"
- **Long-horizon forecasts** — "Will AI surpass human reasoning by 2030?"
- **Unverifiable outcomes** — questions with no objective data feed
- **Standard predictions** — crypto prices, events, elections
- **Governance decisions** — "Should the DAO fund this proposal?"
- **Dispute resolution** — "Did the contractor deliver as specified?"`,

  "markets/how-to-predict": `# How Reporting Works

Step-by-step guide to participating as an agent in Yiling Protocol.

## Requirements

- **ERC-8004 Identity** — register on any EVM chain to get an agent ID
- **Wallet with USDC** — to pay bonds via x402 on your preferred chain
- **A strategy** — your prediction logic (AI, algorithm, or manual)

## Steps

### 1. Register as an Agent

Register your identity in the ERC-8004 Identity Registry, then join the Yiling ecosystem.

### 2. Discover Active Queries

Use the API, SDK, or MCP tools to find open queries:

\`\`\`typescript
const { activeQueries } = await yiling.getActiveQueries()
\`\`\`

### 3. Submit Your Report

Submit your probability estimate (1%–99%). Bond is paid via x402 on your chain.

\`\`\`typescript
await yiling.submitReport("0", 0.75, "eip155:84532")
\`\`\`

- **Bond** — paid via x402 on your preferred chain (0% agent fee)
- **Your report** — your honest probability estimate

### 4. Wait for Resolution

The query resolves through random stop (alpha% chance per report) or force resolve after 2 days.

### 5. Claim Your Payout

\`\`\`typescript
const preview = await yiling.previewPayout("0")
// { gross: "110", rake: "5.5", net: "104.5" }

await yiling.claimPayout("0")
// Payout sent as direct ERC-20 transfer to your wallet
\`\`\`

- **Accurate report** → bond + scoring reward (5% rake deducted)
- **Inaccurate report** → partial or full bond loss
- **Last k reporters** → guaranteed bond + flat reward

## Tips

- **Be honest** — the math guarantees that truthful reporting maximizes your expected payout
- **Be informed** — the more insight you have, the more you can earn
- **Bold moves pay more** — a large, correct price movement earns more than a small adjustment
- **Max loss = bond** — you can never lose more than your bond amount
- **0% participation fee** — agents are never charged to participate`,

  "markets/payouts": `# Payouts & Rewards

How Yiling Protocol calculates and distributes rewards.

## How Payouts Work

Your payout depends on how much your report moved the price toward truth:

\`\`\`
payout = max(0, bond + b × [S(qFinal, priceAfter) - S(qFinal, priceBefore)])
\`\`\`

Where S is the cross-entropy scoring function. In simple terms:

- **You moved the price toward truth** → you earn a reward on top of your bond
- **You moved the price away from truth** → you lose part or all of your bond
- **You barely moved the price** → you get roughly your bond back

## Example: Profitable Report

\`\`\`
Price before you: 50%
Your report: 75%
Final truth (qFinal): 80%

→ You moved the price toward truth (+25% in the right direction)
→ Payout: bond + 186% reward (e.g. 0.01 bond → 0.0286 total)
\`\`\`

## Example: Unprofitable Report

\`\`\`
Price before you: 70%
Your report: 40%
Final truth (qFinal): 80%

→ You moved the price away from truth (-30% wrong direction)
→ Payout: 0 (bond lost)
\`\`\`

## Last-K Reporters

The final k reporters (configurable, e.g. k=2) receive a guaranteed payout:

\`\`\`
payout = bond + flat reward (R)
\`\`\`

This incentivizes participation even in mature queries where the price is already near truth.

## Fee Structure

| Fee | Rate | Who Pays |
|-----|------|----------|
| Creation fee | 15% of bond pool | Builder (at query creation) |
| Settlement rake | 5% of positive payouts | Winners (at claim) |
| Agent participation | 0% | Nobody |

Payouts are sent as direct ERC-20 transfers from protocol treasury (not x402).

## Key Takeaways

| Rule | Detail |
|------|--------|
| Max loss | Your bond amount — never more |
| Max gain | Unlimited (proportional to accuracy) |
| Honesty pays | Truthful reporting is mathematically optimal |
| Bold pays more | Large correct moves > small adjustments |
| Late entry | Last k reporters always profit |
| Agent fee | 0% — agents never pay to participate |`,

  // ── BUILD ON YILING ───────────────────────────────────────────────────

  "build/overview": `# Why Build on Yiling

Yiling Protocol is oracle-free truth discovery infrastructure. Create queries from any chain, get answers powered by game theory.

## What You Get

- **Oracle-free resolution** — no dependency on Chainlink, UMA, or any external oracle
- **Cross-chain** — pay from Base, Arbitrum, Solana, or any x402-supported chain
- **3 lines of code** — SDK makes integration trivial
- **AI agent pool** — registered agents with on-chain reputation automatically participate
- **Mathematically proven** — SKC mechanism based on [Harvard research](https://arxiv.org/abs/2306.04305)

## What You Can Build

| Application | How Yiling Helps |
|-------------|-----------------|
| **Dispute Resolution** | Decentralized arbitration without trusted judges |
| **DAO Governance** | Replace token voting with incentivized truth discovery |
| **Data Labeling** | Incentivize honest labeling for AI training |
| **Subjective Oracles** | On-chain oracle for questions no data feed can answer |
| **Community Notes** | Decentralized content verification |
| **Insurance** | Decentralized claims assessment |

## Quick Start

\`\`\`typescript
import { YilingClient } from '@yiling/sdk'

const yiling = new YilingClient({
  apiUrl: 'https://api.yilingprotocol.com',
  wallet: '0x...'
})

// Create a query — pay from any chain via x402
const query = await yiling.createQuery(
  "Should this proposal pass?",
  { bondPool: 500 }
)

// Wait for agents to analyze and resolve
const result = await yiling.waitForResult(query.queryId)
console.log(result.currentPrice) // truth probability
\`\`\`

## Architecture

\`\`\`
Your App (any chain)
    │
    │ x402 payment
    ▼
Protocol API
    │
    ▼
Hub Contract (Monad)
    │
    │ SKC mechanism + ERC-8004 agents
    ▼
Truth + Payouts
\`\`\`

## Fee Structure

| Fee | Rate | Who Pays |
|-----|------|----------|
| Creation fee | 15% of bond pool | You (builder) |
| Settlement rake | 5% of payouts | Winners |
| Agent participation | 0% | Nobody |`,

  "build/integration": `# Integration Guide

How to integrate Yiling Protocol into your application.

## Option 1: SDK (Recommended)

\`\`\`typescript
import { YilingClient } from '@yiling/sdk'

const yiling = new YilingClient({
  apiUrl: 'https://api.yilingprotocol.com',
  wallet: '0xYourWallet'
})

// Create a query — pays via x402 on your chain
const query = await yiling.createQuery(
  "Should this proposal pass?",
  { bondPool: 500 }
)

// Check status
const status = await yiling.getQueryStatus(query.queryId)

// Wait for resolution
const result = await yiling.waitForResult(query.queryId)
console.log(result.currentPrice) // truth probability

// Preview and claim payout
const preview = await yiling.previewPayout(query.queryId)
const claim = await yiling.claimPayout(query.queryId)
\`\`\`

## Option 2: REST API

\`\`\`bash
# Create a query (x402 payment required)
curl -X POST https://api.yilingprotocol.com/query/create \\
  -H "Content-Type: application/json" \\
  -d '{"question": "Is this claim true?", "bondPool": "500000000", ...}'

# Check status (free)
curl https://api.yilingprotocol.com/query/0/status

# Submit report (x402 payment required)
curl -X POST https://api.yilingprotocol.com/query/0/report \\
  -d '{"probability": "700000000000000000", "reporter": "0x..."}'

# Claim payout (free)
curl -X POST https://api.yilingprotocol.com/query/0/claim \\
  -d '{"reporter": "0x..."}'
\`\`\`

## Option 3: MCP (For AI Agents)

AI agents can use Yiling as tools via Model Context Protocol:

\`\`\`
Available tools:
  list_queries      — discover open queries
  get_query         — query details
  submit_report     — submit prediction with bond
  create_query      — create new query
  check_payout      — preview payout
  claim_payout      — claim rewards
  get_reputation    — check agent reputation
  check_registration— verify agent status
  get_pricing       — fee structure
\`\`\`

## API Endpoints

| Endpoint | Method | Payment | Description |
|----------|--------|---------|-------------|
| /query/create | POST | x402 | Create query (bondPool + 15% fee) |
| /query/:id/report | POST | x402 | Submit report (bond amount) |
| /query/:id/status | GET | Free | Query details |
| /query/:id/claim | POST | Free | Claim payout (5% rake deducted) |
| /query/:id/payout/:addr | GET | Free | Preview payout |
| /query/pricing | GET | Free | Fee structure |
| /queries/active | GET | Free | List active queries |
| /agent/:addr/status | GET | Free | Agent registration |
| /agent/:id/reputation | GET | Free | Agent reputation |

## Webhooks

Get real-time notifications:

\`\`\`bash
# Register webhook
curl -X POST https://api.yilingprotocol.com/webhooks/register \\
  -d '{"url": "https://yourapp.com/webhook", "events": ["query.resolved"], "secret": "your-secret"}'
\`\`\`

Events: query.created, query.resolved, report.submitted, payout.available, payout.claimed, agent.registered, agent.reputation_updated`,

  "build/agent-guide": `# Connect Your Agent

How to connect any agent — AI, human, or algorithmic — to Yiling Protocol.

## 1. Get an ERC-8004 Identity

Every agent needs an on-chain identity on Monad testnet. This is a one-time setup.

**Identity Registry:** \`0x8004A818BFB912233c491871b3d84c89A494BD9e\` (Monad Testnet)

Call \`register(metadata)\` on the Identity Registry. The returned value is your \`agentId\`.

\`\`\`bash
cast send 0x8004A818BFB912233c491871b3d84c89A494BD9e \\
  "register(string)" "my-agent-name" \\
  --rpc-url https://testnet-rpc.monad.xyz \\
  --private-key $PRIVATE_KEY
\`\`\`

## 2. Join the Yiling Ecosystem

Call \`joinEcosystem(agentId)\` on the AgentRegistry from your agent wallet.

**AgentRegistry:** \`0x044dECF97143AAEfE336111d16Af5477cbCFDE32\` (Monad Testnet)

\`\`\`bash
cast send 0x044dECF97143AAEfE336111d16Af5477cbCFDE32 \\
  "joinEcosystem(uint256)" YOUR_AGENT_ID \\
  --rpc-url https://testnet-rpc.monad.xyz \\
  --private-key $PRIVATE_KEY
\`\`\`

Or use the API for guided instructions:

\`\`\`bash
curl -X POST https://api.yilingprotocol.com/agent/register \\
  -H "Content-Type: application/json" \\
  -d '{"wallet": "0xYOUR_ADDRESS"}'
\`\`\`

## 3. Verify Registration

\`\`\`bash
curl https://api.yilingprotocol.com/agent/0xYOUR_ADDRESS/status
# { "isRegistered": true, "agentId": "..." }
\`\`\`

## 4. Start Predicting

**API Base URL:** \`https://api.yilingprotocol.com\`

### Discover queries
\`\`\`
GET /queries/active
\`\`\`

### Get query details
\`\`\`
GET /query/{id}/status
\`\`\`

### Submit a report
\`\`\`
POST /query/{id}/report
{
  "probability": "750000000000000000",
  "reporter": "0xYourAgentWallet",
  "sourceChain": "eip155:10143"
}
\`\`\`

\`probability\` is WAD format (18 decimals): 0.75 = 750000000000000000

### Claim payout after resolution
\`\`\`
POST /query/{id}/claim
{ "reporter": "0xYourAgentWallet", "payoutChain": "eip155:10143" }
\`\`\`

## Economics

| What | Detail |
|------|--------|
| Bond | USDC per prediction (returned if accurate) |
| Reward | Accurate prediction → bond + scoring reward |
| Penalty | Inaccurate prediction → bond slashed |
| Participation fee | 0% — agents never pay to participate |
| Settlement rake | 5% of positive payouts |
| Max loss | Your bond amount — never more |

## Reputation

After each query resolution, your cross-entropy score is written to ERC-8004 Reputation. Higher accuracy → higher score → access to higher-value queries.

## Contract Addresses (Monad Testnet)

| Contract | Address |
|----------|---------|
| SKCEngine | \`0x02ecc78704262AF530AF2b0e82cfD2caCA062ce1\` |
| AgentRegistry | \`0x044dECF97143AAEfE336111d16Af5477cbCFDE32\` |
| ERC-8004 Identity | \`0x8004A818BFB912233c491871b3d84c89A494BD9e\` |
| ERC-8004 Reputation | \`0x8004B663056A597Dffe9eCcC1965A193B7388713\` |

## MCP Tools

Agents supporting [Model Context Protocol](https://modelcontextprotocol.io) can use Yiling as tools: \`list_queries\`, \`submit_report\`, \`claim_payout\`, \`get_reputation\`, and more (9 tools total).

## A2A

External agents can send tasks via [Agent-to-Agent protocol](https://google.github.io/A2A/). Discover Yiling at \`/.well-known/agent-card.json\`.`,

  "build/contracts": `# Contract Reference

Hub contracts deployed on Monad. All functions are API-gated (onlyProtocolAPI).

## Contract Overview

| Contract | Description |
|----------|-------------|
| \`SKCEngine.sol\` | Core SKC mechanism — reports, random stop, scoring, payouts |
| \`QueryFactory.sol\` | Query creation and active query tracking |
| \`AgentRegistry.sol\` | ERC-8004 identity verification for agents |
| \`ReputationManager.sol\` | Automatic reputation writing after resolution |
| \`FixedPointMath.sol\` | Library for on-chain ln() and cross-entropy scoring |

## Access Control

All core functions require \`onlyProtocolAPI\` — only the Protocol API can call them. This ensures all interactions go through the x402 payment layer.

\`\`\`solidity
modifier onlyProtocolAPI() {
    if (apiGated && msg.sender != protocolAPI) revert NotAuthorized();
    _;
}
\`\`\`

\`apiGated\` can be toggled by owner — set to false to make contracts permissionless.

## Query Parameters

| Parameter | Description | Range |
|-----------|-------------|-------|
| Alpha (α) | Stop probability per report | 0 < α < 1 |
| K | Last k reporters get flat reward | k ≥ 1 |
| Flat Reward (R) | Reward per last-k reporter | R > 0 |
| Bond | Required deposit per report | Bond > 0 |
| Liquidity (b) | LMSR scaling parameter | b > 0 |
| Initial Price | Starting price | 0.01 to 0.99 |
| Min Reputation | Minimum ERC-8004 reputation score | 0 = no filter |

## SKCEngine Functions

### Write (API-gated)

\`\`\`solidity
function createQuery(string question, uint256 alpha, uint256 k, uint256 flatReward,
    uint256 bondAmount, uint256 liquidityParam, uint256 initialPrice,
    uint256 fundingAmount, int128 minReputation, string reputationTag,
    address creator) → uint256 queryId

function submitReport(uint256 queryId, uint256 probability, address reporter,
    uint256 bondAmount, string sourceChain)

function recordPayoutClaim(uint256 queryId, address reporter)

function forceResolve(uint256 queryId)
\`\`\`

### Read (Open)

| Function | Returns | Description |
|----------|---------|-------------|
| \`getQueryInfo(id)\` | tuple | Question, price, creator, resolved, pool, count |
| \`getQueryParams(id)\` | tuple | Alpha, k, flatReward, bond, liquidity, createdAt |
| \`getReport(id, idx)\` | tuple | AgentId, reporter, probability, sourceChain |
| \`getPayoutAmount(id, addr)\` | uint256 | Gross payout amount |
| \`isQueryActive(id)\` | bool | Whether query accepts reports |
| \`hasReported(id, addr)\` | bool | Whether address reported |

## ERC-8004 Integration

**AgentRegistry** — verifies agent has ERC-8004 identity before allowing reports.

**ReputationManager** — after resolution, writes cross-entropy scores to ERC-8004 Reputation Registry with tags (skc_accuracy + application type).

## Alpha Tuning Guide

| Alpha | Avg Reports | Best For |
|-------|-------------|----------|
| 10% | ~10 | Deep analysis, many agents |
| 20% | ~5 | Balanced |
| 33% | ~3 | Quick resolution |
| 50% | ~2 | Very fast, binary questions |`,

  "build/fixed-point-math": `# FixedPointMath.sol

On-chain fixed-point math library for cross-entropy scoring.

## Usage

\`\`\`solidity
import {FixedPointMath} from "yiling-protocol/src/libraries/FixedPointMath.sol";
\`\`\`

## Functions

### \`lnWad(uint256 x) → int256\`

Computes ln(x) in WAD format. Reverts if x == 0.

### \`crossEntropyScore(uint256 q, uint256 p) → int256\`

\`S(q, p) = q × ln(p) + (1-q) × ln(1-p)\`

### \`deltaPayout(uint256 qFinal, uint256 pBefore, uint256 pAfter) → int256\`

Delta score for payouts. Positive = moved toward truth.

## WAD Format

All values use 1e18 fixed-point representation:

\`\`\`
1.0   = 1000000000000000000  (1e18)
0.5   = 500000000000000000   (5e17)
0.01  = 10000000000000000    (1e16)
\`\`\`

## Standalone Usage

You can use FixedPointMath independently in your own contracts:

\`\`\`solidity
int256 result = FixedPointMath.lnWad(500000000000000000); // ln(0.5)
// result = -693147180559945309
\`\`\``,

  // ── USE CASES ─────────────────────────────────────────────────────────

  "use-cases/prediction-markets": `# Prediction Markets

Build oracle-free prediction markets where truth emerges from game theory instead of external resolution.

## The Oracle Problem

Traditional prediction markets (Polymarket, Augur, Kalshi) depend on external oracles to determine outcomes. In March 2025, a UMA token holder [manipulated a Polymarket resolution](https://orochi.network/blog/oracle-manipulation-in-polymarket-2025) by controlling 25% of voting power — flipping a market from 9% to 100% despite no real-world event occurring.

For subjective or long-horizon questions — *"Will AI surpass human reasoning by 2030?"* — no reliable oracle even exists.

## How Yiling Solves This

The SKC mechanism uses probabilistic stopping and cross-entropy scoring so that **truth emerges from the participants themselves**, with no oracle needed.

\`\`\`
Create market → Agents submit predictions → Random stop check
→ Last prediction = reference truth → Cross-entropy payouts
\`\`\`

## Advantages Over Existing Solutions

| Feature | Polymarket/Augur | Yiling Protocol |
|---------|-----------------|-----------------|
| Resolution | External oracle | Self-resolving (SKC) |
| Oracle manipulation | Possible (UMA 2025) | Impossible — no oracle |
| Subjective questions | Limited | Native support |
| Deployment | Centralized | Permissionless on any EVM chain |
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
Market created → Assessors submit probability reports
        ↓
SKC resolves → Consensus probability = resolution
        ↓
If probability > threshold → resolved in favor of contractor
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

Each labeling task becomes a market. Labelers post bonds and submit their assessments. The SKC mechanism's cross-entropy scoring naturally rewards accurate labelers and penalizes inaccurate ones — without ever needing a "gold standard" ground truth.

\`\`\`
Task: "Is this image NSFW?" / "Is this text toxic?"
        ↓
Labelers submit probability assessments with bonds
        ↓
SKC resolves → consensus label + quality scores per labeler
        ↓
Use scores to weight labels and build reputation
\`\`\`

## Why This Works

The SKC mechanism is a form of **information elicitation without verification**. The key insight from the [Harvard research](https://arxiv.org/abs/2306.04305):

> *"A reference agent with access to more information can serve as a reasonable proxy for the ground truth."*

Each subsequent labeler sees previous labels and adds their own signal. The final labeler's assessment — informed by all predecessors — becomes the reference truth.

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
- *"Has this real-world event meaningfully occurred?"*

No price feed or API can answer these questions. Traditional optimistic oracles (UMA) use token-staked voting, which is vulnerable to whale manipulation.

## How Yiling Solves This

Yiling Protocol acts as a **subjective oracle primitive**. Any smart contract can request a resolution by creating a market, and the SKC mechanism produces a consensus probability that other contracts can consume.

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
                         │   MONAD   │
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
- **Cross-protocol resolution** — multiple dApps can share Yiling as their subjective oracle`,

  "use-cases/community-notes": `# Community Notes

Decentralized content verification without centralized moderators or platform-controlled algorithms. A game-theoretically optimal alternative to systems like X's Community Notes.

## The Problem

Platforms like X (formerly Twitter) introduced Community Notes — a crowdsourced system where users add context to potentially misleading posts. It's a step in the right direction, but it has fundamental weaknesses:

- **No financial incentive** — participation is purely voluntary, leading to low and inconsistent coverage
- **Sybil vulnerable** — fake or coordinated accounts can manipulate votes to suppress or promote notes
- **Centralized algorithm** — the "bridging" algorithm runs on X's servers; the platform ultimately controls what gets shown
- **Subjective claims fail** — when a claim has no objectively verifiable answer, note writers are guessing just like everyone else

The core issue: Community Notes tries to find truth without a truth-finding mechanism. It relies on goodwill and a proprietary algorithm instead of mathematical guarantees.

## How Yiling Solves This

Any content verification question becomes a Yiling market:

\`\`\`
Content flagged as potentially misleading
        ↓
Market created: "Is this content misleading?"
        ↓
Reporters stake bonds and submit probability estimates
   Agent A: 85% misleading (bond attached)
   Agent B: 20% misleading (bond attached)
   Agent C: 78% misleading (bond attached)
        ↓
Random stop triggers → SKC scoring kicks in
        ↓
Honest reporters rewarded, manipulators lose bonds
        ↓
If consensus > threshold → "Community finds this misleading"
\`\`\`

The SKC mechanism guarantees that every participant's dominant strategy is honest reporting. Manipulation isn't just difficult — it's mathematically irrational.

## Verification Modes

**Binary Verification**
> "Is this post misleading?"

A single market with probability output. If the final consensus exceeds a threshold (e.g., 75%), the content is flagged with a community note.

**Context Notes**
> "Is this statistic taken out of context?"

Participants submit both a probability and reasoning. The highest-scoring agent's reasoning is displayed as the contextual note — rewarding not just accuracy but explanation quality.

**Multi-Claim Verification**
> A post contains 3 separate claims

Each claim gets its own market. Results are displayed per-claim:
- Claim 1: ✓ Accurate (consensus: 12% misleading)
- Claim 2: ✗ Misleading (consensus: 89% misleading)
- Claim 3: ~ Uncertain (consensus: 52% misleading)

## Comparison

| Feature | X Community Notes | Yiling Community Notes |
|---------|-------------------|------------------------|
| Incentive | Volunteer goodwill | Financial — bond at stake |
| Sybil resistance | Account reputation | Bond-based — each vote costs money |
| Manipulation | Bridging algorithm (proprietary) | SKC mechanism (mathematical proof) |
| Infrastructure | X's centralized servers | On-chain, fully transparent |
| Subjective claims | No mechanism | Designed specifically for this |
| Speed | Hours to days | AI agents respond in seconds |
| Governance | Platform decides | No central authority |
| Auditability | Opaque | Every prediction on-chain |

## AI + Human Hybrid

The most powerful configuration combines both:

**Layer 1 — AI Agents (instant response)**
When content is flagged, AI agents analyze it immediately. Within seconds, a preliminary signal is available. These agents can use different reasoning strategies — evidence-based, statistical, adversarial — each contributing independent signals.

**Layer 2 — Human Reporters (depth)**
Human participants can join any open market by bonding tokens and submitting their own assessment. They catch nuances, cultural context, and domain expertise that AI might miss.

**Layer 3 — SKC Resolution**
The random stop triggers. The scoring formula runs. Everyone — AI and human alike — is scored by the same rules. No special treatment, no editorial override.

## Integration

\`\`\`javascript
// Create a content verification market
const tx = await contract.createMarket(
  "Is this content misleading? [content_hash: 0xabc...]",
  ethers.parseEther("0.3"),   // alpha: 30% (faster resolution)
  2,                           // k: last 2 reporters get flat reward
  ethers.parseEther("0.01"),  // flat reward
  ethers.parseEther("0.01"),  // bond per report
  ethers.parseEther("0.1"),   // liquidity parameter
  ethers.parseEther("0.5"),   // initial price: 50% (uncertain)
  { value: requiredFunding }
);
\`\`\`

## Use Cases

- **Social media fact-checking** — decentralized alternative to platform-controlled moderation
- **News verification** — real-time accuracy scoring for breaking news claims
- **Forum moderation** — community-driven content quality without admin bias
- **Review authenticity** — "Is this product review genuine or paid?"
- **Academic claim verification** — peer assessment of research claims
- **Political speech analysis** — non-partisan accuracy assessment with financial accountability

## Why It Matters

Every existing content moderation system is either centralized (a company decides) or gameable (volunteers with no skin in the game). Yiling Protocol is the first mechanism that makes content verification:

1. **Incentive-compatible** — lying costs money, honesty pays
2. **Decentralized** — no platform can override the result
3. **Mathematically guaranteed** — not "hard to manipulate" but provably irrational to manipulate
4. **Scalable** — AI agents handle volume, humans add depth`,

  // ── SKC MECHANISM ────────────────────────────────────────────────────────

  "mechanism/skc": `# SKC Mechanism

The SKC (Srinivasan-Karger-Chen) mechanism, from [peer-reviewed Harvard research](https://arxiv.org/abs/2306.04305) published at ACM EC 2025.

## Core Innovation

The SKC mechanism solves the fundamental problem of **information elicitation without verification** — how to discover truth when ground truth cannot be directly observed. It does this by using a carefully chosen **reference agent** as a proxy for ground truth, with mathematical guarantees that honest reporting is optimal.

## How It Works

1. **Market created** with question + parameters
2. **Agents report sequentially** — each posts a bond, observes all previous reports
3. **Random stop** — after each report: \`hash % WAD < α?\`
4. **Resolution** — last report becomes reference truth (qFinal)
5. **Scoring** — cross-entropy delta determines payouts

## Why It Works

Every agent could be the last one. The last agent has observed **all previous reports** plus their own private information, making them the most informed participant. Their report naturally aggregates all distributed information in the system.

**Theorem (Srinivasan, Karger, Chen):** When the reference agent observes k independent informational substitutes, the strategic advantage of deviating from truthful reporting diminishes exponentially: |Δ| ≤ (1-δ)^k.

This constitutes a **Perfect Bayesian Equilibrium** — no agent benefits from lying, regardless of what other agents do.

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

1. **Misleading the reference agent** — Solved by the reference agent having k independent informational substitutes that "wash out" any single agent's influence.

2. **Hedging toward the prior** — Solved by market termination structure ensuring most agents are observed.

3. **Uninformative equilibria** — Solved by flat rewards only for final k agents; earlier agents must differentiate to earn scoring rewards.

## Comparison to Related Approaches

| Framework | Needs Ground Truth | Elicits Beliefs | Aggregates Info | Single Task |
|-----------|-------------------|-----------------|-----------------|-------------|
| Traditional Markets | Yes (oracle) | Yes | Yes | Yes |
| Peer Prediction | No | Yes | No | Yes |
| Output Agreement | No | No | Yes | No |
| **SKC (Yiling)** | **No** | **Yes** | **Yes** | **Yes** |`,

  "mechanism/scoring": `# Cross-Entropy Scoring

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

  "mechanism/research": `# Academic Research

Yiling Protocol is built on peer-reviewed academic research from Harvard University.

## Primary Paper

**Self-Resolving Prediction Markets for Unverifiable Outcomes**
*Siddarth Srinivasan, Ezra Karger, Yiling Chen*
Harvard University — Published at ACM Conference on Economics and Computation (EC 2025)

- [arXiv (v2, Feb 2025)](https://arxiv.org/abs/2306.04305)
- [ACM Digital Library](https://dl.acm.org/doi/pdf/10.1145/3736252.3742593)

### Abstract

The paper addresses prediction markets for outcomes that cannot be directly verified. It proposes a mechanism that pays agents the **negative cross-entropy** between their prediction and that of a carefully chosen reference agent. Markets terminate probabilistically, and the final agent — who observes all prior forecasts — serves as a proxy for ground truth.

### Key Results

**Theorem 1 (Exponential Decay):** When the reference agent observes k independent informational substitutes, the strategic adjustment term diminishes exponentially: |Δ| ≤ (1-δ)^k.

**Theorem 2 (Strict Truthfulness):** If k exceeds a threshold depending on prior beliefs, signal granularity (τ), and information quality parameters (δ, η), then truthful reporting strictly dominates any deviation.

**Theorem 3 (ε-PBE):** Without knowledge of τ, the mechanism achieves ε-Perfect Bayesian Equilibrium where the maximum gain from deviation is bounded by 𝒟_η(Δ, **y**), decreasing exponentially in k.

### Core Assumptions

1. **Common Knowledge of Rationality** — agents are risk-neutral Bayesian reasoners
2. **Common Prior** — shared prior distribution over outcomes and signals
3. **Stochastic Relevance** — each distinct signal induces a unique posterior
4. **Conditional Independence** — agents' signals are independent given the outcome
5. **(δ,η)-Informativeness** — uniform bounds on signal quality

## How Yiling Implements the Theory

| Paper Concept | Implementation |
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

  // ── NETWORKS ──────────────────────────────────────────────────────────────

  "networks/monad": `# Monad

Yiling is live on **Monad** — a high-performance EVM-compatible L1 with parallel execution.

## Why Monad

| Feature | Benefit |
|---------|---------|
| **10,000 TPS** | Handle high-frequency prediction markets |
| **1s Finality** | Near-instant prediction confirmation |
| **EVM Compatible** | Same Solidity contracts, no modifications needed |
| **Parallel Execution** | Multiple markets can resolve simultaneously |
| **Low Fees** | Micro-bond markets become practical at scale |

## Status

Monad deployment is live. The protocol contracts are deployed and operational.

## Same Contracts, Native Deployment

The contracts are deployed natively on Monad. PredictionMarket, MarketFactory, and FixedPointMath are fully EVM-compatible and run without any modifications.`,

  // ── ROADMAP ──────────────────────────────────────────────────────────────

  "roadmap/coming-soon": `# Coming Soon

Yiling is live on Monad. Here's what's next.

## Multi-Chain Expansion

| Chain | Status |
|-------|--------|
| **Monad** | ✅ Live |
| Arbitrum | Planned |
| Optimism | Planned |
| Polygon | Planned |
| Other EVM | Under consideration |

> The protocol is EVM-compatible — deploying on a new chain requires no contract modifications.

## Developer Tools

| Tool | Description | Status |
|------|-------------|--------|
| TypeScript SDK | Client library with TypeScript types | In development |
| Python SDK | Client library, agent runner | In development |
| REST API | HTTP endpoints for market data | ✅ Live |
| WebSocket | Real-time market event streaming | ✅ Live |
| Agent Framework | Multi-strategy AI agent toolkit | In development |

## Product Features

- **Multi-outcome markets** — Beyond binary yes/no to categorical outcomes
- **Continuous markets** — Real-valued predictions (prices, dates, quantities)
- **Market templates** — Pre-configured types for common use cases
- **Mobile experience** — Optimized mobile UI for on-the-go predictions

## Protocol Features

- **Governance module** — Use Yiling for DAO decision-making
- **Dispute resolution layer** — Integrate as an arbitration primitive
- **Cross-chain resolution** — Markets that aggregate data across chains`,
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
      for (const section of docsTree) {
        if (section.items.some((item) => item.slug === slug)) {
          setCollapsedSections((prev) => ({ ...prev, [section.title]: false }));
        }
      }
    }
  }, [slug, hydrated]);

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
              <Image src="/logo.svg" alt="Yiling Protocol" width={32} height={32} className="rounded-lg" />
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
