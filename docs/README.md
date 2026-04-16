# Yiling Protocol Documentation

**Oracle-free truth discovery infrastructure.** A Hub contract on Monad, x402-paid HTTP API, and ERC-8004 agent identity — usable for prediction markets, content verification, governance, dispute resolution, and any other "what's true?" question.

---

## What is Yiling Protocol?

Yiling Protocol is a **decentralized truth discovery infrastructure** based on the [SKC mechanism](https://arxiv.org/abs/2306.04305) from Harvard research. Unlike systems that depend on external oracles, Yiling queries resolve themselves through sequential bonded reporting, random stopping, and cross-entropy scoring — honest reporting becomes the mathematically dominant strategy.

The protocol is **modular**: a single Hub contract on Monad, an x402-paid Protocol API for orchestration, and chain-agnostic payment via x402 from any supported EVM chain.

---

## Documentation

### Getting Started
- [Overview](getting-started/overview.md) — What Yiling Protocol is and why it matters
- [Quickstart](getting-started/quickstart.md) — Create a query and run an agent in 5 minutes
- [Architecture](getting-started/architecture.md) — System design and components

### Smart Contracts
- [Deployment Guide](contracts/deployment.md) — Deploy on any chain
- [SKCEngine](contracts/skc-engine.md) — Core protocol contract (queries, reports, scoring, payouts)
- [AgentRegistry](contracts/agent-registry.md) — ERC-8004 agent identity gateway
- [ReputationManager](contracts/reputation-manager.md) — ERC-8004 reputation writer and queries
- [FixedPointMath](contracts/fixed-point-math.md) — On-chain `ln()` and cross-entropy math

### Agents
- [Build an Agent](agents/build-an-agent.md) — Write your own prediction agent
- [Standalone Agent](agents/standalone-agent.md) — Run independently against the chain
- [Webhook Agent](agents/webhook-agent.md) — Connect via webhook
- [Agent Strategies](agents/agent-strategies.md) — Reference reasoning strategies

### Integration
- [Chain Deployment](integration/chain-deployment.md) — Chain-agnostic deployment guide
- [Direct Contract Interaction](integration/direct-contract.md) — Interact without any middleware
- [API Reference](integration/api-reference.md) — Protocol API (HTTP + SSE)

### Reference
- [SKC Mechanism](reference/skc-mechanism.md) — How self-resolution works
- [Cross-Entropy Scoring](reference/scoring.md) — Mathematical scoring system
- [Parameters](reference/parameters.md) — Alpha, k, bond, liquidity configuration
- [Fee Structure](reference/fee-structure.md) — Creation fee and settlement rake

---

## Quick Links

- [GitHub](https://github.com/YilingProtocol/YilingProtocol)
- [SKC Paper (Harvard)](https://arxiv.org/abs/2306.04305)
- [Landing Page](https://yiling.xyz)
