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
      { slug: "getting-started/how-it-works", title: "How It Works" },
    ],
  },
  {
    title: "Use Markets",
    icon: Users,
    items: [
      { slug: "markets/explore", title: "Explore Markets" },
      { slug: "markets/how-to-predict", title: "How to Predict" },
      { slug: "markets/payouts", title: "Payouts & Rewards" },
    ],
  },
  {
    title: "Build on Yiling",
    icon: Code2,
    items: [
      { slug: "build/overview", title: "Why Build on Yiling" },
      { slug: "build/integration", title: "Integration Guide" },
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
      { slug: "networks/base", title: "Base" },
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

## What is Yiling?

Yiling is an **oracle-free prediction market protocol** — and also a live product. We run our own prediction markets on Base and Monad, and the same infrastructure is open for anyone to build on.

Based on [peer-reviewed research](https://arxiv.org/abs/2306.04305) from Harvard (published at ACM EC 2025), the protocol implements the SKC mechanism — a mathematically proven system where truth emerges from game theory, not external oracles.

## Two Ways to Use Yiling

### 1. Trade on Our Markets
Yiling runs live prediction markets on **Base** and **Monad**. You can explore markets, submit your predictions, and earn rewards for accuracy — no oracle needed.

→ [Explore Markets](https://yilingmarket-onbase.vercel.app/)

### 2. Build Your Own
The same infrastructure powering our markets is available for you to build on. Create your own prediction markets, governance systems, dispute resolution, or anything that needs decentralized truth discovery.

→ [Integration Guide](/docs/build/overview)

## Why It Matters

Every prediction market today depends on an external oracle to decide what's true. In March 2025, a UMA token holder [manipulated a Polymarket resolution](https://orochi.network/blog/oracle-manipulation-in-polymarket-2025) by controlling 25% of voting power.

Yiling removes the oracle entirely:

- **Self-resolving** — markets close themselves through probabilistic stopping
- **Truthful equilibrium** — honest reporting is a Perfect Bayesian Equilibrium
- **Cross-entropy scoring** — earn rewards proportional to your accuracy
- **Bond-based** — every prediction requires a deposit, creating skin in the game
- **Live now** — deployed on Base and Monad with low gas fees`,

  "getting-started/how-it-works": `# How It Works

## The Flow

\`\`\`
1. A market is created ("Will ETH hit $10k by 2026?")
       ↓
2. Predictors submit their probability estimates (each posts a bond)
       ↓
3. After each prediction: random stop check (probability α)
       ↓
4. Market resolves → last prediction = reference truth
       ↓
5. Cross-entropy scoring calculates payouts
       ↓
6. Predictors claim: bond + reward (accurate) or lose bond (inaccurate)
\`\`\`

## Why This Works

Every predictor could be the last one, and the last predictor's report *becomes* the reference truth. Since the last predictor has observed all previous reports plus their own information, they represent the most informed view. This makes honest reporting the dominant strategy for *every* predictor at *every* step.

## Who Can Participate?

Anyone. Yiling markets are permissionless:

- **Humans** — connect your wallet and submit predictions directly
- **AI Agents** — any LLM, algorithm, or bot can participate programmatically
- **Protocols** — other smart contracts can integrate Yiling as a resolution layer

## System Overview

\`\`\`
┌─────────────────────────────────────────────────┐
│              YILING MARKETS (our app)            │
│     yilingmarket-onbase.vercel.app                │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │     YOUR APP / AGENT  │  ← you can build here too
        └───────────┼───────────┘
                    │
        ┌───────────▼───────────┐
        │    YILING CONTRACTS   │
        │  (Truth Discovery)    │
        └───────────┬───────────┘
                    │
           ┌────────▼────────┐
           │  Base · Monad   │
           └─────────────────┘
\`\`\``,

  // ── USE MARKETS ───────────────────────────────────────────────────────

  "markets/explore": `# Explore Markets

Yiling runs live prediction markets on multiple chains. Browse open markets, see current probabilities, and submit your own predictions.

## Live Markets

| Chain | Status | Link |
|-------|--------|------|
| **Base & Monad** | ✅ Live | [yilingmarket-onbase.vercel.app](https://yilingmarket-onbase.vercel.app/) |

## What You'll Find

Each market has:

- **Question** — what's being predicted
- **Current price** — the market's current probability estimate (0–100%)
- **Number of predictions** — how many people have participated
- **Bond amount** — how much you need to deposit to predict
- **Status** — active (accepting predictions) or resolved (payouts available)

## Market Types

Yiling markets can cover any question — especially ones that traditional oracles can't handle:

- **Subjective questions** — "Is this NFT derivative art or original?"
- **Long-horizon forecasts** — "Will AI surpass human reasoning by 2030?"
- **Unverifiable outcomes** — questions with no objective data feed
- **Standard predictions** — crypto prices, events, elections`,

  "markets/how-to-predict": `# How to Predict

Step-by-step guide to participating in Yiling prediction markets.

## Requirements

- A wallet (MetaMask, Coinbase Wallet, etc.)
- ETH on Base (for gas + bond)
- That's it — no signup, no KYC

## Steps

### 1. Connect Your Wallet

Go to [yilingmarket-onbase.vercel.app](https://yilingmarket-onbase.vercel.app/) and connect your wallet. Select your network (Base or Monad) from the app.

### 2. Browse Markets

Explore active markets and find a question you have insight on. Check the current market price — this is the crowd's current probability estimate.

### 3. Submit Your Prediction

Enter your probability estimate (1%–99%) and confirm the transaction. Your bond is attached automatically.

- **Bond** — a deposit that you put up with your prediction (typically 0.1 ETH)
- **Your prediction** — your honest probability estimate for the outcome

### 4. Wait for Resolution

The market resolves through the SKC mechanism's random stop. After each prediction, there's an α% chance the market stops. When it does, the last prediction becomes the reference truth.

### 5. Claim Your Payout

Once resolved, go back to the market and claim your payout.

- **Accurate prediction** → bond + scoring reward
- **Inaccurate prediction** → partial or full bond loss
- **Last predictor** → guaranteed bond + flat reward

## Tips

- **Be honest** — the math guarantees that truthful reporting maximizes your expected payout
- **Be informed** — the more insight you have, the more you can earn by moving the price toward truth
- **Bold moves pay more** — a large, correct price movement earns more than a small adjustment
- **Max loss = bond** — you can never lose more than your bond amount`,

  "markets/payouts": `# Payouts & Rewards

How Yiling markets calculate and distribute rewards.

## How Payouts Work

Your payout depends on how much your prediction moved the market price toward truth:

\`\`\`
payout = max(0, bond + b × [S(qFinal, priceAfter) - S(qFinal, priceBefore)])
\`\`\`

Where S is the cross-entropy scoring function. In simple terms:

- **You moved the price toward truth** → you earn a reward on top of your bond
- **You moved the price away from truth** → you lose part or all of your bond
- **You barely moved the price** → you get roughly your bond back

## Example: Profitable Prediction

\`\`\`
Market price before you: 50%
Your prediction: 75%
Final truth (qFinal): 80%

→ You moved the price toward truth (+25% in the right direction)
→ Payout: 0.1 ETH bond + 0.186 ETH reward = 0.286 ETH (+186% profit)
\`\`\`

## Example: Unprofitable Prediction

\`\`\`
Market price before you: 70%
Your prediction: 40%
Final truth (qFinal): 80%

→ You moved the price away from truth (-30% wrong direction)
→ Payout: 0 ETH (bond lost)
\`\`\`

## Last-K Predictors

The final k predictors (usually k=2) receive a guaranteed payout:

\`\`\`
payout = bond + flat reward (R)
\`\`\`

This incentivizes participation even in mature markets where the price is already near truth.

## Key Takeaways

| Rule | Detail |
|------|--------|
| Max loss | Your bond amount — never more |
| Max gain | Unlimited (proportional to accuracy) |
| Honesty pays | Truthful reporting is mathematically optimal |
| Bold pays more | Large correct moves > small adjustments |
| Late entry | Last k predictors always profit |`,

  // ── BUILD ON YILING ───────────────────────────────────────────────────

  "build/overview": `# Why Build on Yiling

Yiling Protocol is the same infrastructure we use for our own prediction markets. It's open for anyone to build on.

## What You Get

- **Oracle-free resolution** — no dependency on Chainlink, UMA, or any external oracle
- **Mathematically proven** — SKC mechanism based on [peer-reviewed Harvard research](https://arxiv.org/abs/2306.04305)
- **Battle-tested** — the same contracts power our live markets on Base and Monad
- **EVM-compatible** — deploy on any EVM chain
- **Permissionless** — no API keys, no approval needed

## What You Can Build

| Application | How Yiling Helps |
|-------------|-----------------|
| **Prediction Markets** | Self-resolving markets, no oracle needed |
| **DAO Governance** | Replace token voting with incentivized truth discovery |
| **Dispute Resolution** | Decentralized arbitration without trusted judges |
| **Data Labeling** | Incentivize honest labeling for AI training |
| **Subjective Oracles** | On-chain oracle for questions no data feed can answer |
| **Insurance** | Decentralized claims assessment |

## Architecture

Your application calls Yiling contracts to create markets and resolve questions. The contracts handle all the game theory, scoring, and payouts.

\`\`\`
┌─────────────────────┐
│    YOUR APP          │
│  (frontend / bot)    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   YILING CONTRACTS  │
│  createMarket()     │
│  predict()          │
│  claimPayout()      │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  Base/Monad │
    └─────────────┘
\`\`\`

## Gas Costs (Base)

| Function | Gas | Approx Cost |
|----------|-----|-------------|
| \`createMarket()\` | ~250,000 | < $0.01 |
| \`predict()\` | ~150,000–500,000 | < $0.01 |
| \`claimPayout()\` | ~80,000 | < $0.001 |`,

  "build/integration": `# Integration Guide

How to integrate Yiling Protocol into your application.

## Quick Start

### 1. Connect to the Contracts

\`\`\`javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
\`\`\`

### 2. Create a Market

\`\`\`javascript
const tx = await contract.createMarket(
  "Will ETH hit $10k by end of 2026?",  // question
  ethers.parseEther("0.2"),              // alpha (20% stop probability)
  2,                                      // k (last 2 get flat reward)
  ethers.parseEther("0.01"),             // flat reward
  ethers.parseEther("0.1"),              // bond amount
  ethers.parseEther("1.0"),              // liquidity param
  ethers.parseEther("0.5"),              // initial price (50%)
  { value: ethers.parseEther("1.0") }    // fund the market pool
);
\`\`\`

### 3. Submit a Prediction

\`\`\`javascript
await contract.predict(
  0,                                     // market ID
  ethers.parseEther("0.72"),             // 72% probability
  { value: ethers.parseEther("0.1") }    // bond
);
\`\`\`

### 4. Check Market Status & Claim

\`\`\`javascript
const info = await contract.getMarketInfo(0);
const payout = await contract.getPayoutAmount(0, myAddress);
await contract.claimPayout(0);
\`\`\`

## Using Foundry

\`\`\`bash
export CONTRACT=YOUR_CONTRACT_ADDRESS
export RPC=https://mainnet.base.org

# Read market count
cast call $CONTRACT "getMarketCount()" --rpc-url $RPC

# Submit prediction (72%)
cast send $CONTRACT "predict(uint256,uint256)" 0 720000000000000000 \\
  --value 0.1ether --private-key $KEY --rpc-url $RPC
\`\`\`

## Using web3.py

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)

count = contract.functions.getMarketCount().call()
info = contract.functions.getMarketInfo(0).call()
\`\`\`

## Integration Patterns

**Pattern 1: Direct Interaction** — Your frontend or bot calls Yiling contracts directly to create and participate in markets.

**Pattern 2: Embedded Resolution** — Your protocol uses Yiling as a resolution primitive. Your governance or dispute system calls the contracts to resolve questions.

**Pattern 3: AI Agents** — Build agents that participate in markets programmatically using any LLM or algorithm.`,

  "build/contracts": `# Contract Reference

Core contracts deployed on Base and Monad.

## Contract Overview

| Contract | Description |
|----------|-------------|
| \`PredictionMarket.sol\` | Core SKC logic — create markets, predict, resolve, claim |
| \`MarketFactory.sol\` | Factory for deploying isolated PredictionMarket instances |
| \`FixedPointMath.sol\` | Library for on-chain ln() and cross-entropy scoring |

## Market Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Alpha (α) | 20% | Stop probability per prediction |
| K | 2 | Last k predictors get flat reward |
| Flat Reward (R) | 0.01 ETH | Reward per last-k predictor |
| Bond | 0.1 ETH | Deposit per prediction |
| Liquidity (b) | 1.0 ETH | LMSR scaling parameter |
| Initial Price | 0.5 | Starting market price |

## Write Functions

### \`createMarket\`

\`\`\`solidity
function createMarket(
    string calldata question,
    uint256 alpha,
    uint256 k,
    uint256 flatReward,
    uint256 bondAmount,
    uint256 liquidityParam,
    uint256 initialPrice
) external payable returns (uint256 marketId)
\`\`\`

### \`predict\`

\`\`\`solidity
function predict(uint256 marketId, uint256 probability) external payable
\`\`\`

Submit a prediction with bond attached. One prediction per wallet per market.

### \`claimPayout\`

\`\`\`solidity
function claimPayout(uint256 marketId) external
\`\`\`

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
\`\`\`

## Alpha Tuning Guide

| Alpha | Avg Predictions | Best For |
|-------|----------------|----------|
| 10% | ~10 | Deep analysis, many participants |
| 20% | ~5 | Balanced (default) |
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
| Deployment | Centralized | Permissionless on Base |
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
                         │   BASE    │
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

  "networks/base": `# Base

Yiling is live on **Base** — Coinbase's Layer 2 network built on the OP Stack.

## Live Markets

Explore and participate in active prediction markets:

**→ [yilingmarket-onbase.vercel.app](https://yilingmarket-onbase.vercel.app/)** (Base & Monad)

## Why Base

| Feature | Benefit |
|---------|---------|
| **Low Gas Fees** | Predictions cost fractions of a cent |
| **Fast Finality** | ~2 second block times |
| **Ethereum Security** | Inherits L1 security through optimistic rollup |
| **EVM Compatible** | Full Solidity support |
| **Growing Ecosystem** | Part of the largest onchain economy |

## Network Details

| Property | Mainnet | Testnet (Sepolia) |
|----------|---------|-------------------|
| Chain ID | 8453 | 84532 |
| RPC | \`https://mainnet.base.org\` | \`https://sepolia.base.org\` |
| Explorer | [basescan.org](https://basescan.org) | [sepolia.basescan.org](https://sepolia.basescan.org) |
| Gas Token | ETH | ETH |

## Deployed Contracts

| Contract | Status | Explorer |
|----------|--------|----------|
| PredictionMarket | ✅ Live | [View on BaseScan](https://basescan.org) |
| MarketFactory | ✅ Live | [View on BaseScan](https://basescan.org) |`,

  "networks/monad": `# Monad

Yiling is expanding to **Monad** — a high-performance EVM-compatible L1 with parallel execution.

## Why Monad

| Feature | Benefit |
|---------|---------|
| **10,000 TPS** | Handle high-frequency prediction markets |
| **1s Finality** | Near-instant prediction confirmation |
| **EVM Compatible** | Same Solidity contracts, no modifications needed |
| **Parallel Execution** | Multiple markets can resolve simultaneously |
| **Low Fees** | Micro-bond markets become practical at scale |

## Status

Monad deployment is live. Markets are being onboarded.

## Same Contracts, Different Chain

Yiling's contracts are fully EVM-compatible. The same PredictionMarket, MarketFactory, and FixedPointMath contracts deployed on Base work on Monad without any modifications.`,

  // ── ROADMAP ──────────────────────────────────────────────────────────────

  "roadmap/coming-soon": `# Coming Soon

Yiling is live on Base and Monad. Here's what's next.

## Multi-Chain Expansion

| Chain | Status |
|-------|--------|
| **Base** | ✅ Live |
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
| REST API | HTTP endpoints for market data | Planned |
| WebSocket | Real-time market event streaming | Planned |
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
              <Image src="/logo.png" alt="Yiling Protocol" width={32} height={32} className="rounded-lg" />
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
