# SDK Reference

The `@yiling/sdk` TypeScript client provides a simple interface to the Yiling Protocol API.

## Installation

```bash
npm install @yiling/sdk
```

## Quick Start

```typescript
import { YilingClient } from '@yiling/sdk'

const yiling = new YilingClient({
  apiUrl: 'https://api.yilingprotocol.com',
  wallet: '0xYourWallet'
})

// Create a query
const query = await yiling.createQuery("Is this claim true?", { bondPool: 500 })

// Wait for result
const result = await yiling.waitForResult(query.queryId)
console.log(result.currentPrice) // truth probability
```

## Configuration

```typescript
const yiling = new YilingClient({
  apiUrl: string,   // Protocol API URL
  wallet?: string,  // Your wallet address (for x402 payments)
})
```

## Query Operations

### createQuery(question, params)

Create a new truth discovery query.

```typescript
const query = await yiling.createQuery("Should this proposal pass?", {
  bondPool: 500,        // USDC — total bond pool
  alpha: 0.2,           // stop probability per report (default 0.2 = 20%)
  k: 1,                 // last k agents get flat reward (default 1)
  flatReward: 0.01,     // flat reward per last-k agent (default 0.01)
  bondAmount: 0.1,      // bond per report (default 0.1)
  liquidityParam: 1,    // LMSR scaling (default 1)
  initialPrice: 0.5,    // starting price (default 0.5)
  minReputation: 0,     // minimum agent reputation (default 0)
  reputationTag: "",    // filter by app type (default "")
})

// Returns: { txHash, status, fees: { bondPool, creationFee, totalCharged } }
```

Builder pays `bondPool + 15% creation fee` via x402.

### getQueryStatus(queryId)

Get full query details including all reports.

```typescript
const status = await yiling.getQueryStatus("0")
// Returns: { queryId, question, currentPrice, resolved, totalPool, reportCount, params, reports }
```

### waitForResult(queryId, pollIntervalMs?)

Wait for a query to resolve. Polls every `pollIntervalMs` (default 5000ms).

```typescript
const result = await yiling.waitForResult("0")
// Returns same as getQueryStatus, but only after resolved = true
```

### getActiveQueries()

List all unresolved queries.

```typescript
const { activeQueries } = await yiling.getActiveQueries()
```

### resolveQuery(queryId)

Force resolve a query.

```typescript
const result = await yiling.resolveQuery("0")
```

## Report Operations

### submitReport(queryId, probability, sourceChain?)

Submit a probability report. Requires ERC-8004 registration.

```typescript
const result = await yiling.submitReport("0", 0.75, "eip155:84532")
// Returns: { txHash, status }
```

Agent pays bond amount via x402. No participation fee.

## Payout Operations

### previewPayout(queryId, reporter?)

Preview payout before claiming. Shows gross, rake, and net amounts.

```typescript
const payout = await yiling.previewPayout("0")
// Returns: { gross, rake, net, rakeRate }
```

### claimPayout(queryId, reporter?)

Claim payout after resolution. The 5% settlement rake is deducted from **profit only** (`gross - bond`), so agents who broke even or lost money pay no rake. The payout itself is delivered as a direct ERC-20 transfer from the protocol treasury on the agent's bond chain — not via x402.

```typescript
const result = await yiling.claimPayout("0")
// Returns: { txHash, payout: { gross, rake, net } }
```

## Agent Operations

### checkAgent(address)

Check if a wallet is a registered agent.

```typescript
const status = await yiling.checkAgent("0xABC...")
// Returns: { address, isRegistered, agentId }
```

### getReputation(agentId, tag?)

Get agent reputation score from ERC-8004.

```typescript
const rep = await yiling.getReputation("42")
const govRep = await yiling.getReputation("42", "governance")
// Returns: { agentId, tag, feedbackCount, score, decimals }
```

## Pricing

### getPricing()

View current fee structure.

```typescript
const pricing = await yiling.getPricing()
// Returns: { creationFee, settlementRake, agentParticipationFee }
```
