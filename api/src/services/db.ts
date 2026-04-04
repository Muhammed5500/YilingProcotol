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

    CREATE TABLE IF NOT EXISTS orchestrations (
      query_id TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'pooling',
      pool TEXT NOT NULL DEFAULT '[]',
      used_agents TEXT NOT NULL DEFAULT '[]',
      reports TEXT NOT NULL DEFAULT '[]',
      round_history TEXT NOT NULL DEFAULT '[]',
      current_round TEXT,
      created_at INTEGER NOT NULL,
      pooling_deadline INTEGER NOT NULL
    );
  `);

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

// ========== ORCHESTRATION CRUD ==========

export interface OrchestrationRow {
  query_id: string;
  state: string;
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

  if (existing) {
    db.prepare(`
      UPDATE orchestrations SET state = ?, pool = ?, used_agents = ?, reports = ?,
      round_history = ?, current_round = ?
      WHERE query_id = ?
    `).run(data.state, poolJson, usedJson, reportsJson, historyJson, roundJson, queryId);
  } else {
    db.prepare(`
      INSERT INTO orchestrations (query_id, state, pool, used_agents, reports, round_history, current_round, created_at, pooling_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(queryId, data.state, poolJson, usedJson, reportsJson, historyJson, roundJson, data.createdAt, data.poolingDeadline);
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
    } catch (err: any) {
      console.log(`[db] Failed to sync query ${i}: ${err.message}`);
    }
  }

  console.log(`[db] Sync complete — ${chainCount} queries in DB`);
}
