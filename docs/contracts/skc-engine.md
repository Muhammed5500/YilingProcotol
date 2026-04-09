# SKCEngine.sol

Core protocol contract implementing the SKC mechanism for oracle-free, self-resolving truth discovery queries.

## Overview

`SKCEngine.sol` is the on-chain heart of the protocol. It manages the entire query lifecycle:

1. Query creation with configurable parameters
2. Bond-tracked report submission
3. Probabilistic random stop (SKC mechanism)
4. Cross-entropy scoring and payout calculation
5. Reputation writes via `ReputationManager`

> **API-gated by default.** Core write functions (`createQuery`, `submitReport`, `recordPayoutClaim`, `forceResolve`) can only be called by the Protocol API address. The contract does not custody user funds — bonds are tracked by accounting and settled off-chain by the API treasury (Phase 1 custodial model). See the [API Reference](../integration/api-reference.md) for the HTTP endpoints clients actually use.

## Constants

| Name | Value | Description |
|------|-------|-------------|
| `WAD` | `1e18` | Fixed-point precision unit |
| `MIN_PROBABILITY` | `0.01e18` | Minimum prediction (1%) |
| `MAX_PROBABILITY` | `0.99e18` | Maximum prediction (99%) |
| `FORCE_RESOLVE_DELAY` | `2 days` | Delay before anyone can force-resolve |
| `LN2_WAD` | `693147180559945309` | ln(2) in WAD format (in `FixedPointMath`) |

## Core Write Functions (API-gated)

### `createQuery`

Create a new truth discovery query. Called by the Protocol API after the builder's x402 payment is verified.

```solidity
function createQuery(
    string calldata question,
    uint256 alpha,           // Stop probability (WAD). 0.2e18 = 20%
    uint256 k,               // Last k agents get flat reward
    uint256 flatReward,      // Flat reward R per last-k agent (USDC units)
    uint256 bondAmount,      // Required bond per report (USDC units)
    uint256 liquidityParam,  // LMSR scaling parameter b (USDC units)
    uint256 initialPrice,    // Initial price (WAD). 0.5e18 = 50%
    uint256 fundingAmount,   // Total query pool funding
    int128  minReputation,   // Minimum agent reputation (0 = no filter)
    string calldata reputationTag,  // ERC-8004 tag2 for reputation filtering
    address creator,         // Builder/creator address
    string calldata queryChain,     // CAIP-2 chain ID where bonds must be paid
    string calldata source           // Application identifier ("yiling-market", etc.)
) external onlyProtocolAPI returns (uint256 queryId)
```

**Requirements:**
- `0 < alpha < 1e18`
- `bondAmount > 0`
- `liquidityParam > 0`
- `MIN_PROBABILITY <= initialPrice <= MAX_PROBABILITY`
- `fundingAmount >= b·ln(2) + k·R` (SKC paper minimum funding theorem)

### `submitReport`

Record a bonded report. Called by the Protocol API after the agent's x402 bond payment is verified on the query's chain.

```solidity
function submitReport(
    uint256 queryId,
    uint256 probability,
    address reporter,
    uint256 bondAmount,
    string calldata sourceChain
) external onlyProtocolAPI
```

**Requirements:**
- Query must be active (not resolved)
- `MIN_PROBABILITY <= probability <= MAX_PROBABILITY`
- `sourceChain == query.queryChain` (reverts with `ChainMismatch`)
- `reporter` must be ERC-8004 registered (and meet `minReputation` if set)
- `reporter` has not already submitted a report for this query

**Side effect:** After each report, a random stop check runs (entropy from `blockhash`, `block.timestamp`, `block.prevrandao`). If `random < alpha`, the query resolves automatically and payouts are computed.

### `recordPayoutClaim`

Mark an agent's payout as claimed (called by the API when releasing the off-chain treasury transfer).

```solidity
function recordPayoutClaim(uint256 queryId, address reporter) external onlyProtocolAPI
```

### `forceResolve`

Force-resolve a query that hasn't stopped randomly.

```solidity
function forceResolve(uint256 queryId) external
```

**Access:** Owner can force-resolve anytime. Anyone can force-resolve after `FORCE_RESOLVE_DELAY` (2 days).

## Read Functions (open to all)

| Function | Returns | Description |
|----------|---------|-------------|
| `queryCount()` | `uint256` | Total number of queries created |
| `getQueryInfo(id)` | `(question, currentPrice, creator, resolved, totalPool, reportCount)` | Core query metadata |
| `getQueryParams(id)` | `(alpha, k, flatReward, bondAmount, liquidityParam, createdAt)` | Query SKC parameters |
| `getQuerySource(id)` | `string` | Application source tag |
| `getReport(id, index)` | `(agentId, reporter, probability, priceBefore, priceAfter, bond, sourceChain, timestamp)` | A specific report |
| `getReportCount(id)` | `uint256` | Number of reports in a query |
| `getPayoutAmount(id, addr)` | `uint256` | Gross payout owed to an address |
| `isQueryActive(id)` | `bool` | Whether query still accepts reports |
| `hasReported(id, addr)` | `bool` | Whether address has reported |
| `hasClaimed(id, addr)` | `bool` | Whether address has claimed |
| `apiGated()` | `bool` | Whether API gating is active |
| `protocolAPI()` | `address` | Current protocol API address |

## Owner Functions

| Function | Description |
|----------|-------------|
| `setProtocolAPI(address)` | Update the protocol API caller |
| `setAPIGated(bool)` | Enable/disable API gating (open mode for testing) |
| `setAgentRegistry(address)` | Update the AgentRegistry pointer |
| `setReputationManager(address)` | Update the ReputationManager pointer |
| `transferOwnership(address)` | Transfer contract ownership |

## Events

```solidity
event QueryCreated(
    uint256 indexed queryId,
    string question,
    uint256 alpha,
    uint256 initialPrice,
    address indexed creator
);

event ReportSubmitted(
    uint256 indexed queryId,
    uint256 indexed agentId,
    address indexed reporter,
    uint256 probability,
    uint256 priceBefore,
    uint256 reportIndex
);

event QueryResolved(
    uint256 indexed queryId,
    uint256 finalPrice,
    uint256 totalReports
);

event PayoutRecorded(
    uint256 indexed queryId,
    address indexed reporter,
    uint256 amount
);

event APIGateUpdated(bool gated);
event ProtocolAPIUpdated(address indexed oldAPI, address indexed newAPI);
```

## Resolution Logic

When the random stop triggers (or `forceResolve` is called):

1. `qFinal` = the last report's probability — this is treated as the reference truth
2. For each report `i`:
   - If `i >= reportCount - k`: `payout = bond + flatReward` (last-k flat reward)
   - Otherwise: `payout = max(0, bond + b × [S(qFinal, priceAfter) - S(qFinal, priceBefore)])`
   - Where `S(q, p) = q·ln(p) + (1-q)·ln(1-p)` (cross-entropy scoring)
3. If total payouts exceed `totalPool`, every payout is scaled by `totalPool / totalAllocated` (pro-rata)
4. After resolution, `ReputationManager.writeReputation()` is called for each scored agent
5. The 5% settlement rake (profit only) is applied at claim time by the API, not on-chain

See [scoring.md](../reference/scoring.md) for worked examples.

## Live Deployment (Monad Testnet)

| Parameter | Value |
|---|---|
| Chain | Monad Testnet (`eip155:10143`) |
| RPC | `https://testnet-rpc.monad.xyz` |
| SKCEngine | `0xbf0dA1CB08231893e9189C50e12de945164a4ff0` |
| QueryFactory | `0x6669A4245Bc8Ee1cFC2cC8528281b9b51F2E3F98` |
| AgentRegistry | `0xb87D556f28313df70d918b5D58D8ef3CEbC23f0E` |
| ReputationManager | `0x13801b96ea8c979c1f140e46370c4dDb85065343` |
