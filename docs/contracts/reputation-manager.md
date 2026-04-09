# ReputationManager.sol

ERC-8004 reputation gateway. Writes SKC accuracy scores after queries resolve and exposes reputation queries used by the protocol's `minReputation` filter.

## Overview

`ReputationManager` is a thin wrapper over the ERC-8004 Reputation Registry. It is the only authorized writer of `tag1 = "skc_accuracy"` feedback for Yiling-resolved queries. After each query resolves, the protocol writes a per-agent score derived from the cross-entropy delta. Builders can require a minimum reputation when creating queries.

## Constants

| Name | Value | Description |
|------|-------|-------------|
| `VALUE_DECIMALS` | `2` | Scores stored with 2 decimal places (e.g. `120` = `1.20`) |
| `DEFAULT_TAG1` | `"skc_accuracy"` | Always-present primary tag for protocol-written scores |

## Constructor

```solidity
constructor(address _reputationRegistry)
```

`_reputationRegistry` is the deployed ERC-8004 Reputation Registry on the same chain.

## Core Function

### `writeReputation`

```solidity
function writeReputation(
    uint256 agentId,
    int128  score,
    string calldata tag2
) external onlyAuthorized
```

**Access:** Only addresses in `authorizedCallers` (typically `SKCEngine`).

**Parameters:**
- `agentId` — ERC-8004 token ID
- `score` — cross-entropy-derived score in `int128`. Range: roughly `-10000` to `+10000` (i.e. `-100.00` to `+100.00` after applying `VALUE_DECIMALS = 2`).
- `tag2` — application-specific tag (e.g. `"governance"`, `"dispute"`, `"labeling"`). Empty string for general use.

Calls `IERC8004Reputation.giveFeedback` with the standard tag layout: `(tag1 = "skc_accuracy", tag2 = caller-supplied)`.

## View Functions

### `getAgentReputation`

```solidity
function getAgentReputation(uint256 agentId)
    external view
    returns (uint64 count, int128 value, uint8 decimals)
```

Returns the agent's aggregated `skc_accuracy` reputation across all `tag2` values.

### `getAgentReputationByTag`

```solidity
function getAgentReputationByTag(uint256 agentId, string calldata tag2)
    external view
    returns (uint64 count, int128 value, uint8 decimals)
```

Returns the agent's reputation for a specific application context.

### `isAgentEligible`

```solidity
function isAgentEligible(
    uint256 agentId,
    int128  minReputation,
    string calldata tag2
) external view returns (bool eligible)
```

Used by `SKCEngine.submitReport` to enforce per-query reputation gates.

**Special case:** Agents with no feedback (`count == 0`) are eligible if and only if `minReputation <= 0`. This lets new agents participate in open queries while still letting builders gate sensitive markets.

## Owner Functions

| Function | Description |
|----------|-------------|
| `authorizeCaller(address)` | Allow an address (e.g. SKCEngine) to write reputation |
| `revokeCaller(address)` | Revoke a writer |
| `setReputationRegistry(address)` | Update the ERC-8004 Reputation Registry pointer |
| `transferOwnership(address)` | Transfer ownership |

## Events

```solidity
event ReputationUpdated(
    uint256 indexed agentId,
    int128 score,
    string tag1,
    string tag2
);
event CallerAuthorized(address indexed caller);
event CallerRevoked(address indexed caller);
event ReputationRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
```

## How Scores Are Computed

After resolution, `SKCEngine` computes each scored agent's cross-entropy delta `Δ = S(qFinal, priceAfter) - S(qFinal, priceBefore)` and writes:

```
score = int128(Δ * 10000 / WAD)   // 2-decimal int128
```

Positive scores mean the agent moved the market toward truth; negative scores mean they moved it away. Last-k flat-reward agents are not scored (their `Δ` is undefined since their report becomes the truth).

## Live Deployment

| Network | Address |
|---|---|
| Monad Testnet (`eip155:10143`) | `0x13801b96ea8c979c1f140e46370c4dDb85065343` |
