/**
 * SQLite Persistence Layer — Yiling Protocol API
 *
 * Stores query data and orchestration state so the API
 * doesn't need to hit the chain RPC for every read request.
 * Chain remains authoritative — DB is a synced cache.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "..", "data", "yiling.db");

let db: Database.Database;

// ========== INIT ==========

export function initDb() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL"); // Better concurrent read performance
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS queries (
      query_id INTEGER PRIMARY KEY,
      question TEXT NOT NULL,
      current_price TEXT NOT NULL DEFAULT '500000000000000000',
      creator TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      total_pool TEXT NOT NULL DEFAULT '0',
      report_count INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      alpha TEXT,
      k TEXT,
      flat_reward TEXT,
      bond_amount TEXT,
      liquidity_param TEXT,
      created_at INTEGER,
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_id INTEGER NOT NULL,
      report_index INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      reporter TEXT NOT NULL,
      probability TEXT NOT NULL,
      price_before TEXT NOT NULL,
      price_after TEXT NOT NULL,
      bond_amount TEXT NOT NULL DEFAULT '0',
      source_chain TEXT NOT NULL DEFAULT '',
      timestamp TEXT NOT NULL,
      UNIQUE(query_id, report_index)
    );

    CREATE TABLE IF NOT EXISTS agents (
      wallet TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      is_registered INTEGER NOT NULL DEFAULT 1,
      registered_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orchestrations (
      query_id TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'pooling',
      query_chain TEXT NOT NULL DEFAULT 'eip155:10143',
      pool TEXT NOT NULL DEFAULT '[]',
      used_agents TEXT NOT NULL DEFAULT '[]',
      reports TEXT NOT NULL DEFAULT '[]',
      round_history TEXT NOT NULL DEFAULT '[]',
      current_round TEXT,
      created_at INTEGER NOT NULL,
      pooling_deadline INTEGER NOT NULL
    );
  `);

  // Migration: add query_chain column to existing DBs
  try {
    db.prepare("SELECT query_chain FROM orchestrations LIMIT 1").get();
  } catch {
    db.prepare("ALTER TABLE orchestrations ADD COLUMN query_chain TEXT NOT NULL DEFAULT 'eip155:10143'").run();
    console.log("[db] Migrated: added query_chain column to orchestrations");
  }

  console.log(`[db] SQLite initialized at ${DB_PATH}`);
}

// ========== QUERY CRUD ==========

export interface QueryRow {
  query_id: number;
  question: string;
  current_price: string;
  creator: string;
  resolved: number;
  total_pool: string;
  report_count: number;
  source: string;
  alpha?: string;
  k?: string;
  flat_reward?: string;
  bond_amount?: string;
  liquidity_param?: string;
  created_at?: number;
  updated_at: number;
}

export function upsertQuery(queryId: number, data: Partial<Omit<QueryRow, "query_id">>) {
  const existing = db.prepare("SELECT query_id FROM queries WHERE query_id = ?").get(queryId);

  if (existing) {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (fields.length === 0) return;
    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(queryId);
    db.prepare(`UPDATE queries SET ${fields.join(", ")} WHERE query_id = ?`).run(...values);
  } else {
    const d = {
      question: data.question || "",
      current_price: data.current_price || "500000000000000000",
      creator: data.creator || "",
      resolved: data.resolved || 0,
      total_pool: data.total_pool || "0",
      report_count: data.report_count || 0,
      source: data.source || "",
      alpha: data.alpha || null,
      k: data.k || null,
      flat_reward: data.flat_reward || null,
      bond_amount: data.bond_amount || null,
      liquidity_param: data.liquidity_param || null,
      created_at: data.created_at || null,
      updated_at: Date.now(),
    };
    db.prepare(`
      INSERT INTO queries (query_id, question, current_price, creator, resolved, total_pool, report_count, source, alpha, k, flat_reward, bond_amount, liquidity_param, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(queryId, d.question, d.current_price, d.creator, d.resolved, d.total_pool, d.report_count, d.source, d.alpha, d.k, d.flat_reward, d.bond_amount, d.liquidity_param, d.created_at, d.updated_at);
  }
}

export function getActiveQueries(source?: string): QueryRow[] {
  if (source) {
    return db.prepare("SELECT * FROM queries WHERE resolved = 0 AND source = ? ORDER BY query_id DESC").all(source) as QueryRow[];
  }
  return db.prepare("SELECT * FROM queries WHERE resolved = 0 ORDER BY query_id DESC").all() as QueryRow[];
}

export function getResolvedQueries(source?: string): QueryRow[] {
  if (source) {
    return db.prepare("SELECT * FROM queries WHERE resolved = 1 AND source = ? ORDER BY query_id DESC").all(source) as QueryRow[];
  }
  return db.prepare("SELECT * FROM queries WHERE resolved = 1 ORDER BY query_id DESC").all() as QueryRow[];
}

export function getQuery(queryId: number): QueryRow | null {
  return (db.prepare("SELECT * FROM queries WHERE query_id = ?").get(queryId) as QueryRow) || null;
}

export function updateQueryOnReport(queryId: number, reportCount: number, currentPrice: string) {
  db.prepare("UPDATE queries SET report_count = ?, current_price = ?, updated_at = ? WHERE query_id = ?")
    .run(reportCount, currentPrice, Date.now(), queryId);
}

export function markResolved(queryId: number) {
  db.prepare("UPDATE queries SET resolved = 1, updated_at = ? WHERE query_id = ?")
    .run(Date.now(), queryId);
}

export function getDbQueryCount(): number {
  const row = db.prepare("SELECT COUNT(*) as cnt FROM queries").get() as { cnt: number };
  return row.cnt;
}

// ========== REPORT CRUD ==========

export interface ReportRow {
  id: number;
  query_id: number;
  report_index: number;
  agent_id: string;
  reporter: string;
  probability: string;
  price_before: string;
  price_after: string;
  bond_amount: string;
  source_chain: string;
  timestamp: string;
}

export function insertReport(queryId: number, reportIndex: number, data: {
  agentId: string; reporter: string; probability: string;
  priceBefore: string; priceAfter: string; bondAmount: string;
  sourceChain: string; timestamp: string;
}) {
  db.prepare(`
    INSERT OR IGNORE INTO reports (query_id, report_index, agent_id, reporter, probability, price_before, price_after, bond_amount, source_chain, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(queryId, reportIndex, data.agentId, data.reporter, data.probability, data.priceBefore, data.priceAfter, data.bondAmount, data.sourceChain, data.timestamp);
}

export function getReports(queryId: number): ReportRow[] {
  return db.prepare("SELECT * FROM reports WHERE query_id = ? ORDER BY report_index ASC").all(queryId) as ReportRow[];
}

// ========== AGENT CRUD ==========

export interface AgentRow {
  wallet: string;
  agent_id: string;
  is_registered: number;
  registered_at: number;
}

export function upsertAgent(wallet: string, agentId: string) {
  db.prepare(`
    INSERT INTO agents (wallet, agent_id, is_registered, registered_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(wallet) DO UPDATE SET agent_id = ?, is_registered = 1
  `).run(wallet.toLowerCase(), agentId, Date.now(), agentId);
}

export function getAgent(wallet: string): AgentRow | null {
  return (db.prepare("SELECT * FROM agents WHERE wallet = ?").get(wallet.toLowerCase()) as AgentRow) || null;
}

// ========== ORCHESTRATION CRUD ==========

export interface OrchestrationRow {
  query_id: string;
  state: string;
  query_chain: string;
  pool: string; // JSON
  used_agents: string; // JSON
  reports: string; // JSON
  round_history: string; // JSON
  current_round: string | null; // JSON
  created_at: number;
  pooling_deadline: number;
}

export function saveOrchestration(queryId: string, data: {
  state: string;
  queryChain?: string;
  pool: any[];
  usedAgents: string[];
  reports: any[];
  roundHistory: any[];
  currentRound: any | null;
  createdAt: number;
  poolingDeadline: number;
}) {
  const existing = db.prepare("SELECT query_id FROM orchestrations WHERE query_id = ?").get(queryId);

  const poolJson = JSON.stringify(data.pool);
  const usedJson = JSON.stringify(data.usedAgents);
  const reportsJson = JSON.stringify(data.reports);
  const historyJson = JSON.stringify(data.roundHistory);
  const roundJson = data.currentRound ? JSON.stringify({
    roundNumber: data.currentRound.roundNumber,
    selectedAgent: data.currentRound.selectedAgent,
    selectedAt: data.currentRound.selectedAt,
    status: data.currentRound.status,
  }) : null;
  const queryChain = data.queryChain || "eip155:10143";

  if (existing) {
    db.prepare(`
      UPDATE orchestrations SET state = ?, query_chain = ?, pool = ?, used_agents = ?, reports = ?,
      round_history = ?, current_round = ?
      WHERE query_id = ?
    `).run(data.state, queryChain, poolJson, usedJson, reportsJson, historyJson, roundJson, queryId);
  } else {
    db.prepare(`
      INSERT INTO orchestrations (query_id, state, query_chain, pool, used_agents, reports, round_history, current_round, created_at, pooling_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(queryId, data.state, queryChain, poolJson, usedJson, reportsJson, historyJson, roundJson, data.createdAt, data.poolingDeadline);
  }
}

export function loadOrchestration(queryId: string): OrchestrationRow | null {
  return (db.prepare("SELECT * FROM orchestrations WHERE query_id = ?").get(queryId) as OrchestrationRow) || null;
}

export function loadAllActiveOrchestrations(): OrchestrationRow[] {
  return db.prepare("SELECT * FROM orchestrations WHERE state NOT IN ('resolved', 'cancelled')").all() as OrchestrationRow[];
}

export function deleteOrchestration(queryId: string) {
  db.prepare("DELETE FROM orchestrations WHERE query_id = ?").run(queryId);
}

// ========== CHAIN SYNC ==========

/**
 * Sync queries from chain to DB. Only fetches queries not yet in DB.
 * Called once on startup.
 */
export async function syncQueriesFromChain() {
  const { getQueryCount, getQueryInfo, getQueryParams, getQuerySourceOnChain } = await import("./contract.js");

  const chainCount = Number(await getQueryCount());
  const dbCount = getDbQueryCount();

  if (dbCount >= chainCount) {
    console.log(`[db] DB up to date (${dbCount} queries)`);
    return;
  }

  console.log(`[db] Syncing ${chainCount - dbCount} queries from chain...`);

  for (let i = dbCount; i < chainCount; i++) {
    try {
      const [info, params, source] = await Promise.all([
        getQueryInfo(BigInt(i)),
        getQueryParams(BigInt(i)),
        getQuerySourceOnChain(BigInt(i)),
      ]);

      upsertQuery(i, {
        question: info.question,
        current_price: info.currentPrice.toString(),
        creator: info.creator,
        resolved: info.resolved ? 1 : 0,
        total_pool: info.totalPool.toString(),
        report_count: Number(info.reportCount),
        source: source || "",
        alpha: params.alpha.toString(),
        k: params.k.toString(),
        flat_reward: params.flatReward.toString(),
        bond_amount: params.bondAmount.toString(),
        liquidity_param: params.liquidityParam.toString(),
        created_at: Number(params.createdAt),
      });

      // Sync reports for this query
      const { getReport } = await import("./contract.js");
      const reportCount = Number(info.reportCount);
      for (let r = 0; r < reportCount; r++) {
        try {
          const report = await getReport(BigInt(i), BigInt(r));
          insertReport(i, r, {
            agentId: report.agentId.toString(),
            reporter: report.reporter,
            probability: report.probability.toString(),
            priceBefore: report.priceBefore.toString(),
            priceAfter: report.priceAfter.toString(),
            bondAmount: report.bondAmount.toString(),
            sourceChain: report.sourceChain,
            timestamp: report.timestamp.toString(),
          });
          // Also cache the agent
          upsertAgent(report.reporter, report.agentId.toString());
        } catch {}
      }
    } catch (err: any) {
      console.log(`[db] Failed to sync query ${i}: ${err.message}`);
    }
  }

  console.log(`[db] Sync complete — ${chainCount} queries in DB`);

  // Also update resolved status for existing queries
  await refreshResolvedStatus();
}

/**
 * Check on-chain resolved status for all unresolved queries in DB
 * and update SQLite accordingly.
 */
export async function refreshResolvedStatus() {
  const { getQueryInfo } = await import("./contract.js");

  const unresolvedRows = db.prepare("SELECT query_id FROM queries WHERE resolved = 0").all() as { query_id: number }[];
  if (unresolvedRows.length === 0) return;

  for (const row of unresolvedRows) {
    try {
      const info = await getQueryInfo(BigInt(row.query_id));
      if (info.resolved) {
        markResolved(row.query_id);
        // Also update report count and price
        db.prepare("UPDATE queries SET report_count = ?, current_price = ?, updated_at = ? WHERE query_id = ?")
          .run(Number(info.reportCount), info.currentPrice.toString(), Date.now(), row.query_id);
        console.log(`[db] Query #${row.query_id} marked as resolved`);
      }
    } catch {}
  }
}

/**
 * Start periodic background sync (every 30s)
 */
export function startBackgroundSync() {
  setInterval(async () => {
    try {
      await syncQueriesFromChain();
    } catch {}
  }, 30_000);
}
