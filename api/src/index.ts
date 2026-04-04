import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { createMultiFacilitatorMiddleware } from "./middleware/x402.js";
import queryRoutes from "./routes/query.js";
import agentRoutes from "./routes/agent.js";
import healthRoutes from "./routes/health.js";
import webhookRoutes from "./routes/webhooks.js";
import { createA2ARoutes } from "./a2a/handler.js";
import * as db from "./services/db.js";

const app = new Hono();

// Global middleware
app.use("*", cors({
  origin: "*",
  exposeHeaders: ["payment-required", "payment-response", "x-payment"],
}));
app.use("*", logger());

// x402 payment middleware — Monad + Base + Solana (multi-facilitator)
app.use("*", createMultiFacilitatorMiddleware(config.treasuryAddress));

// Routes
app.route("/query", queryRoutes);
app.route("/agent", agentRoutes);
app.route("/health", healthRoutes);
app.route("/webhooks", webhookRoutes);

// A2A routes (agent card discovery + task handling)
const a2aRoutes = createA2ARoutes(process.env.API_BASE_URL || `https://api.yilingprotocol.com`);
app.route("/", a2aRoutes);

// Export for query.ts to update DB on create
export function cacheQuerySource(queryId: string, source: string) {
  // Now handled by db.upsertQuery — kept for backward compat
}

// Active queries list (free) — reads from SQLite, 0 RPC calls
app.get("/queries/active", (c) => {
  const sourceFilter = c.req.query("source");
  const rows = db.getActiveQueries(sourceFilter || undefined);
  const activeQueries = rows.map((r) => ({
    queryId: r.query_id.toString(),
    question: r.question,
    currentPrice: r.current_price,
    creator: r.creator,
    totalPool: r.total_pool,
    reportCount: r.report_count.toString(),
    source: r.source,
  }));
  return c.json({ activeQueries });
});

// Resolved queries list (free) — reads from SQLite, 0 RPC calls
app.get("/queries/resolved", (c) => {
  const sourceFilter = c.req.query("source");
  const rows = db.getResolvedQueries(sourceFilter || undefined);
  const resolvedQueries = rows.map((r) => ({
    queryId: r.query_id.toString(),
    question: r.question,
    currentPrice: r.current_price,
    creator: r.creator,
    totalPool: r.total_pool,
    reportCount: r.report_count.toString(),
    source: r.source,
  }));
  return c.json({ resolvedQueries });
});

// SSE event stream for agents (free)
// Agents can identify themselves with ?agent=0xABC... for targeted orchestration messages
app.get("/events/stream", async (c) => {
  const { addClient } = await import("./services/eventStream.js");
  const agentAddress = c.req.query("agent");
  const { id, stream } = addClient(agentAddress);

  console.log(`[SSE] Agent connected: ${id}${agentAddress ? ` (${agentAddress})` : ""}`);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Client-Id": id,
    },
  });
});

// Treasury balances (admin)
app.get("/treasury/balances", async (c) => {
  try {
    const { getAllTreasuryBalances } = await import("./services/payout.js");
    const balances = await getAllTreasuryBalances();
    return c.json({ treasury: balances });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Transaction status (admin)
app.get("/admin/transactions", async (c) => {
  const { getTxSummary, getRetryable, getRefundable } = await import("./services/txTracker.js");
  return c.json({
    summary: getTxSummary(),
    retryable: getRetryable().length,
    refundable: getRefundable().length,
  });
});

// Manual retry trigger (admin)
app.post("/admin/transactions/retry", async (c) => {
  const { getRetryable, startRetryJob } = await import("./services/txTracker.js");
  const retryable = getRetryable();
  if (retryable.length === 0) {
    return c.json({ message: "No retryable transactions" });
  }
  startRetryJob(0); // trigger immediately via job
  return c.json({ message: `Retry triggered for ${retryable.length} transactions`, ids: retryable.map(tx => tx.id) });
});

// Root
app.get("/", (c) => {
  return c.json({
    name: "Yiling Protocol API",
    version: "0.1.0",
    description: "Oracle-free truth discovery infrastructure",
    docs: {
      pricing: "GET /query/pricing",
    },
    endpoints: {
      "POST /query/create": "Create a new truth discovery query (x402: bondPool + 15% fee)",
      "POST /query/:id/join": "Join agent pool for a query (free, no bond)",
      "GET /query/:id/pool": "Get orchestration pool status (free)",
      "POST /query/:id/report": "Submit a report — must be selected agent (x402: bond amount)",
      "GET /query/:id/status": "Get query status and details (free)",
      "POST /query/:id/claim": "Claim payout after resolution (5% rake deducted)",
      "GET /query/:id/payout/:reporter": "Preview payout amounts (free)",
      "GET /query/pricing": "View current fee structure (free)",
      "POST /query/:id/resolve": "Force resolve a query",
      "GET /queries/active": "List all active queries (free)",
      "POST /agent/register": "Get registration instructions for new agents (free)",
      "GET /agent/:address/status": "Check agent registration status (free)",
      "GET /agent/:id/reputation": "Get agent reputation score (free)",
      "GET /events/stream": "Real-time SSE event stream (?agent=0x... for orchestration unicasts)",
      "GET /health": "Health check (free)",
    },
  });
});

// Start server
console.log(`Yiling Protocol API starting on port ${config.port}...`);

// Initialize DB before starting server
db.initDb();

serve({ fetch: app.fetch, port: config.port }, async (info) => {
  console.log(`Yiling Protocol API running at http://localhost:${info.port}`);

  // Sync queries from chain to DB (only fetches missing ones)
  try {
    await db.syncQueriesFromChain();
  } catch (err: any) {
    console.warn(`[startup] Chain sync failed (will retry on next request): ${err.message}`);
  }

  // Recover orchestration state from DB
  const { recoverFromDb } = await import("./services/orchestrator.js");
  recoverFromDb();

  // Start background retry job for failed settlements (every 60s)
  const { startRetryJob } = await import("./services/txTracker.js");
  startRetryJob();
});
