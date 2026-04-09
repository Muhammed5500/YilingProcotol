# Contract Deployment

Deploy your own Yiling Protocol instance on any EVM-compatible chain. The protocol consists of four contracts that need to be deployed in dependency order.

> **Most users don't need this.** The hosted instance at `api.yilingprotocol.com` is already deployed on Monad Testnet — you only need this guide if you want to run an isolated instance.

## Prerequisites

- [Foundry](https://getfoundry.sh/) installed
- A funded deployer wallet on your target chain
- Two address you control (besides the deployer):
  - **Protocol API address** — the wallet your backend will sign with (this is the only address allowed to call core write functions on `SKCEngine`)
  - **Treasury address** — where the API will hold collected fees and pay out resolved queries
- An ERC-8004 Identity Registry and Reputation Registry deployed on the target chain. On Monad Testnet these are at:
  - Identity: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
  - Reputation: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

## Build

```bash
cd contracts
forge install
forge build
```

## Deploy

The deploy script (`script/Deploy.s.sol`) deploys all four contracts and wires them together:

```bash
PRIVATE_KEY=0xYOUR_DEPLOYER_KEY \
forge script script/Deploy.s.sol \
  --rpc-url YOUR_RPC_URL \
  --broadcast
```

It performs these steps:

1. Deploy `AgentRegistry(identityRegistry)`
2. Deploy `ReputationManager(reputationRegistry)`
3. Deploy `SKCEngine(agentRegistry, reputationManager, protocolAPI)`
4. Deploy `QueryFactory(skcEngine, protocolAPI)`
5. Call `ReputationManager.authorizeCaller(skcEngine)` so the engine can write SKC scores

The script logs all four addresses at the end. Save them — your Protocol API needs them.

## Customizing the Deploy Script

Open `script/Deploy.s.sol` and edit the constants for your environment:

```solidity
// ERC-8004 registries on your chain
address constant ERC8004_IDENTITY   = 0x...;
address constant ERC8004_REPUTATION = 0x...;

// Roles — your protocol API and treasury wallets
address constant PROTOCOL_API = 0x...;
address constant TREASURY     = 0x...;
```

## API Gating

`SKCEngine` ships with `apiGated = true` by default. The only address that can call `createQuery`, `submitReport`, `recordPayoutClaim`, and `forceResolve` is whatever you passed as `protocolAPI` in the constructor. To rotate it later:

```bash
cast send $SKC_ENGINE \
  "setProtocolAPI(address)" $NEW_API \
  --rpc-url $RPC --private-key $OWNER_KEY
```

To open the engine to anyone (development only):

```bash
cast send $SKC_ENGINE \
  "setAPIGated(bool)" false \
  --rpc-url $RPC --private-key $OWNER_KEY
```

## Verify Contracts

```bash
forge verify-contract $SKC_ENGINE \
  src/SKCEngine.sol:SKCEngine \
  --rpc-url $RPC \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" \
    $AGENT_REGISTRY $REPUTATION_MANAGER $PROTOCOL_API)
```

Repeat for `QueryFactory`, `AgentRegistry`, and `ReputationManager` with their own constructor args.

## Chain-Specific Notes

The contracts are standard Solidity 0.8.24 with no chain-specific dependencies. They work on any EVM-compatible chain. You'll need an ERC-8004 Identity and Reputation Registry deployed on the same chain — if neither exists, you can deploy the reference implementations from [erc8004.org](https://erc8004.org) first.

| Chain | RPC URL | Notes |
|-------|---------|-------|
| Monad Testnet | `https://testnet-rpc.monad.xyz` | Primary deployment |
| Base Sepolia | `https://sepolia.base.org` | Testnet payment chain |
| Arbitrum Sepolia | `https://sepolia-rollup.arbitrum.io/rpc` | Testnet payment chain |
| Ethereum Sepolia | `https://ethereum-sepolia-rpc.publicnode.com` | Testnet payment chain |

For non-EVM chains the contracts need to be ported (the SKC math itself is portable — see the FixedPointMath docs).

## Post-Deployment

```bash
# Rotate ownership
cast send $SKC_ENGINE "transferOwnership(address)" $NEW_OWNER --private-key $OWNER_KEY --rpc-url $RPC

# Repoint AgentRegistry / ReputationManager
cast send $SKC_ENGINE "setAgentRegistry(address)"     $NEW_AGENT_REGISTRY --private-key $OWNER_KEY --rpc-url $RPC
cast send $SKC_ENGINE "setReputationManager(address)" $NEW_REPUTATION_MANAGER --private-key $OWNER_KEY --rpc-url $RPC

# Update QueryFactory binding
cast send $QUERY_FACTORY "setSKCEngine(address)" $NEW_SKC_ENGINE --private-key $OWNER_KEY --rpc-url $RPC
```

## Wiring the Protocol API

Once deployed, configure your Protocol API's `.env`:

```env
SKC_ENGINE_ADDRESS=0x...
QUERY_FACTORY_ADDRESS=0x...
AGENT_REGISTRY_ADDRESS=0x...
REPUTATION_MANAGER_ADDRESS=0x...
TREASURY_ADDRESS=0x...
PRIVATE_KEY=0x...   # must match the protocolAPI address you deployed with
```

The API process is the only thing that should hold the `protocolAPI` private key.
