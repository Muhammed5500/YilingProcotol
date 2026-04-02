import { createHmac } from "crypto";
import { broadcast } from "./eventStream.js";

/**
 * Webhook/Event System for Yiling Protocol
 *
 * Builders register webhook URLs to receive real-time notifications.
 * Events are signed with HMAC-SHA256 for verification.
 *
 * Events:
 *   query.created    — new query deployed
 *   query.resolved   — query resolved with final truth
 *   report.submitted — agent submitted a report
 *   payout.available — payout ready to claim
 *   payout.claimed   — payout claimed by agent
 *   agent.registered — new agent joined ecosystem
 *   agent.reputation_updated — agent reputation score changed
 */

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: string;
  active: boolean;
}

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

// In-memory store (replace with DB in production)
const webhooks = new Map<string, WebhookRegistration>();

// Supported event types
export const EVENT_TYPES = [
  "query.created",
  "query.resolved",
  "report.submitted",
  "payout.available",
  "payout.claimed",
  "agent.registered",
  "agent.reputation_updated",
] as const;

/**
 * Register a webhook
 */
export function registerWebhook(
  url: string,
  events: string[],
  secret: string
): WebhookRegistration {
  const id = crypto.randomUUID();

  const registration: WebhookRegistration = {
    id,
    url,
    events,
    secret,
    createdAt: new Date().toISOString(),
    active: true,
  };

  webhooks.set(id, registration);
  return registration;
}

/**
 * Unregister a webhook
 */
export function unregisterWebhook(id: string): boolean {
  return webhooks.delete(id);
}

/**
 * List all registered webhooks
 */
export function listWebhooks(): WebhookRegistration[] {
  return Array.from(webhooks.values());
}

/**
 * Emit an event to all matching webhooks
 */
export async function emitEvent(type: string, data: Record<string, any>) {
  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  // SSE: push to all connected agents instantly
  broadcast(type, data);

  // Webhooks: push to registered builder endpoints
  const matchingWebhooks = Array.from(webhooks.values()).filter(
    (wh) => wh.active && wh.events.includes(type)
  );

  const deliveries = matchingWebhooks.map((wh) =>
    deliverWebhook(wh, event).catch((err) => {
      console.error(`Webhook delivery failed for ${wh.id}: ${err.message}`);
    })
  );

  await Promise.allSettled(deliveries);
}

/**
 * Deliver a webhook event with HMAC-SHA256 signature
 */
async function deliverWebhook(
  webhook: WebhookRegistration,
  event: WebhookEvent
) {
  const payload = JSON.stringify(event);
  const signature = createHmac("sha256", webhook.secret)
    .update(payload)
    .digest("hex");

  const response = await fetch(webhook.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yiling-Signature": `sha256=${signature}`,
      "X-Yiling-Event": event.type,
      "X-Yiling-Timestamp": event.timestamp,
    },
    body: payload,
    signal: AbortSignal.timeout(10000), // 10s timeout
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}
