/**
 * Yiling Protocol Agent Runner
 *
 * Automatically:
 *   1. Connects to SSE stream for real-time query notifications
 *   2. Falls back to polling if SSE disconnects
 *   3. Runs your strategy to generate predictions
 *   4. Submits reports via the Protocol API
 *
 * You only need to modify strategy.ts — this file handles everything else.
 */

import { predict } from "./strategy.js";
import { config } from "./config.js";

interface Query {
  queryId: string;
  question: string;
  currentPrice: string;
  totalPool: string;
  reportCount: string;
}

interface Report {
  agentId: string;
  reporter: string;
  probability: string;
  priceBefore: string;
  priceAfter: string;
}

// ─── API Helpers ────────────────────────────────────────────

async function getActiveQueries(): Promise<Query[]> {
  const res = await fetch(`${config.apiUrl}/queries/active`);
  const data = await res.json();
  return data.activeQueries;
}

async function getQueryStatus(queryId: string): Promise<any> {
  const res = await fetch(`${config.apiUrl}/query/${queryId}/status`);
  return res.json();
}

function hasAlreadyReported(reports: Report[]): boolean {
  return reports.some(
    (r) => r.reporter.toLowerCase() === config.walletAddress.toLowerCase()
  );
}

async function submitReport(queryId: string, probability: number): Promise<any> {
  const probWad = BigInt(Math.floor(probability * 1e18)).toString();

  const res = await fetch(`${config.apiUrl}/query/${queryId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      probability: probWad,
      reporter: config.walletAddress,
      sourceChain: config.sourceChain,
    }),
  });

  return res.json();
}

function parseReports(reports: Report[]) {
  return reports.map((r) => ({
    probability: Number(r.probability) / 1e18,
    priceBefore: Number(r.priceBefore) / 1e18,
    priceAfter: Number(r.priceAfter) / 1e18,
  }));
}

// ─── Process a single query ─────────────────────────────────

async function processQuery(queryId: string) {
  const status = await getQueryStatus(queryId);

  if (status.resolved) return;
  if (hasAlreadyReported(status.reports)) return;

  const currentPrice = Number(status.currentPrice) / 1e18;
  const reports = parseReports(status.reports);

  let probability = predict(status.question, reports, currentPrice);
  probability = Math.max(0.02, Math.min(0.98, probability));

  console.log(`  Query #${queryId}: '${status.question}'`);
  console.log(`    Current price: ${currentPrice.toFixed(4)}`);
  console.log(`    My prediction: ${probability.toFixed(4)}`);

  const result = await submitReport(queryId, probability);
  console.log(`    Submitted! tx: ${result.txHash || result.error}`);
}

// ─── SSE Stream ─────────────────────────────────────────────

function connectSSE(): EventSource | null {
  const url = `${config.apiUrl}/events/stream`;

  try {
    const es = new EventSource(url);

    es.onopen = () => {
      console.log("[SSE] Connected — listening for new queries");
    };

    es.addEventListener("query.created", async (e) => {
      const { data } = JSON.parse(e.data);
      console.log(`\n[SSE] New query! "${data.question}"`);

      try {
        // Small delay to let chain state settle
        await new Promise((r) => setTimeout(r, 2000));
        await processQuery(data.txId || data.queryId);
      } catch (err: any) {
        console.log(`[SSE] Error processing query: ${err.message}`);
      }
    });

    es.onerror = () => {
      console.log("[SSE] Connection lost — falling back to polling");
      es.close();
    };

    return es;
  } catch {
    console.log("[SSE] Could not connect — using polling only");
    return null;
  }
}

// ─── Polling Fallback ───────────────────────────────────────

async function pollOnce() {
  const queries = await getActiveQueries();

  if (queries.length > 0) {
    console.log(`[Poll] Found ${queries.length} active queries`);
  }

  for (const q of queries) {
    await processQuery(q.queryId);
  }
}

// ─── Main Loop ──────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Yiling Agent starting...");
  console.log(`  Wallet: ${config.walletAddress}`);
  console.log(`  API: ${config.apiUrl}`);
  console.log(`  Chain: ${config.sourceChain}`);
  console.log();

  // Try SSE first
  let sse = connectSSE();

  // Polling loop as fallback (also catches anything SSE missed)
  while (true) {
    try {
      // If SSE is disconnected, try to reconnect
      if (!sse || sse.readyState === EventSource.CLOSED) {
        sse = connectSSE();
      }

      // Always poll occasionally as safety net
      await pollOnce();
    } catch (err: any) {
      if (err.cause?.code === "ECONNREFUSED") {
        console.log("[Poll] Cannot reach API, retrying...");
      } else {
        console.log(`[Poll] Error: ${err.message}`);
      }
    }

    // Poll less frequently when SSE is active
    const interval = sse?.readyState === EventSource.OPEN
      ? config.pollIntervalMs * 6  // 60s when SSE is working
      : config.pollIntervalMs;      // 10s when SSE is down

    await sleep(interval);
  }
}

run();
