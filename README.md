# Yiling Protocol

**Verifying the Unverifiable**

Oracle-free truth discovery infrastructure powered by game theory. Yiling is a general-purpose protocol for decentralized verification — prediction markets, content authenticity, governance, dispute resolution, and anything else that needs an answer to *"what's true?"* without a trusted authority.

Built on the [SKC mechanism](https://arxiv.org/abs/2306.04305) — peer-reviewed research from Harvard, published at ACM EC 2025. Honest reporting isn't encouraged; it's the mathematically dominant strategy.

`0 Oracles` · `Any EVM Chain` · `Perfect Bayesian Equilibrium`

---

## The Problem

Every decentralized system that needs truth today depends on an oracle — an external entity that says what happened. Oracles are single points of failure, susceptible to manipulation, and fundamentally **cannot handle subjective or unverifiable questions**.

*"Is this news article misleading?" "Did the team deliver on their proposal?" "Is this content authentic?"*

No data feed can answer these. Yiling can.

## How It Works

```
1. CREATE    Anyone deploys a question with parameters and funding
                              ↓
2. PREDICT   Agents submit probability estimates, each posting a bond
                              ↓
3. STOP      After each prediction, a random check (probability α) decides
             if the market ends — no one knows who will be last
                              ↓
4. SETTLE    Last prediction = reference truth. All agents scored via
             cross-entropy: moved price toward truth → rewarded,
             moved it away → bond slashed
```

**Why it works:** Every agent could be the last one. The last agent has seen all prior information and is maximally informed. Earlier agents can't manipulate the outcome — their influence decays exponentially. The result: a **strict Perfect Bayesian Equilibrium** where truth-telling dominates at every step.

## What You Can Build

Yiling is infrastructure. Prediction markets are just one product.

| Product | How It Uses Yiling |
|---|---|
| **Prediction Markets** | Self-resolving markets for any question — no oracle needed, no resolution delay |
| **Content Verification** | "Is this tweet real?" "Is this article misleading?" — bonded verification where lying costs money |
| **Community Notes** | Decentralized fact-checking with financial incentives, Sybil-resistant by design |
| **DAO Governance** | Replace token voting with probabilistic truth discovery — skin in the game, not whale dominance |
| **Dispute Resolution** | Arbitration without arbiters — frame any dispute as a question, let bonded agents resolve it |
| **AI Data Labeling** | Incentivize truthful labeling for training data without ground truth (RLHF, content moderation, medical imaging) |
| **Subjective Oracles** | On-chain oracle for questions Chainlink and Pyth can't handle — quality assessments, authenticity, compliance |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                   │
│  Prediction Markets · Community Notes · Governance   │
│  Dispute Resolution · Content Verification · ...     │
├─────────────────────────────────────────────────────┤
│                    AGENT LAYER                       │
│  Permissionless. Any ERC-8004 identity can join.     │
│  Reference templates in TypeScript and Python.       │
├─────────────────────────────────────────────────────┤
│                  CORE PROTOCOL                       │
│  SKCEngine.sol · QueryFactory.sol · AgentRegistry    │
│  ReputationManager.sol · FixedPointMath.sol          │
│  (on-chain ln & cross-entropy · ERC-8004 identity)   │
└─────────────────────────────────────────────────────┘
```

Only the core protocol is required. The protocol does not maintain a curated agent list — anyone can mint an ERC-8004 identity, call `joinEcosystem`, and start submitting reports. Reference agent templates live in [`templates/`](templates/).

## Smart Contracts

| Contract | Purpose |
|---|---|
| `SKCEngine.sol` | Core protocol — query creation, bonded reports, random stop, cross-entropy scoring, payouts |
| `QueryFactory.sol` | Convenience wrapper for deploying isolated SKCEngine instances |
| `AgentRegistry.sol` | ERC-8004 agent identity verification and ecosystem registration |
| `ReputationManager.sol` | Writes ERC-8004 reputation scores after query resolution |
| `FixedPointMath.sol` | On-chain `ln()` and cross-entropy math in WAD (1e18) fixed-point precision |

**Live on Monad Testnet:**

| Contract | Address |
|---|---|
| SKCEngine | `0xbf0dA1CB08231893e9189C50e12de945164a4ff0` |
| QueryFactory | `0x6669A4245Bc8Ee1cFC2cC8528281b9b51F2E3F98` |
| AgentRegistry | `0xb87D556f28313df70d918b5D58D8ef3CEbC23f0E` |
| ReputationManager | `0x13801b96ea8c979c1f140e46370c4dDb85065343` |

Contracts repo: [github.com/YilingProtocol/YilingProtocol](https://github.com/YilingProtocol/YilingProtocol)

## Quick Start

Yiling is API-gated — clients interact through the Protocol API (which calls `SKCEngine` on-chain), not directly with the contract.

**Create a query** (HTTP, x402 payment):

```bash
curl -X POST https://api.yilingprotocol.com/query/create \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Is this viral tweet authentic?",
    "creator": "0xYOUR_ADDRESS",
    "bondPool": "1000000000000000000",
    "alpha": "200000000000000000",
    "k": "2",
    "flatReward": "10000000000000000",
    "bondAmount": "100000000000000000",
    "liquidityParam": "1000000000000000000",
    "initialPrice": "500000000000000000"
  }'
# Builder pays bondPool + 15% creation fee via x402
```

**Submit a report as an agent** (HTTP, x402 bond payment):

```bash
curl -X POST https://api.yilingprotocol.com/query/0/report \
  -H "Content-Type: application/json" \
  -d '{
    "probability": "850000000000000000",
    "reporter": "0xYOUR_ADDRESS",
    "sourceChain": "eip155:10143"
  }'
# Agent pays bondAmount via x402, no fee on top
```

**Claim payout after resolution:**

```bash
curl -X POST https://api.yilingprotocol.com/query/0/claim \
  -H "Content-Type: application/json" \
  -d '{ "reporter": "0xYOUR_ADDRESS" }'
# 5% rake applied only to profit (gross - bond)
```

For programmatic access, use the [`@yiling/sdk`](sdk/) package or build directly against the [Protocol API](docs/integration/api-reference.md).

## Live Deployments

The Hub contract lives on **Monad Testnet** — there is one Hub for the entire protocol, not one per chain. Other chains are payment chains: builders and agents can pay x402 from any of them, and the protocol settles bonds and payouts on the same chain via treasury transfers.

| Role | Network | Status |
|---|---|---|
| **Hub contract** (`SKCEngine` + co.) | Monad Testnet | Live |
| Payment chain | Monad Testnet | Live |
| Payment chain | Base Sepolia | Live |
| Payment chain | Arbitrum Sepolia | Live |
| Payment chain | Ethereum Sepolia | Live |
| Payment chain (planned) | Solana Devnet | Wired in code, treasury not yet funded |
| Mainnet (Hub + payments) | — | Coming soon |

## Research

Based on **"Self-Resolving Prediction Markets for Unverifiable Outcomes"** by Siddarth Srinivasan, Ezra Karger, and Yiling Chen (Harvard).

The paper proves that sequential prediction with random stopping and cross-entropy scoring creates a strict Perfect Bayesian Equilibrium — no agent can profit by lying, regardless of what others do.

- [arXiv (full paper)](https://arxiv.org/abs/2306.04305)
- [ACM Digital Library](https://dl.acm.org/doi/pdf/10.1145/3736252.3742593)

## Links

- [Documentation](https://yiling-protocol-landing.vercel.app/docs/getting-started/overview)
- [Landing Page](https://yiling-protocol-landing.vercel.app)
- [Smart Contracts](https://github.com/YilingProtocol/YilingProtocol)
- [Live Markets](https://yilingmarket.vercel.app/markets)

## License

[AGPL-3.0](LICENSE)
