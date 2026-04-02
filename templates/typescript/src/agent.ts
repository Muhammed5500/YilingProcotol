/**
 * Yiling Protocol Agent Runner
 *
 * Automatically:
 *   1. Checks agent registration (ERC-8004)
 *   2. Connects to SSE stream for real-time query notifications
 *   3. Falls back to polling if SSE disconnects
 *   4. Runs your strategy to generate predictions
 *   5. Submits reports via the Protocol API (with x402 payment)
 *   6. Claims payouts after resolution
 *
 * You only need to modify strategy.ts — this file handles everything else.
 */

import { predict } from "./strategy.js";
import { config } from "./config.js";
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";

// x402-enabled fetch — automatically handles 402 Payment Required responses
const account = privateKeyToAccount(config.privateKey as `0x${string}`);
const publicClient = createPublicClient({
  chain: {
    id: 10143, name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  },
  transport: http("https://testnet-rpc.monad.xyz"),
});
const _client = new x402Client();
registerExactEvmScheme(_client, { signer: toClientEvmSigner(account, publicClient) });
const x402Fetch = wrapFetchWithPayment(fetch, new x402HTTPClient(_client));

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
  const data: any = await res.json();
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

  // Uses x402Fetch — automatically pays bond via x402 if 402 is returned
  const res = await x402Fetch(`${config.apiUrl}/query/${queryId}/report`, {
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

async function checkAndClaimPayouts(reportedQueries: string[]) {
  for (const queryId of reportedQueries) {
    try {
      const status = await getQueryStatus(queryId);
      if (!status.resolved) continue;

      // Check payout
      const payoutRes = await fetch(
        `${config.apiUrl}/query/${queryId}/payout/${config.walletAddress}`
      );
      if (!payoutRes.ok) continue;

      const payoutInfo: any = await payoutRes.json();
      if (BigInt(payoutInfo.net || "0") <= 0n) continue;

      // Claim (free endpoint — no x402)
      const claimRes = await fetch(`${config.apiUrl}/query/${queryId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: config.walletAddress,
          payoutChain: config.sourceChain,
        }),
      });

      if (claimRes.ok) {
        const result: any = await claimRes.json();
        console.log(`  Claimed payout for query #${queryId}: net ${result.payout?.net}`);
      }
    } catch (err: any) {
      console.log(`  Payout check failed for query #${queryId}: ${err.message}`);
    }
  }
}

async function checkRegistration(): Promise<boolean> {
  const res = await fetch(`${config.apiUrl}/agent/${config.walletAddress}/status`);
  const status: any = await res.json();

  if (!status.isRegistered) {
    console.log("WARNING: This wallet is NOT registered in Yiling Protocol.");
    console.log("  You need an ERC-8004 Identity and must call joinEcosystem().");
    console.log(`  Run: POST ${config.apiUrl}/agent/register with your wallet to get instructions.`);
    console.log();
    return false;
  }

  console.log(`  Registered as agent #${status.agentId}`);
  return true;
}

function parseReports(reports: Report[]) {
  return reports.map((r) => ({
    probability: Number(r.probability) / 1e18,
    priceBefore: Number(r.priceBefore) / 1e18,
    priceAfter: Number(r.priceAfter) / 1e18,
  }));
}

// ─── Process a single query ─────────────────────────────────

const reportedQueries: string[] = [];

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

  reportedQueries.push(queryId);
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

  // Check for claimable payouts
  if (reportedQueries.length > 0) {
    await checkAndClaimPayouts(reportedQueries);
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

  // Check registration before starting
  if (!(await checkRegistration())) {
    console.log("Agent is not registered. Register first, then restart.");
    return;
  }

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
