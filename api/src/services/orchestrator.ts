/**
 * Orchestrator Service — Yiling Protocol
 *
 * Manages sequential agent reporting as required by the SKC mechanism.
 * Each query gets its own orchestration: agents join a pool, are randomly
 * selected one at a time, receive the full state (previous reports), and
 * submit their prediction + bond. This guarantees:
 *   1. Sequential reporting (no concurrent chain writes)
 *   2. Information visibility (each agent sees all prior reports)
 *   3. Paper-compliant PBE (Perfect Bayesian Equilibrium)
 */

import { config } from "../config.js";
import * as contract from "./contract.js";
import * as db from "./db.js";
import { broadcast, sendToAgent } from "./eventStream.js";
import type { Address } from "viem";

// ========== TYPES ==========

type OrchestratorState =
  | "pooling"
  | "selecting"
  | "awaiting_report"
  | "writing_chain"
  | "resolved"
  | "cancelled";

interface PooledAgent {
  address: string;
  agentId: string;
  joinedAt: number;
}

interface RoundState {
  roundNumber: number;
  selectedAgent: PooledAgent;
  selectedAt: number;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
  status: "pending" | "reported" | "timed_out";
}

export interface ReportSummary {
  roundNumber: number;
  reporter: string;
  probability: string;
  priceBefore: string;
  priceAfter: string;
  timestamp: string;
}

interface StatePackage {
  queryId: string;
  roundNumber: number;
  question: string;
  currentPrice: string;
  bondAmount: string;
  reports: ReportSummary[];
  timeoutMs: number;
}

export interface QueryOrchestration {
  queryId: string;
  state: OrchestratorState;
  pool: PooledAgent[];
  usedAgents: Set<string>;
  currentRound: RoundState | null;
  roundHistory: RoundState[];
  reports: ReportSummary[];
  poolingTimer: ReturnType<typeof setTimeout> | null;
  createdAt: number;
}

type JoinResult =
  | { ok: true; position: number; poolSize: number; status: string }
  | { ok: false; error: string };

// ========== STATE ==========

const orchestrations = new Map<string, QueryOrchestration>();

// ========== DB PERSISTENCE ==========

function persistOrch(orch: QueryOrchestration) {
  try {
    db.saveOrchestration(orch.queryId, {
      state: orch.state,
      pool: orch.pool,
      usedAgents: Array.from(orch.usedAgents),
      reports: orch.reports,
      roundHistory: orch.roundHistory.map((r) => ({
        roundNumber: r.roundNumber,
        selectedAgent: r.selectedAgent,
        selectedAt: r.selectedAt,
        status: r.status,
      })),
      currentRound: orch.currentRound,
      createdAt: orch.createdAt,
      poolingDeadline: orch.createdAt + config.orchestrator.poolingWindowMs,
    });
  } catch (err: any) {
    console.error(`[orchestrator] DB persist failed for query ${orch.queryId}: ${err.message}`);
  }
}

/**
 * Recover orchestration state from DB after restart.
 * Restores pools, re-creates timers.
 */
export function recoverFromDb() {
  const rows = db.loadAllActiveOrchestrations();
  if (rows.length === 0) {
    console.log("[orchestrator] No active orchestrations to recover");
    return;
  }

  console.log(`[orchestrator] Recovering ${rows.length} orchestrations from DB...`);

  for (const row of rows) {
    const pool: PooledAgent[] = JSON.parse(row.pool);
    const usedAgents: string[] = JSON.parse(row.used_agents);
    const reports: ReportSummary[] = JSON.parse(row.reports);
    const roundHistory = JSON.parse(row.round_history);

    const orch: QueryOrchestration = {
      queryId: row.query_id,
      state: row.state as OrchestratorState,
      pool,
      usedAgents: new Set(usedAgents),
      currentRound: null,
      roundHistory,
      reports,
      poolingTimer: null,
      createdAt: row.created_at,
    };

    orchestrations.set(row.query_id, orch);

    // Re-create timers based on state
    if (orch.state === "pooling") {
      const remaining = row.pooling_deadline - Date.now();
      if (remaining > 0) {
        orch.poolingTimer = setTimeout(() => {
          orch.poolingTimer = null;
          if (orch.pool.length >= config.orchestrator.minPoolSize) {
            startRounds(orch.queryId);
          }
        }, remaining);
      } else if (orch.pool.length >= config.orchestrator.minPoolSize) {
        // Timer already expired, start rounds immediately
        startRounds(orch.queryId);
      }
    }

    console.log(`[orchestrator] Recovered query ${row.query_id}: state=${row.state}, pool=${pool.length}`);
  }
}

// ========== PUBLIC API ==========

/**
 * Initialize orchestration for a newly created query.
 * Starts the pooling window timer.
 */
export function initOrchestration(queryId: string): QueryOrchestration {
  if (orchestrations.has(queryId)) {
    return orchestrations.get(queryId)!;
  }

  const orch: QueryOrchestration = {
    queryId,
    state: "pooling",
    pool: [],
    usedAgents: new Set(),
    currentRound: null,
    roundHistory: [],
    reports: [],
    poolingTimer: null,
    createdAt: Date.now(),
  };

  // Start pooling window — when it expires, start rounds
  orch.poolingTimer = setTimeout(() => {
    orch.poolingTimer = null;
    if (orch.pool.length >= config.orchestrator.minPoolSize) {
      startRounds(queryId);
    } else {
      // Not enough agents — stay in pooling, will start when minPoolSize reached
      console.log(`[orchestrator] query ${queryId}: pooling window expired with ${orch.pool.length} agents, waiting for more`);
    }
  }, config.orchestrator.poolingWindowMs);

  orchestrations.set(queryId, orch);
  persistOrch(orch);
  console.log(`[orchestrator] query ${queryId}: orchestration initialized, pooling for ${config.orchestrator.poolingWindowMs}ms`);
  return orch;
}

/**
 * Agent joins the pool for a query (free, no bond).
 */
export function joinPool(queryId: string, agent: { address: string; agentId: string }): JoinResult {
  let orch = orchestrations.get(queryId);

  // Lazy init if orchestration doesn't exist yet
  if (!orch) {
    orch = initOrchestration(queryId);
  }

  if (orch.state === "resolved" || orch.state === "cancelled") {
    return { ok: false, error: `Query orchestration is ${orch.state}` };
  }

  const normalizedAddress = agent.address.toLowerCase();

  // Check if already in pool
  if (orch.pool.some(a => a.address.toLowerCase() === normalizedAddress)) {
    return { ok: false, error: "Already joined this query pool" };
  }

  // Check pool size limit
  if (orch.pool.length >= config.orchestrator.maxPoolSize) {
    return { ok: false, error: "Pool is full" };
  }

  // Check if already used (reported or timed out in a round)
  if (orch.usedAgents.has(normalizedAddress)) {
    return { ok: false, error: "Already participated in this query" };
  }

  const pooledAgent: PooledAgent = {
    address: normalizedAddress,
    agentId: agent.agentId,
    joinedAt: Date.now(),
  };

  orch.pool.push(pooledAgent);
  persistOrch(orch);

  // Broadcast pool update
  broadcast("pool.update", {
    queryId,
    poolSize: orch.pool.length,
    agents: orch.pool.map(a => a.address),
  });

  // If we hit minPoolSize and pooling timer already expired, start rounds
  if (orch.state === "pooling" && !orch.poolingTimer && orch.pool.length >= config.orchestrator.minPoolSize) {
    startRounds(queryId);
  }

  // If pool reaches maxPoolSize, start rounds immediately
  if (orch.state === "pooling" && orch.pool.length >= config.orchestrator.maxPoolSize) {
    if (orch.poolingTimer) {
      clearTimeout(orch.poolingTimer);
      orch.poolingTimer = null;
    }
    startRounds(queryId);
  }

  return {
    ok: true,
    position: orch.pool.length,
    poolSize: orch.pool.length,
    status: orch.state,
  };
}

/**
 * Called when an agent successfully submits a report.
 * Clears the timeout, records the round, and advances.
 */
export function handleReport(queryId: string, reporter: string, reportSummary: ReportSummary): boolean {
  const orch = orchestrations.get(queryId);
  if (!orch || !orch.currentRound) return false;

  const normalizedReporter = reporter.toLowerCase();
  if (orch.currentRound.selectedAgent.address.toLowerCase() !== normalizedReporter) {
    return false;
  }

  // Clear timeout
  if (orch.currentRound.timeoutTimer) {
    clearTimeout(orch.currentRound.timeoutTimer);
    orch.currentRound.timeoutTimer = null;
  }

  orch.currentRound.status = "reported";
  orch.reports.push(reportSummary);

  // Broadcast report event
  broadcast("round.update", {
    queryId,
    roundNumber: orch.currentRound.roundNumber,
    selectedAgent: orch.currentRound.selectedAgent.address,
    state: "reported",
  });

  // Archive round and advance
  orch.roundHistory.push(orch.currentRound);
  orch.currentRound = null;
  persistOrch(orch);

  advanceOrStop(queryId);
  return true;
}

/**
 * Get orchestration state for a query.
 */
export function getOrchestration(queryId: string): QueryOrchestration | undefined {
  return orchestrations.get(queryId);
}

/**
 * Get pool info for a query (read-only).
 */
export function getPoolInfo(queryId: string) {
  const orch = orchestrations.get(queryId);
  if (!orch) return null;

  return {
    queryId: orch.queryId,
    state: orch.state,
    poolSize: orch.pool.length,
    agents: orch.pool.map(a => ({ address: a.address, agentId: a.agentId })),
    currentRound: orch.currentRound
      ? {
          roundNumber: orch.currentRound.roundNumber,
          selectedAgent: orch.currentRound.selectedAgent.address,
          status: orch.currentRound.status,
        }
      : null,
    totalRounds: orch.roundHistory.length,
    reportsCount: orch.reports.length,
  };
}

/**
 * Check if a given reporter is the currently selected agent.
 */
export function isSelectedAgent(queryId: string, reporter: string): boolean {
  const orch = orchestrations.get(queryId);
  if (!orch || !orch.currentRound) return false;
  if (orch.state !== "awaiting_report") return false;
  return orch.currentRound.selectedAgent.address.toLowerCase() === reporter.toLowerCase();
}

// ========== INTERNAL ==========

/**
 * Transition from pooling to active rounds.
 */
function startRounds(queryId: string) {
  const orch = orchestrations.get(queryId);
  if (!orch || orch.state !== "pooling") return;

  if (orch.poolingTimer) {
    clearTimeout(orch.poolingTimer);
    orch.poolingTimer = null;
  }

  console.log(`[orchestrator] query ${queryId}: starting rounds with ${orch.pool.length} agents`);

  broadcast("orchestration.started", {
    queryId,
    poolSize: orch.pool.length,
  });

  startNextRound(orch);
}

/**
 * Select the next agent and start a round.
 */
async function startNextRound(orch: QueryOrchestration) {
  orch.state = "selecting";

  const agent = selectNextAgent(orch);
  if (!agent) {
    // Pool exhausted
    orch.state = "resolved";
    persistOrch(orch);
    console.log(`[orchestrator] query ${orch.queryId}: pool exhausted`);
    broadcast("orchestration.ended", { queryId: orch.queryId, reason: "pool_exhausted" });
    return;
  }

  const roundNumber = orch.roundHistory.length + 1;
  const round: RoundState = {
    roundNumber,
    selectedAgent: agent,
    selectedAt: Date.now(),
    timeoutTimer: null,
    status: "pending",
  };

  orch.currentRound = round;
  orch.state = "awaiting_report";
  orch.usedAgents.add(agent.address.toLowerCase());
  persistOrch(orch);

  // Build state package for the selected agent
  const statePackage = await buildStatePackage(orch);

  // Unicast to selected agent
  sendToAgent(agent.address, "agent.selected", statePackage);

  // Broadcast round update to everyone
  broadcast("round.update", {
    queryId: orch.queryId,
    roundNumber,
    selectedAgent: agent.address,
    state: "awaiting_report",
  });

  console.log(`[orchestrator] query ${orch.queryId} round ${roundNumber}: selected agent ${agent.address}`);

  // Start timeout timer
  round.timeoutTimer = setTimeout(() => {
    onTimeout(orch.queryId);
  }, config.orchestrator.roundTimeoutMs);
}

/**
 * Pick a random agent from the pool who hasn't been used yet.
 */
function selectNextAgent(orch: QueryOrchestration): PooledAgent | null {
  const available = orch.pool.filter(a => !orch.usedAgents.has(a.address.toLowerCase()));
  if (available.length === 0) return null;

  // Cryptographically random selection
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  const index = randomBytes[0] % available.length;
  return available[index];
}

/**
 * Handle agent timeout — skip and advance to next.
 */
function onTimeout(queryId: string) {
  const orch = orchestrations.get(queryId);
  if (!orch || !orch.currentRound) return;

  console.log(`[orchestrator] query ${queryId} round ${orch.currentRound.roundNumber}: agent ${orch.currentRound.selectedAgent.address} timed out`);

  orch.currentRound.status = "timed_out";
  orch.currentRound.timeoutTimer = null;

  broadcast("agent.timeout", {
    queryId,
    roundNumber: orch.currentRound.roundNumber,
    timedOutAgent: orch.currentRound.selectedAgent.address,
  });

  // Archive and advance
  orch.roundHistory.push(orch.currentRound);
  orch.currentRound = null;
  persistOrch(orch);

  advanceOrStop(queryId);
}

/**
 * After a round completes (report or timeout), decide what's next.
 */
async function advanceOrStop(queryId: string) {
  const orch = orchestrations.get(queryId);
  if (!orch) return;

  // Check if query resolved on-chain (random stop may have triggered)
  try {
    const active = await contract.isQueryActive(BigInt(queryId));
    if (!active) {
      orch.state = "resolved";
      persistOrch(orch);
      console.log(`[orchestrator] query ${queryId}: resolved on-chain`);
      broadcast("orchestration.ended", { queryId, reason: "resolved" });
      return;
    }
  } catch (err) {
    console.error(`[orchestrator] query ${queryId}: error checking active status`, err);
  }

  // Check if there are more agents to select
  const available = orch.pool.filter(a => !orch.usedAgents.has(a.address.toLowerCase()));
  if (available.length === 0) {
    orch.state = "resolved";
    persistOrch(orch);
    console.log(`[orchestrator] query ${queryId}: pool exhausted`);
    broadcast("orchestration.ended", { queryId, reason: "pool_exhausted" });
    return;
  }

  // Continue with next round
  startNextRound(orch);
}

/**
 * Build the state package sent to the selected agent.
 * Includes question, all previous reports, current price, and bond amount.
 */
async function buildStatePackage(orch: QueryOrchestration): Promise<StatePackage> {
  const queryIdBigInt = BigInt(orch.queryId);

  const [queryInfo, queryParams] = await Promise.all([
    contract.getQueryInfo(queryIdBigInt),
    contract.getQueryParams(queryIdBigInt),
  ]);

  return {
    queryId: orch.queryId,
    roundNumber: orch.currentRound!.roundNumber,
    question: queryInfo.question,
    currentPrice: queryInfo.currentPrice.toString(),
    bondAmount: queryParams.bondAmount.toString(),
    reports: orch.reports,
    timeoutMs: config.orchestrator.roundTimeoutMs,
  };
}
