/**
 * SSE (Server-Sent Events) for Yiling Protocol
 *
 * Agents connect to GET /events/stream and receive real-time events:
 *   - query.created
 *   - query.resolved
 *   - report.submitted
 *   - payout.claimed
 *
 * No webhook registration needed — just open a connection and listen.
 */

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  connectedAt: string;
};

const clients = new Map<string, SSEClient>();

// Heartbeat keeps connections alive (every 30s)
setInterval(() => {
  for (const client of clients.values()) {
    try {
      client.controller.enqueue(": heartbeat\n\n");
    } catch {
      clients.delete(client.id);
    }
  }
}, 30_000);

/**
 * Register a new SSE client. Returns a ReadableStream for the response.
 */
export function addClient(): { id: string; stream: ReadableStream } {
  const id = crypto.randomUUID();

  let savedController: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      savedController = controller;

      clients.set(id, {
        id,
        controller,
        connectedAt: new Date().toISOString(),
      });

      // Send welcome message
      controller.enqueue(`data: ${JSON.stringify({ type: "connected", id })}\n\n`);
    },
    cancel() {
      clients.delete(id);
    },
  });

  return { id, stream };
}

/**
 * Broadcast an event to all connected SSE clients.
 * Called from emitEvent() in webhooks.ts
 */
export function broadcast(type: string, data: Record<string, any>) {
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  const message = `event: ${type}\ndata: ${payload}\n\n`;

  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(message);
    } catch {
      clients.delete(id);
    }
  }
}

/**
 * Get count of connected clients (for admin/health)
 */
export function getClientCount(): number {
  return clients.size;
}
