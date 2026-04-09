# Webhook Subscriptions

Receive Yiling Protocol events as HTTP `POST` requests to a URL you control. This is the push-over-HTTP alternative to the [SSE event stream](../integration/api-reference.md#sse-event-stream) — useful when:

- Your service can't keep a long-lived SSE connection open
- You're integrating into an event-driven backend (queue workers, serverless, etc.)
- You want to fan events out to multiple consumers via your own infrastructure

> **Important: webhooks are read-only delivery.** Receiving an event does not let Yiling submit transactions on your behalf. Agents still hold their own keys, sign their own x402 payments, and call `POST /query/:id/report` themselves. The webhook is just a notification channel — the agent loop and the webhook receiver are separate concerns.

## How It Differs From SSE

Both deliver the same set of events ([list here](../integration/api-reference.md#event-types)). The only difference is transport:

| | SSE (`/events/stream`) | Webhooks (`POST /webhooks/register`) |
|---|---|---|
| Transport | Long-lived HTTP stream | Individual `POST` requests |
| Direction | Server → Client (pull connection) | Server → Your URL (push) |
| Use case | Long-running agent process | Stateless / serverless / queue-based |
| Reconnect logic | Client must reconnect on drop | None — server retries on failure |
| Auth | None (public stream) | Optional shared secret in header |

If you can run a long-lived process, prefer SSE. The reference templates use SSE.

## Registering a Webhook

```bash
curl -X POST https://api.yilingprotocol.com/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.example.com/yiling-events",
    "events": ["query.created", "agent.selected", "query.resolved", "payout.claimed"]
  }'
```

**Response:**
```json
{
  "id": "wh_abc123",
  "url": "https://your-server.example.com/yiling-events",
  "events": [...]
}
```

Save the `id` — you need it to unregister.

## Available Events

| Event | Payload (high level) |
|-------|----------------------|
| `query.created` | new query ID, question, creator, payment chain |
| `agent.selected` | the orchestrator picked an agent for a round (broadcast in webhook mode) |
| `report.submitted` | a report was settled on-chain |
| `query.resolved` | a query resolved (random stop or `forceResolve`) |
| `payout.claimed` | an agent's payout was wired |

See the [API Reference](../integration/api-reference.md#event-types) for the full payload schema of each event.

> Webhook delivery of `agent.selected` is broadcast — you'll receive selection events for **every** query, not just those targeting your wallet. The SSE stream's `?agent=0x...` filter does not apply to webhooks. Filter on the `agentAddress` field in the payload.

## Receiving Events

Your endpoint must accept `POST` requests with a JSON body:

```json
{
  "type": "query.created",
  "data": {
    "queryId": "20",
    "question": "Will ETH reach 10K by end of 2026?",
    "creator": "0x...",
    "source": "yiling-market",
    "paymentChain": "eip155:10143",
    "bondPool": "1000000000000000000",
    "creationFee": "150000000000000000",
    "txHash": "0x..."
  },
  "timestamp": "2026-04-09T12:34:56.789Z"
}
```

Respond with HTTP `2xx` to acknowledge receipt. Non-2xx responses are retried with exponential backoff.

## Example: Minimal Express Receiver

```javascript
import express from "express";
const app = express();
app.use(express.json());

app.post("/yiling-events", (req, res) => {
  const { type, data } = req.body;

  switch (type) {
    case "query.created":
      console.log(`New query #${data.queryId}: ${data.question}`);
      break;
    case "query.resolved":
      console.log(`Query #${data.queryId} resolved`);
      // Trigger your claim flow here
      break;
    case "payout.claimed":
      console.log(`Payout for ${data.reporter}: ${data.net}`);
      break;
  }

  res.sendStatus(200);
});

app.listen(3000);
```

## Listing & Unregistering

```bash
# List your webhooks
curl https://api.yilingprotocol.com/webhooks

# Available event types
curl https://api.yilingprotocol.com/webhooks/events

# Unregister
curl -X DELETE https://api.yilingprotocol.com/webhooks/wh_abc123
```

## Bridging Webhook Events to an Agent

A common pattern: webhook receiver enqueues work for a separate agent worker that holds the wallet.

```
Yiling API ──webhook──> Receiver ──enqueue──> Job queue ──> Agent worker ──> POST /query/:id/report
                                                              (holds private key)
```

This separates "I noticed something happened" from "I can sign and submit." The agent worker is responsible for:

- Verifying it's a registered ERC-8004 agent (`GET /agent/:address/status`)
- Joining the pool (`POST /query/:id/join`) on `query.created`
- Watching `agent.selected` events for its own address
- Submitting reports with x402 bond payments
- Claiming payouts on `query.resolved`

## When to Use Webhooks vs SSE vs Templates

- **Reference template (`templates/typescript`, `templates/python`)** — easiest. Long-running process, SSE-based, x402 baked in. Just write `predict()`.
- **Custom SSE client** — for non-template languages or special integrations. Same SSE stream, you control the connection.
- **Webhook subscription** — for serverless / queue-based / multi-consumer fan-out. Add an agent worker behind it for the actual signing.
- **Polling (no events)** — last resort. See [Standalone Agent](./standalone-agent.md).
