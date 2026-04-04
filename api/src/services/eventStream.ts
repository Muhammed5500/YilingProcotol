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
  agentAddress?: string;
};

const clients = new Map<string, SSEClient>();
// Agent address → SSE client IDs (one agent may have multiple connections)
const agentClients = new Map<string, Set<string>>();

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
 * If agentAddress is provided, the client is mapped for unicast messaging.
 */
export function addClient(agentAddress?: string): { id: string; stream: ReadableStream } {
  const id = crypto.randomUUID();
  const normalizedAddress = agentAddress?.toLowerCase();

  const stream = new ReadableStream({
    start(controller) {
      clients.set(id, {
        id,
        controller,
        connectedAt: new Date().toISOString(),
        agentAddress: normalizedAddress,
      });

      // Track agent → client mapping
      if (normalizedAddress) {
        if (!agentClients.has(normalizedAddress)) {
          agentClients.set(normalizedAddress, new Set());
        }
        agentClients.get(normalizedAddress)!.add(id);
      }

      // Send welcome message
      controller.enqueue(`data: ${JSON.stringify({ type: "connected", id })}\n\n`);
    },
    cancel() {
      // Clean up agent mapping
      const client = clients.get(id);
      if (client?.agentAddress) {
        const clientIds = agentClients.get(client.agentAddress);
        if (clientIds) {
          clientIds.delete(id);
          if (clientIds.size === 0) agentClients.delete(client.agentAddress);
        }
      }
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
 * Send an event to a specific agent by wallet address (unicast).
 * Returns true if at least one delivery succeeded.
 */
export function sendToAgent(agentAddress: string, type: string, data: Record<string, any>): boolean {
  const normalizedAddress = agentAddress.toLowerCase();
  const clientIds = agentClients.get(normalizedAddress);
  if (!clientIds || clientIds.size === 0) return false;

  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  const message = `event: ${type}\ndata: ${payload}\n\n`;

  let delivered = false;
  for (const clientId of clientIds) {
    const client = clients.get(clientId);
    if (!client) {
      clientIds.delete(clientId);
      continue;
    }
    try {
      client.controller.enqueue(message);
      delivered = true;
    } catch {
      clientIds.delete(clientId);
      clients.delete(clientId);
    }
  }

  if (clientIds.size === 0) agentClients.delete(normalizedAddress);
  return delivered;
}

/**
 * Get count of connected clients (for admin/health)
 */
export function getClientCount(): number {
  return clients.size;
}
