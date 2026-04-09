# QueryFactory.sol

Convenience wrapper around `SKCEngine` for creating queries and tracking active/per-creator query lists on-chain.

## Overview

`QueryFactory` does **not** deploy new SKCEngine instances. It is a thin proxy that:

1. Forwards `createQuery` calls to a single shared `SKCEngine`
2. Maintains an on-chain registry of active queries (`getActiveQueries`)
3. Maintains a per-creator query index (`getQueriesByCreator`)

Both the factory and the underlying engine are API-gated by default — only the Protocol API can create queries.

## Constructor

```solidity
constructor(address _skcEngine, address _protocolAPI)
```

The factory is bound to one `SKCEngine` instance. Ownership is set to `msg.sender`, API gating is enabled by default.

## Core Function

### `createQuery`

```solidity
function createQuery(
    string calldata question,
    uint256 alpha,
    uint256 k,
    uint256 flatReward,
    uint256 bondAmount,
    uint256 liquidityParam,
    uint256 initialPrice,
    uint256 fundingAmount,
    int128  minReputation,
    string calldata reputationTag,
    address creator,
    string calldata queryChain,
    string calldata source
) external onlyProtocolAPI returns (uint256 queryId)
```

Forwards the call to `SKCEngine.createQuery`, then:
- Pushes `queryId` into `_creatorQueries[creator]`
- Adds it to the active query list
- Emits `QueryDeployed(queryId, creator, question)`

See [SKCEngine docs](./skc-engine.md) for parameter semantics and validation.

### `markResolved`

```solidity
function markResolved(uint256 queryId) external
```

Removes the query from the active list. Permissionless — anyone can call it once `SKCEngine` reports the query as resolved. Uses swap-and-pop for O(1) removal.

## View Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getQueryCount()` | `uint256` | Total queries created (delegated to `SKCEngine.queryCount`) |
| `getActiveQueries()` | `uint256[]` | All currently-active query IDs |
| `getQueriesByCreator(addr)` | `uint256[]` | Query IDs created by a given address |
| `isActive(queryId)` | `bool` | Whether a query is in the active set |

## Owner Functions

| Function | Description |
|----------|-------------|
| `setSKCEngine(address)` | Repoint to a new SKCEngine |
| `setProtocolAPI(address)` | Update the API caller |
| `setAPIGated(bool)` | Toggle API gating |
| `transferOwnership(address)` | Transfer ownership |

## Events

```solidity
event QueryDeployed(
    uint256 indexed queryId,
    address indexed creator,
    string question
);
```

## When to Use This

- **Direct integration:** Most clients should call `POST /query/create` on the [Protocol API](../integration/api-reference.md), which routes through `QueryFactory` internally.
- **Reading active queries on-chain:** Indexers and read-only clients can use `getActiveQueries()` to enumerate live queries without calling the API.
- **Per-creator history:** UIs can use `getQueriesByCreator(addr)` to show "queries I've created."

## Live Deployment

| Network | Address |
|---|---|
| Monad Testnet (`eip155:10143`) | `0x6669A4245Bc8Ee1cFC2cC8528281b9b51F2E3F98` |
