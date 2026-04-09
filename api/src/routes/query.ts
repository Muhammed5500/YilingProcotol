import { Hono } from "hono";
import { config } from "../config.js";
import * as contract from "../services/contract.js";
import * as orchestrator from "../services/orchestrator.js";
import * as db from "../services/db.js";
import { calculateCreationCharge, calculateNetPayout } from "../services/fees.js";
import { executePayout } from "../services/payout.js";
import { createTx, updateTx } from "../services/txTracker.js";
import { emitEvent } from "../services/webhooks.js";
import { cacheGet, cacheSet, cacheInvalidate } from "../services/cache.js";
import type { Address } from "viem";

type Env = {
  Variables: {
    paymentChain: string;
  };
};

const query = new Hono<Env>();

// Track query metadata (in-memory — not stored on hub contract)
// Maps queryId -> { paymentChain, source }
const queryPaymentChains = new Map<string, string>();
const querySources = new Map<string, string>();


/**
 * POST /query/create
 * Create a new truth discovery query
 *
 * Fee model (spread):
 *   Builder wants 500 USDC bond pool
 *   Creation fee = 500 * 15% = 75 USDC
 *   Builder pays 575 USDC total via x402
 *   500 goes to bond pool, 75 stays as revenue
 */
query.post("/create", async (c) => {
  try {
    const body = await c.req.json();
    const {
      question,
      alpha,
      k,
      flatReward,
      bondAmount,
      liquidityParam,
      initialPrice,
      bondPool,         // builder specifies desired bond pool size
      minReputation = 0,
      reputationTag = "",
      creator,
      queryChain,       // chain where payments happen (auto-detected or specified)
      source,           // application identifier (e.g. "yiling-market", "my-app")
    } = body;

    if (!question) return c.json({ error: "question is required" }, 400);
    if (!creator) return c.json({ error: "creator address is required" }, 400);
    if (!bondPool) return c.json({ error: "bondPool is required" }, 400);

    // Determine query chain from verified x402 payment, not self-reported body
    const paymentChain = c.get("paymentChain") as string | undefined;
    const chain = paymentChain || queryChain || "eip155:10143";

    // Calculate fees
    const charge = calculateCreationCharge(BigInt(bondPool));

    // Track transaction state
    const tx = createTx("create_query", {
      amount: charge.totalCharge.toString(),
    });

    // Only the bond pool goes to the Hub contract
    try {
      const result = await contract.createQuery({
        question,
        alpha: BigInt(alpha),
        k: BigInt(k),
        flatReward: BigInt(flatReward),
        bondAmount: BigInt(bondAmount),
        liquidityParam: BigInt(liquidityParam),
        initialPrice: BigInt(initialPrice),
        fundingAmount: charge.bondPool,
        minReputation: BigInt(minReputation),
        reputationTag,
        creator: creator as Address,
        queryChain: chain,
        source: source || "",
      });

      updateTx(tx.id, { state: "hub_confirmed", hubTxHash: result.hash });

      // x402 settlement happens automatically via middleware
      updateTx(tx.id, { state: "settled" });

      // Parse queryId from QueryCreated event log
      let queryId: string | undefined;
      const queryCreatedTopic = "0x" + "QueryCreated".padEnd(64, "0"); // not exact, parse from logs
      for (const log of result.receipt.logs) {
        // QueryCreated event has queryId as first indexed topic
        if (log.topics.length >= 2 && log.address.toLowerCase() === (config.skcEngineAddress || "").toLowerCase()) {
          queryId = BigInt(log.topics[1]!).toString();
          break;
        }
      }

      // Cache source and payment chain for this query
      if (queryId) {
        if (source) querySources.set(queryId, source);
        queryPaymentChains.set(queryId, chain);
        // Also update the global source cache in index.ts
        const { cacheQuerySource } = await import("../index.js");
        cacheQuerySource(queryId, source || "");

        // Initialize orchestration for this query (pass payment chain so agents know where to bond)
        orchestrator.initOrchestration(queryId, chain);

        // Persist query to DB
        db.upsertQuery(Number(queryId), {
          question,
          current_price: (initialPrice || "500000000000000000").toString(),
          creator,
          source: source || "",
          total_pool: charge.bondPool.toString(),
          alpha: alpha?.toString(),
          k: k?.toString(),
          flat_reward: flatReward?.toString(),
          bond_amount: bondAmount?.toString(),
          liquidity_param: liquidityParam?.toString(),
        });
      }

      emitEvent("query.created", {
        txHash: result.hash,
        txId: tx.id,
        queryId,
        question,
        creator,
        source: source || "",
        paymentChain: chain,
        bondPool: charge.bondPool.toString(),
        creationFee: charge.creationFee.toString(),
      });

      return c.json({
        txHash: result.hash,
        txId: tx.id,
        queryId,
        status: "created",
        source: source || "",
        paymentChain: chain,
        fees: {
          bondPool: charge.bondPool.toString(),
          creationFee: charge.creationFee.toString(),
          totalCharged: charge.totalCharge.toString(),
        },
      });
    } catch (hubErr: any) {
      updateTx(tx.id, { state: "hub_failed", error: hubErr.message });
      throw hubErr;
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /query/:id/report
 * Submit a report for a query (agent submits prediction)
 *
 * Agent pays bond amount via x402. No fee on agent participation.
 *
 * Race condition protection:
 *   After x402 payment is verified but BEFORE settlement,
 *   check if query is still active. If resolved (random stop
 *   triggered by another agent), reject and do NOT settle payment.
 */
query.post("/:id/report", async (c) => {
  try {
    const queryId = BigInt(c.req.param("id")!);
    const body = await c.req.json();
    const { probability, reporter, sourceChain: bodySourceChain } = body;

    if (!probability) return c.json({ error: "probability is required" }, 400);
    if (!reporter) return c.json({ error: "reporter address is required" }, 400);

    // Orchestrator guard: if orchestration exists, only selected agent can report
    const orch = orchestrator.getOrchestration(queryId.toString());
    if (orch) {
      if (orch.state !== "awaiting_report") {
        return c.json({
          error: "Not accepting reports in current state",
          orchestrationState: orch.state,
        }, 409);
      }
      if (!orchestrator.isSelectedAgent(queryId.toString(), reporter)) {
        return c.json({
          error: "Not your turn. Wait for agent.selected event.",
          orchestrationState: orch.state,
        }, 403);
      }
    }

    // Use verified payment chain from x402 middleware, not self-reported body
    const paymentChain = c.get("paymentChain") as string | undefined;
    const sourceChain = paymentChain || bodySourceChain || "unknown";

    // Pre-check: bond must be paid on query's chain (avoid wasting gas on ChainMismatch revert)
    const expectedChain = orch?.queryChain;
    if (expectedChain && sourceChain !== "unknown" && sourceChain !== expectedChain) {
      return c.json({
        error: "Bond must be paid on query chain",
        expected: expectedChain,
        received: sourceChain,
      }, 400);
    }

    // Race condition check: verify query is still active BEFORE submitting
    const active = await contract.isQueryActive(queryId);
    if (!active) {
      return c.json({
        error: "Query is no longer active (may have been resolved by random stop)",
        queryId: queryId.toString(),
        status: "rejected_resolved",
      }, 409);
    }

    // Check if agent already reported
    const alreadyReported = await contract.hasReported(queryId, reporter as Address);
    if (alreadyReported) {
      return c.json({
        error: "Agent has already reported on this query",
        queryId: queryId.toString(),
        status: "rejected_duplicate",
      }, 409);
    }

    // Pre-check: agent must be registered (avoid wasting gas on AgentNotRegistered revert)
    const isRegistered = await contract.isRegisteredAgent(reporter as Address);
    if (!isRegistered) {
      return c.json({
        error: "Agent not registered. Mint ERC-8004 identity and call joinEcosystem first.",
        registrationEndpoint: "POST /agent/register",
      }, 403);
    }

    const params = await contract.getQueryParams(queryId);

    const tx = createTx("submit_report", {
      queryId: queryId.toString(),
      reporter,
      amount: params.bondAmount.toString(),
      sourceChain: sourceChain || "unknown",
    });

    try {
      const result = await contract.submitReport({
        queryId,
        probability: BigInt(probability),
        reporter: reporter as Address,
        bondAmount: params.bondAmount,
        sourceChain: sourceChain || "unknown",
      });

      updateTx(tx.id, { state: "hub_confirmed", hubTxHash: result.hash });
      updateTx(tx.id, { state: "settled" });

      const resolvedAfter = !(await contract.isQueryActive(queryId));

      // Notify orchestrator that report was submitted
      if (orch) {
        // Get report details from chain for the summary
        const reportCount = await contract.getReportCount(queryId);
        const latestReport = await contract.getReport(queryId, reportCount - 1n);

        orchestrator.handleReport(queryId.toString(), reporter, {
          roundNumber: orch.currentRound?.roundNumber ?? 0,
          reporter,
          probability: probability.toString(),
          priceBefore: latestReport.priceBefore.toString(),
          priceAfter: latestReport.priceAfter.toString(),
          timestamp: new Date().toISOString(),
        });
      }

      // Update DB with new report count and price
      const newReportCount = Number(await contract.getReportCount(queryId));
      const latestReportForDb = await contract.getReport(queryId, BigInt(newReportCount - 1));
      db.updateQueryOnReport(Number(queryId), newReportCount, latestReportForDb.priceAfter.toString());

      // Insert report into DB
      db.insertReport(Number(queryId), newReportCount - 1, {
        agentId: latestReportForDb.agentId.toString(),
        reporter: latestReportForDb.reporter,
        probability: latestReportForDb.probability.toString(),
        priceBefore: latestReportForDb.priceBefore.toString(),
        priceAfter: latestReportForDb.priceAfter.toString(),
        bondAmount: latestReportForDb.bondAmount.toString(),
        sourceChain: latestReportForDb.sourceChain,
        timestamp: latestReportForDb.timestamp.toString(),
      });

      // Cache agent registration
      db.upsertAgent(latestReportForDb.reporter, latestReportForDb.agentId.toString());
      if (resolvedAfter) {
        db.markResolved(Number(queryId));
      }

      // Invalidate cache after new report
      cacheInvalidate(`query:${queryId.toString()}`);
      cacheInvalidate("queries:active");

      emitEvent("report.submitted", {
        queryId: queryId.toString(),
        txHash: result.hash,
        reporter,
        probability,
        bondAmount: params.bondAmount.toString(),
        sourceChain: sourceChain || "unknown",
      });

      if (resolvedAfter) {
        emitEvent("query.resolved", {
          queryId: queryId.toString(),
          txHash: result.hash,
        });
      }

      return c.json({
        queryId: queryId.toString(),
        txHash: result.hash,
        txId: tx.id,
        reporter,
        bondAmount: params.bondAmount.toString(),
        paymentChain: sourceChain,
        status: "submitted",
        queryResolved: resolvedAfter,
      });
    } catch (hubErr: any) {
      updateTx(tx.id, { state: "hub_failed", error: hubErr.message });
      throw hubErr;
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * GET /query/:id/status
 * Get query status and details (free)
 */
query.get("/:id/status", (c) => {
  try {
    const qId = c.req.param("id")!;

    const queryRow = db.getQuery(Number(qId));
    if (!queryRow) {
      return c.json({ error: "Query not found" }, 404);
    }

    const reportRows = db.getReports(Number(qId));

    const result = {
      queryId: qId,
      question: queryRow.question,
      currentPrice: queryRow.current_price,
      creator: queryRow.creator,
      resolved: queryRow.resolved === 1,
      totalPool: queryRow.total_pool,
      reportCount: queryRow.report_count.toString(),
      source: queryRow.source,
      params: {
        alpha: queryRow.alpha || "0",
        k: queryRow.k || "0",
        flatReward: queryRow.flat_reward || "0",
        bondAmount: queryRow.bond_amount || "0",
        liquidityParam: queryRow.liquidity_param || "0",
        createdAt: queryRow.created_at?.toString() || "0",
      },
      reports: reportRows.map((r) => ({
        agentId: r.agent_id,
        reporter: r.reporter,
        probability: r.probability,
        priceBefore: r.price_before,
        priceAfter: r.price_after,
        bondAmount: r.bond_amount,
        sourceChain: r.source_chain,
        timestamp: r.timestamp,
      })),
    };

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /query/:id/claim
 * Claim payout after resolution (free — no x402 payment required)
 *
 * Fee model (settlement rake — profit only):
 *   Agent deposited 1 USDC bond, earned 1.80 USDC gross
 *   Profit = 1.80 - 1.00 = 0.80 USDC
 *   Rake = 0.80 * 5% = 0.04 USDC
 *   Agent receives 1.76 USDC via direct ERC-20 transfer
 *
 * IMPORTANT: Payouts use direct ERC-20 transfers from protocol
 * treasury wallets, NOT x402. x402 is pull-only (client→server).
 * This is a custodial operation — Phase 1 trust assumption.
 */
query.post("/:id/claim", async (c) => {
  try {
    const queryId = BigInt(c.req.param("id")!);
    const body = await c.req.json();
    const { reporter, payoutChain } = body;

    if (!reporter) return c.json({ error: "reporter address is required" }, 400);

    // Pre-check: did this agent even report? (DB only, no RPC)
    const dbReports = db.getReports(Number(queryId));
    const hasReported = dbReports.some(
      (r) => r.reporter.toLowerCase() === (reporter as string).toLowerCase()
    );
    if (!hasReported) {
      return c.json({ error: "No report found for this agent" }, 400);
    }

    // Pre-check: already claimed?
    const alreadyClaimed = await contract.hasClaimed(queryId, reporter as Address);
    if (alreadyClaimed) {
      return c.json({ error: "Already claimed", status: "already_claimed" }, 409);
    }

    // Get gross payout from Hub contract
    const grossPayout = await contract.getPayoutAmount(queryId, reporter as Address);
    if (grossPayout === 0n) {
      return c.json({ error: "No payout available" }, 400);
    }

    // Determine payout chain and bond amount from agent's report
    let bondChain = "eip155:10143"; // fallback to Monad
    let agentBondAmount = 0n;
    const reportCount = await contract.getReportCount(queryId);
    for (let i = 0n; i < reportCount; i++) {
      const report = await contract.getReport(queryId, i);
      if (report.reporter.toLowerCase() === (reporter as string).toLowerCase()) {
        bondChain = report.sourceChain || "eip155:10143";
        agentBondAmount = report.bondAmount;
        break;
      }
    }

    // Calculate net payout — rake only applies to profit above bond
    const { rake, netPayout } = calculateNetPayout(grossPayout, agentBondAmount);

    // Execute ERC-20 transfer FIRST (before recording claim on-chain)
    // This way, if transfer fails, agent can retry — they aren't marked as claimed yet
    let payoutResult;
    try {
      payoutResult = await executePayout(
        reporter as Address,
        netPayout,
        payoutChain || bondChain
      );
    } catch (payoutErr: any) {
      // Transfer failed — agent NOT marked as claimed, can retry later
      return c.json({
        queryId: queryId.toString(),
        reporter,
        error: `Payout transfer failed: ${payoutErr.message}. You can retry.`,
      }, 500);
    }

    // Record claim on Hub contract (transfer already succeeded)
    let hubResult;
    try {
      hubResult = await contract.recordPayoutClaim(queryId, reporter as Address);
    } catch (hubErr: any) {
      // Transfer succeeded but on-chain record failed — agent got paid, needs reconciliation
      return c.json({
        queryId: queryId.toString(),
        reporter,
        payout: {
          gross: grossPayout.toString(),
          rake: rake.toString(),
          net: netPayout.toString(),
          chain: payoutResult.chain,
          payoutTxHash: payoutResult.txHash,
        },
        status: "paid_pending_record",
        error: `Payout sent but on-chain record failed: ${hubErr.message}`,
      }, 202);
    }

    emitEvent("payout.claimed", {
      queryId: queryId.toString(),
      reporter,
      gross: grossPayout.toString(),
      rake: rake.toString(),
      net: netPayout.toString(),
      chain: payoutResult.chain,
      payoutTxHash: payoutResult.txHash,
    });

    return c.json({
      queryId: queryId.toString(),
      reporter,
      payout: {
        gross: grossPayout.toString(),
        rake: rake.toString(),
        net: netPayout.toString(),
        chain: payoutResult.chain,
        payoutTxHash: payoutResult.txHash,
      },
      hubTxHash: hubResult.hash,
      status: "claimed",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * GET /query/:id/payout
 * Preview payout amounts before claiming (free)
 */
query.get("/:id/payout/:reporter", async (c) => {
  try {
    const queryId = BigInt(c.req.param("id")!);
    const reporter = c.req.param("reporter") as Address;

    const grossPayout = await contract.getPayoutAmount(queryId, reporter);

    // Find agent's bond amount for profit-only rake calculation
    let agentBondAmount = 0n;
    const reportCount = await contract.getReportCount(queryId);
    for (let i = 0n; i < reportCount; i++) {
      const report = await contract.getReport(queryId, i);
      if (report.reporter.toLowerCase() === reporter.toLowerCase()) {
        agentBondAmount = report.bondAmount;
        break;
      }
    }

    const { rake, netPayout } = calculateNetPayout(grossPayout, agentBondAmount);

    return c.json({
      queryId: queryId.toString(),
      reporter,
      gross: grossPayout.toString(),
      bond: agentBondAmount.toString(),
      rake: rake.toString(),
      net: netPayout.toString(),
      rakeRate: "5% (profit only)",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /query/:id/join
 * Join the agent pool for a query (free, no bond, no x402)
 *
 * Requires ERC-8004 identity registration.
 * Agent will be eligible for random selection in prediction rounds.
 * Bond is only charged when the agent actually submits a prediction.
 */
query.post("/:id/join", async (c) => {
  try {
    const queryId = c.req.param("id")!;
    const body = await c.req.json();
    const { wallet } = body;

    if (!wallet) return c.json({ error: "wallet address is required" }, 400);

    const walletLower = (wallet as string).toLowerCase();

    // Check agent registration — DB first, chain fallback
    let agentRow = db.getAgent(walletLower);
    if (!agentRow) {
      const [isRegistered, agentId] = await Promise.all([
        contract.isRegisteredAgent(wallet as Address),
        contract.getAgentId(wallet as Address).catch(() => 0n),
      ]);
      if (isRegistered) {
        db.upsertAgent(walletLower, agentId.toString());
        agentRow = { wallet: walletLower, agent_id: agentId.toString(), is_registered: 1, registered_at: Date.now() };
      }
    }

    if (!agentRow || agentRow.is_registered !== 1) {
      return c.json({
        error: "Agent not registered. Mint ERC-8004 identity and call joinEcosystem first.",
        registrationEndpoint: "POST /agent/register",
      }, 403);
    }

    // Query active check uses DB (no RPC needed — DB is kept in sync)
    const queryRow = db.getQuery(Number(queryId));
    if (queryRow?.resolved) {
      return c.json({ error: "Query is not active" }, 409);
    }

    const result = orchestrator.joinPool(queryId, {
      address: wallet,
      agentId: agentRow.agent_id,
    });

    if (!result.ok) {
      return c.json({ error: result.error }, 409);
    }

    return c.json({
      queryId,
      position: result.position,
      poolSize: result.poolSize,
      orchestrationStatus: result.status,
      message: "Joined pool. Listen to SSE events for agent.selected notification.",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * GET /query/:id/pool
 * Get current orchestration pool status (free)
 */
query.get("/:id/pool", async (c) => {
  try {
    const queryId = c.req.param("id")!;
    const poolInfo = orchestrator.getPoolInfo(queryId);

    if (!poolInfo) {
      return c.json({ error: "No orchestration found for this query" }, 404);
    }

    return c.json(poolInfo);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * GET /query/pricing
 * Show current fee structure (free)
 */
query.get("/pricing", async (c) => {
  return c.json({
    creationFee: {
      rate: "15%",
      minimum: "10 USDC",
      description: "Applied on top of bond pool. Builder pays bondPool + 15%.",
      example: {
        bondPool: "500 USDC",
        creationFee: "75 USDC",
        totalCharge: "575 USDC",
      },
    },
    settlementRake: {
      rate: "5%",
      description: "Deducted from profit only (gross - bond) at claim time. No rake on bond return or losses.",
      example: {
        grossPayout: "80 USDC",
        rake: "4 USDC",
        netPayout: "76 USDC",
      },
    },
    agentParticipationFee: {
      rate: "0%",
      description: "Agents are never charged to participate. Bond is returned or rewarded based on accuracy.",
    },
  });
});

/**
 * POST /query/:id/resolve
 * Force resolve a query
 */
query.post("/:id/resolve", async (c) => {
  try {
    const queryId = BigInt(c.req.param("id")!);
    const result = await contract.forceResolve(queryId);

    // Update DB
    db.markResolved(Number(queryId));

    // Invalidate cache after resolve
    cacheInvalidate(`query:${queryId.toString()}`);
    cacheInvalidate("queries:active");

    emitEvent("query.resolved", {
      queryId: queryId.toString(),
      txHash: result.hash,
    });

    return c.json({
      queryId: queryId.toString(),
      txHash: result.hash,
      status: "resolved",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/** Get the source tag for a query (used by /queries/active filter) */
export function getQuerySource(queryId: string): string {
  return querySources.get(queryId) || "";
}

export default query;
