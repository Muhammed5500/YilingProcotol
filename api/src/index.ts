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
import { cacheGet, cacheSet } from "./services/cache.js";

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

// ─── Source Cache ──────────────────────────────────────────
// Cache source per queryId to avoid on-chain calls on every list request
const sourceCache = new Map<string, string>();
let sourceCacheWarmed = false;

async function getSourceCached(queryId: bigint): Promise<string> {
  const key = queryId.toString();
  if (sourceCache.has(key)) return sourceCache.get(key)!;

  // Cache miss — read from chain and cache
  const { getQuerySourceOnChain } = await import("./services/contract.js");
  const source = await getQuerySourceOnChain(queryId);
  sourceCache.set(key, source);
  return source;
}

// Warm cache on first request — read all sources once
async function warmSourceCache() {
  if (sourceCacheWarmed) return;
  try {
    const { getQueryCount, getQuerySourceOnChain } = await import("./services/contract.js");
    const total = await getQueryCount();
    const promises = [];
    for (let i = 0n; i < total; i++) {
      const key = i.toString();
      if (!sourceCache.has(key)) {
        promises.push(
          getQuerySourceOnChain(i).then((s) => sourceCache.set(key, s))
        );
      }
    }
    await Promise.all(promises);
    sourceCacheWarmed = true;
  } catch {}
}

// Export for query.ts to update cache on create
export function cacheQuerySource(queryId: string, source: string) {
  sourceCache.set(queryId, source);
}

// Stale cache — keeps last successful response per key for fallback on errors
const staleCache = new Map<string, any>();

// Helper: fetch all queries with parallel RPC + per-query error tolerance
async function fetchAllQueries(filter: "active" | "resolved", sourceFilter?: string) {
  const { getQueryCount, getQueryInfo } = await import("./services/contract.js");

  await warmSourceCache();

  const totalQueries = await getQueryCount();
  const indices = [];
  for (let i = 0n; i < totalQueries; i++) indices.push(i);

  // Parallel fetch — all queries at once instead of sequential
  const results = await Promise.allSettled(
    indices.map(async (i) => {
      const info = await getQueryInfo(i);
      return { i, info };
    })
  );

  const queries = [];
  for (const r of results) {
    if (r.status === "rejected") continue; // Skip failed queries
    const { i, info } = r.value;
    const isMatch = filter === "active" ? !info.resolved : info.resolved;
    if (!isMatch) continue;

    const queryId = i.toString();
    const querySource = sourceCache.get(queryId) || "";
    if (sourceFilter && querySource !== sourceFilter) continue;

    queries.push({
      queryId,
      question: info.question,
      currentPrice: info.currentPrice.toString(),
      creator: info.creator,
      totalPool: info.totalPool.toString(),
      reportCount: info.reportCount.toString(),
      source: querySource,
    });
  }

  return queries;
}

// Active queries list (free)
app.get("/queries/active", async (c) => {
  const sourceFilter = c.req.query("source");
  const cacheKey = `queries:active:${sourceFilter || "all"}`;

  const cached = cacheGet<any>(cacheKey);
  if (cached) return c.json(cached);

  try {
    const activeQueries = await fetchAllQueries("active", sourceFilter);
    const result = { activeQueries };
    cacheSet(cacheKey, result, 15000); // 15s cache
    staleCache.set(cacheKey, result);
    return c.json(result);
  } catch (err: any) {
    // Return stale data if available, otherwise error
    const stale = staleCache.get(cacheKey);
    if (stale) return c.json(stale);
    return c.json({ error: err.message }, 500);
  }
});

// Resolved queries list (free)
app.get("/queries/resolved", async (c) => {
  const sourceFilter = c.req.query("source");
  const cacheKey = `queries:resolved:${sourceFilter || "all"}`;

  const cached = cacheGet<any>(cacheKey);
  if (cached) return c.json(cached);

  try {
    const resolvedQueries = await fetchAllQueries("resolved", sourceFilter);
    const result = { resolvedQueries };
    cacheSet(cacheKey, result, 60000); // 60s cache — resolved data rarely changes
    staleCache.set(cacheKey, result);
    return c.json(result);
  } catch (err: any) {
    const stale = staleCache.get(cacheKey);
    if (stale) return c.json(stale);
    return c.json({ error: err.message }, 500);
  }
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
serve({ fetch: app.fetch, port: config.port }, async (info) => {
  console.log(`Yiling Protocol API running at http://localhost:${info.port}`);

  // Start background retry job for failed settlements (every 60s)
  const { startRetryJob } = await import("./services/txTracker.js");
  startRetryJob();
});
