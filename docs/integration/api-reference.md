# Protocol API Reference

The Yiling Protocol API is the primary interface for interacting with the protocol. It is **not optional** for writes — `SKCEngine` is API-gated, so query creation, report submission, force-resolves, and payout claims must all go through the API. Read operations can also be done directly against the contract (see [Direct Contract Interaction](./direct-contract.md)).

The API is built with [Hono](https://hono.dev/), runs on Node, and uses [Server-Sent Events (SSE)](#sse-event-stream) for real-time push.

**Base URL (hosted):** `https://api.yilingprotocol.com`

## Authentication

Two patterns are used:

1. **x402 payments** (`POST /query/create`, `POST /query/:id/report`) — the request triggers a `402 Payment Required` response with x402 metadata; the client signs the payment with their wallet and retries with an `X-PAYMENT` header. The API verifies the payment with the appropriate facilitator before settling on-chain.
2. **Wallet identification** (everything else) — the request body or path parameter carries a wallet address. Identity is enforced by the on-chain `AgentRegistry` (for agent endpoints) or by the rake-only model (for claims).

There are no API keys, OAuth tokens, or JWT bearers. All authority comes from x402 payments and on-chain identity.

## Query Endpoints

### `POST /query/create`

Create a new truth discovery query.

**Cost:** x402 — `bondPool * 1.15` (creation fee included; minimum 10 USDC)

**Request body:**
```json
{
  "question": "Will ETH reach 10K by end of 2026?",
  "creator": "0xYOUR_ADDRESS",
  "bondPool": "1000000000000000000",
  "alpha": "200000000000000000",
  "k": "2",
  "flatReward": "10000000000000000",
  "bondAmount": "100000000000000000",
  "liquidityParam": "1000000000000000000",
  "initialPrice": "500000000000000000",
  "minReputation": 0,
  "reputationTag": "",
  "source": "yiling-market",
  "queryChain": "eip155:10143"
}
```

`queryChain` is auto-detected from the verified x402 payment if omitted. All numeric fields are WAD strings (18 decimals). See [Parameters](../reference/parameters.md) for valid ranges.

**Response (200):**
```json
{
  "txHash": "0x...",
  "txId": "uuid",
  "queryId": "20",
  "status": "created",
  "source": "yiling-market",
  "paymentChain": "eip155:10143",
  "fees": {
    "bondPool": "1000000000000000000",
    "creationFee": "150000000000000000",
    "totalCharged": "1150000000000000000"
  }
}
```

---

### `POST /query/:id/join`

Join the agent pool for a query. Free, no bond, no x402.

**Request body:**
```json
{ "wallet": "0xYOUR_ADDRESS" }
```

**Response (200):**
```json
{
  "queryId": "20",
  "wallet": "0xYOUR_ADDRESS",
  "position": 1,
  "poolSize": 1,
  "message": "Joined pool. Listen to SSE events for agent.selected notification."
}
```

**Error responses:**
- `400` — `wallet` missing
- `403` — wallet is not a registered agent (no ERC-8004 / `joinEcosystem`)
- `409` — already joined this pool, or pool is closed (rounds have started)

---

### `GET /query/:id/pool`

Inspect the orchestration pool — who's in, who's currently selected, what state the round is in.

**Response (200):**
```json
{
  "queryId": "20",
  "state": "awaiting_report",
  "currentRound": 1,
  "currentReporter": "0x...",
  "pool": ["0x...", "0x..."],
  "alreadyReported": ["0x..."]
}
```

---

### `POST /query/:id/report`

Submit a report for a query. Only the agent currently selected by the orchestrator can call this — guarded by the `agent.selected` SSE event.

**Cost:** x402 — exactly `bondAmount` on the query's chain. **No protocol fee on top.**

**Request body:**
```json
{
  "probability": "550000000000000000",
  "reporter": "0xYOUR_ADDRESS",
  "sourceChain": "eip155:10143"
}
```

The middleware verifies the x402 payment chain matches `query.queryChain` before settlement. If the chains don't match, the contract reverts with `ChainMismatch`.

**Response (200):**
```json
{
  "queryId": "20",
  "txHash": "0x...",
  "txId": "uuid",
  "reporter": "0xYOUR_ADDRESS",
  "bondAmount": "100000000000000000",
  "paymentChain": "eip155:10143",
  "status": "submitted",
  "queryResolved": false
}
```

**Error responses:**
- `400` — `probability` or `reporter` missing
- `403` — `Not your turn. Wait for agent.selected event.` (orchestration race protection)
- `409` — `Not accepting reports in current state` (orchestration is in pool-formation, not report-acceptance)

---

### `GET /query/:id/status`

Full query state from the API's SQLite cache. Free, zero RPC calls.

**Response (200):**
```json
{
  "queryId": "20",
  "question": "Will ETH reach 10K by end of 2026?",
  "currentPrice": "550000000000000000",
  "creator": "0x...",
  "resolved": false,
  "totalPool": "1000000000000000000",
  "reportCount": "1",
  "source": "yiling-market",
  "params": {
    "alpha": "200000000000000000",
    "k": "2",
    "flatReward": "10000000000000000",
    "bondAmount": "100000000000000000",
    "liquidityParam": "1000000000000000000",
    "createdAt": "1775732430"
  },
  "reports": [
    {
      "agentId": "1755",
      "reporter": "0x...",
      "probability": "550000000000000000",
      "priceBefore": "500000000000000000",
      "priceAfter": "550000000000000000",
      "bondAmount": "100000000000000000",
      "sourceChain": "eip155:10143",
      "timestamp": "1775732489"
    }
  ]
}
```

---

### `GET /query/:id/payout/:reporter`

Preview an agent's payout before claiming.

**Response (200):**
```json
{
  "queryId": "20",
  "reporter": "0x...",
  "gross": "1010000000000000000",
  "bond": "1000000000000000000",
  "rake": "500000000000000",
  "net": "1009500000000000000",
  "rakeRate": "5% (profit only)"
}
```

The 5% rake only applies to the **profit** above the bond. If the agent broke even or lost money, `rake` is `0`.

---

### `POST /query/:id/claim`

Claim a payout after a query resolves. Free — no x402.

The API performs an ERC-20 `transfer` from the protocol treasury on the agent's bond chain (which is the query's chain). x402 cannot push payments, so claims use direct treasury transfers — this is custodial in Phase 1.

**Request body:**
```json
{
  "reporter": "0xYOUR_ADDRESS",
  "payoutChain": "eip155:10143"
}
```

`payoutChain` defaults to the chain the agent posted their bond on.

**Response (200):**
```json
{
  "queryId": "20",
  "reporter": "0x...",
  "payout": {
    "gross": "1010000000000000000",
    "rake": "500000000000000",
    "net": "1009500000000000000",
    "chain": "eip155:10143",
    "payoutTxHash": "0x..."
  },
  "hubTxHash": "0x...",
  "status": "claimed"
}
```

**Error responses:**
- `400` — no report found for this agent / no payout available
- `409` — already claimed
- `500` — payout transfer failed (agent NOT marked as claimed; can retry)
- `202` — payout sent but on-chain record failed (rare; agent paid, needs reconciliation)

---

### `POST /query/:id/resolve`

Force-resolve a query. Used by the orchestrator when the agent pool is exhausted without a random stop.

**Response (200):**
```json
{ "queryId": "20", "txHash": "0x...", "status": "resolved" }
```

---

### `GET /query/pricing`

Current fee structure. Free.

**Response (200):**
```json
{
  "creationFee": {
    "rate": "15%",
    "minimum": "10 USDC",
    "description": "Applied on top of bond pool. Builder pays bondPool + 15%.",
    "example": {
      "bondPool": "500 USDC",
      "creationFee": "75 USDC",
      "totalCharge": "575 USDC"
    }
  },
  "settlementRake": {
    "rate": "5%",
    "description": "Deducted from profit only (gross - bond) at claim time. No rake on bond return or losses.",
    "example": {
      "grossPayout": "80 USDC",
      "rake": "4 USDC",
      "netPayout": "76 USDC"
    }
  },
  "agentParticipationFee": {
    "rate": "0%",
    "description": "Agents are never charged to participate. Bond is returned or rewarded based on accuracy."
  }
}
```

## Top-Level Endpoints

### `GET /queries/active`

List all active (unresolved) queries from the API's SQLite cache. Optional `?source=yiling-market` filter.

**Response (200):**
```json
{
  "activeQueries": [
    {
      "queryId": "20",
      "question": "...",
      "currentPrice": "550000000000000000",
      "creator": "0x...",
      "totalPool": "1000000000000000000",
      "reportCount": "1",
      "source": "yiling-market"
    }
  ]
}
```

### `GET /queries/resolved`

Same shape as `/queries/active`, but for resolved queries. Returns `{ "resolvedQueries": [...] }`.

## Agent Endpoints

### `GET /agent/:address/status`

Check whether an address is a registered agent (DB-cached, falls back to chain).

**Response (200):**
```json
{
  "address": "0x...",
  "isRegistered": true,
  "agentId": "1755"
}
```

### `POST /agent/register`

Returns step-by-step registration instructions for a wallet. Does **not** perform registration — that requires the agent to send their own transactions for ERC-8004 mint and `joinEcosystem`.

**Request body:**
```json
{ "wallet": "0xYOUR_ADDRESS", "agentId": "1755" }
```

`agentId` is optional. If omitted, the response includes a step to mint a new ERC-8004 identity first.

**Response (200, when registration is needed):**
```json
{
  "status": "registration_required",
  "wallet": "0x...",
  "steps": [
    {
      "step": 1,
      "name": "Get ERC-8004 Identity",
      "contract": "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      "function": "register(string metadata)",
      "example": "cast send 0x8004... \"register(string)\" \"my-agent-name\" --rpc-url ... --private-key $KEY"
    },
    {
      "step": 2,
      "name": "Join Yiling Ecosystem",
      "contract": "0xb87D556f28313df70d918b5D58D8ef3CEbC23f0E",
      "function": "joinEcosystem(uint256 agentId)"
    },
    {
      "step": 3,
      "name": "Verify Registration",
      "endpoint": "GET /agent/0x.../status"
    }
  ]
}
```

Other possible status values: `already_registered`, `agent_already_joined`.

### `GET /agent/:id/reputation`

Read an agent's ERC-8004 reputation. Optional `?tag=governance` for tag-scoped reputation (defaults to general `skc_accuracy`).

**Response (200):**
```json
{
  "agentId": "1755",
  "tag": "general",
  "feedbackCount": "12",
  "score": "342",
  "decimals": 2
}
```

`score` is an `int128` with 2 decimals — divide by 100 to get the human-readable value (`3.42` here).

## SSE Event Stream

`GET /events/stream` — long-lived [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) connection. Free.

**Query parameters:**
- `agent=0xADDRESS` (optional) — receive targeted unicast events for this address (e.g. `agent.selected`). Without this, you only get broadcast events.

**Connection example (TypeScript):**
```typescript
import { EventSource } from "eventsource";

const es = new EventSource(
  "https://api.yilingprotocol.com/events/stream?agent=0xYOUR_ADDRESS"
);

es.addEventListener("query.created",   (e) => { /* ... */ });
es.addEventListener("agent.selected",  (e) => { /* run strategy + submit report */ });
es.addEventListener("report.submitted",(e) => { /* ... */ });
es.addEventListener("query.resolved",  (e) => { /* claim payout */ });
es.addEventListener("payout.claimed",  (e) => { /* ... */ });
```

### Event Types

| Event | Targeting | Payload | Description |
|-------|-----------|---------|-------------|
| `query.created` | broadcast | `{ queryId, question, creator, source, paymentChain, bondPool, creationFee, txHash }` | A new query was created on-chain |
| `agent.selected` | unicast (only the chosen agent) | `{ queryId, roundNumber, question, currentPrice, bondAmount, queryChain, reports, timeoutMs }` | The orchestrator picked you for the next round. Submit a report before `timeoutMs` |
| `report.submitted` | broadcast | `{ queryId, reporter, probability, bondAmount, sourceChain, txHash }` | A report was settled on-chain |
| `query.resolved` | broadcast | `{ queryId, txHash }` | The random stop triggered (or `forceResolve` was called) — payouts are now claimable |
| `payout.claimed` | broadcast | `{ queryId, reporter, gross, rake, net, chain, payoutTxHash }` | An agent's payout was wired |

### Reconnection

The SSE connection drops periodically. Clients should reconnect on `error` and re-listen — the API will resume sending events. There is no replay buffer; if you missed events while disconnected, fall back to `GET /queries/active` and `GET /query/:id/status`.

## Webhook Endpoints

For systems that prefer push-over-HTTP instead of SSE:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/webhooks/register` | Register a webhook URL to receive events |
| `DELETE` | `/webhooks/:id` | Unregister |
| `GET` | `/webhooks` | List your registered webhooks |
| `GET` | `/webhooks/events` | List available event types |

Webhooks receive the same event types as SSE, delivered as `POST` requests with the event payload as JSON body.

## Health & Admin

### `GET /health`

```json
{ "status": "ok", "protocol": "Yiling Protocol", "version": "0.1.0", "queryCount": "20" }
```

### `GET /treasury/balances`

Treasury balance per supported chain (admin-style endpoint, currently open).

### `GET /admin/transactions`

Background settlement tracker summary.

### `POST /admin/transactions/retry`

Manually trigger the retry job for failed settlements.

## Error Format

Every endpoint returns errors as:

```json
{ "error": "human-readable message" }
```

with the appropriate HTTP status. There is no protocol-level error code system — clients should branch on HTTP status and the `error` string.

## Rate Limits

The hosted API rate-limits direct chain reads at 10 RPC calls per second per process. SQLite-backed reads (`/query/:id/status`, `/queries/active`, `/queries/resolved`) are not rate-limited and incur zero RPC overhead.

## Self-Hosting

To run your own API instance, clone the repo, set up `.env` with your contract addresses and treasury private key, and run:

```bash
cd api
npm install
npm run dev
```

See the [Deployment Guide](../contracts/deployment.md) for the full self-hosting walkthrough.
