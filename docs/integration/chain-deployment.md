# Chain-Agnostic Deployment

Yiling has two distinct chain dimensions, and they are not the same thing:

1. **Hub chain** — where `SKCEngine`, `QueryFactory`, `AgentRegistry`, and `ReputationManager` actually live. There is **one** Hub for any given Yiling deployment. The hosted protocol uses Monad Testnet (`eip155:10143`).
2. **Payment chains** — chains from which builders and agents can post their x402 payments. The Protocol API accepts payments from any chain its facilitator supports, and the bond/fee USDC is settled on that chain.

Most operators only need to think about #2 — choose which payment chains to enable on the Protocol API. You only need to follow #1 if you're spinning up an entirely separate Yiling instance.

## Adding a New Payment Chain

Payment chains are configured in two places in the API:

### 1. `api/src/services/x402.ts`

Register the chain with the x402 facilitator router. Pick the right facilitator (Coinbase CDP for mainnet EVM, Monad facilitator for Monad, or the public x402 facilitator as fallback).

```typescript
const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  // ...existing chains
  "eip155:421614": {
    name: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    facilitator: "cdp",  // or "monad" or "public"
  },
};
```

### 2. `api/src/services/payout.ts`

Add the chain to `TREASURY_CHAINS` so the API knows how to wire payouts back to agents on that chain:

```typescript
const TREASURY_CHAINS: Record<string, ChainTreasury> = {
  // ...existing chains
  "eip155:421614": {
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    chainName: "Arbitrum Sepolia",
  },
};
```

The treasury wallet (controlled by `TREASURY_PRIVATE_KEY`) must hold enough USDC on that chain to cover expected payouts.

### 3. Restart the API

Once both maps are updated and the treasury is funded, restart the API. New queries can now be paid for from the added chain, and agents can post bonds from it.

## Cross-Chain Bond Enforcement

The protocol enforces that an agent's bond chain matches the query's chain. When a builder creates a query and pays from `eip155:84532` (Base Sepolia), `SKCEngine.createQuery` records `queryChain = "eip155:84532"` and every subsequent `submitReport` must arrive with `sourceChain == "eip155:84532"`. The check lives in `SKCEngine.sol`:

```solidity
if (keccak256(bytes(sourceChain)) != keccak256(bytes(q.queryChain))) revert ChainMismatch();
```

This guarantees that all bonds for a given query sit in one chain's treasury, so payouts can be settled atomically without any cross-chain bridging.

## Deploying a Separate Hub Instance

If you want a fully isolated Yiling — your own contracts, your own treasury, your own protocol API — follow the [Contract Deployment guide](../contracts/deployment.md). You'll deploy the four contracts on your chosen chain, point a new Protocol API at them, and configure your own payment chain set.

Multiple isolated Hubs do not share state. They are independent protocol deployments that happen to implement the same SKC mechanism.

## Non-EVM Chains

For non-EVM chains (Solana, Sui, Aptos, etc.), the Solidity contracts need to be ported to the target chain's smart contract language. The core logic — SKC mechanism, cross-entropy scoring, random stop — is math-based and portable.

Porting checklist:
1. Implement `FixedPointMath` (`ln()` with fixed-point precision)
2. Implement the query state machine (create → report → resolve → claim)
3. Implement the scoring formula: `S(q, p) = q × ln(p) + (1-q) × ln(1-p)`
4. Implement random stop using block hash or equivalent randomness source
5. Implement an analog of `AgentRegistry`/`ReputationManager` if your chain has an identity standard

A non-EVM Hub can still be reached by EVM payment chains via x402 — only the Hub itself needs to live on the target chain.
