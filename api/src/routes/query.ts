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

        // Initialize orchestration for this query
        orchestrator.initOrchestration(queryId);

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
      const updatedInfo = await contract.getQueryInfo(queryId);
      db.updateQueryOnReport(Number(queryId), newReportCount, updatedInfo.currentPrice.toString());
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
query.get("/:id/status", async (c) => {
  try {
    const qId = c.req.param("id")!;
    const cacheKey = `query:${qId}:status`;

    // Return cached data if fresh (5s TTL)
    const cached = cacheGet<any>(cacheKey);
    if (cached) return c.json(cached);

    const queryId = BigInt(qId);

    const [info, params, reportCount] = await Promise.all([
      contract.getQueryInfo(queryId),
      contract.getQueryParams(queryId),
      contract.getReportCount(queryId),
    ]);

    const reports = [];
    for (let i = 0n; i < reportCount; i++) {
      const report = await contract.getReport(queryId, i);
      reports.push({
        agentId: report.agentId.toString(),
        reporter: report.reporter,
        probability: report.probability.toString(),
        priceBefore: report.priceBefore.toString(),
        priceAfter: report.priceAfter.toString(),
        bondAmount: report.bondAmount.toString(),
        sourceChain: report.sourceChain,
        timestamp: report.timestamp.toString(),
      });
    }

    const result = {
      queryId: qId,
      question: info.question,
      currentPrice: info.currentPrice.toString(),
      creator: info.creator,
      resolved: info.resolved,
      totalPool: info.totalPool.toString(),
      reportCount: info.reportCount.toString(),
      source: querySources.get(qId) || "",
      params: {
        alpha: params.alpha.toString(),
        k: params.k.toString(),
        flatReward: params.flatReward.toString(),
        bondAmount: params.bondAmount.toString(),
        liquidityParam: params.liquidityParam.toString(),
        createdAt: params.createdAt.toString(),
      },
      reports,
    };

    // Cache longer if resolved (30s) since data won't change
    cacheSet(cacheKey, result, info.resolved ? 30000 : 5000);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /query/:id/claim
 * Claim payout after resolution (free — no x402 payment required)
 *
 * Fee model (settlement rake):
 *   Agent earned 80 USDC gross
 *   Rake = 80 * 5% = 4 USDC
 *   Agent receives 76 USDC via direct ERC-20 transfer
 *   4 USDC stays in protocol treasury as revenue
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

    // Get gross payout from Hub contract
    const grossPayout = await contract.getPayoutAmount(queryId, reporter as Address);
    if (grossPayout === 0n) {
      return c.json({ error: "No payout available" }, 400);
    }

    // Calculate net payout after settlement rake
    const { rake, netPayout } = calculateNetPayout(grossPayout);

    // Record claim on Hub contract
    const hubResult = await contract.recordPayoutClaim(queryId, reporter as Address);

    // Determine payout chain: agent can override, otherwise use their bond source chain
    // Look up the agent's report to find which chain they bonded from
    let bondChain = "eip155:10143"; // fallback to Monad
    const reportCount = await contract.getReportCount(queryId);
    for (let i = 0n; i < reportCount; i++) {
      const report = await contract.getReport(queryId, i);
      if (report.reporter.toLowerCase() === (reporter as string).toLowerCase()) {
        bondChain = report.sourceChain || "eip155:10143";
        break;
      }
    }

    // Execute direct ERC-20 transfer from protocol treasury
    // Payout goes to the chain the agent bonded from, unless explicitly overridden
    let payoutResult;
    try {
      payoutResult = await executePayout(
        reporter as Address,
        netPayout,
        payoutChain || bondChain
      );
    } catch (payoutErr: any) {
      // Claim recorded but payout transfer failed — needs manual resolution
      return c.json({
        queryId: queryId.toString(),
        reporter,
        payout: {
          gross: grossPayout.toString(),
          rake: rake.toString(),
          net: netPayout.toString(),
        },
        hubTxHash: hubResult.hash,
        status: "claimed_pending_payout",
        error: `Claim recorded but payout transfer failed: ${payoutErr.message}. Contact support.`,
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
    const { rake, netPayout } = calculateNetPayout(grossPayout);

    return c.json({
      queryId: queryId.toString(),
      reporter,
      gross: grossPayout.toString(),
      rake: rake.toString(),
      net: netPayout.toString(),
      rakeRate: "5%",
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

    // Verify query exists and is active
    const active = await contract.isQueryActive(BigInt(queryId));
    if (!active) {
      return c.json({ error: "Query is not active" }, 409);
    }

    // Verify ERC-8004 registration
    const isRegistered = await contract.isRegisteredAgent(wallet as Address);
    if (!isRegistered) {
      return c.json({
        error: "Agent not registered. Mint ERC-8004 identity and call joinEcosystem first.",
        registrationEndpoint: "POST /agent/register",
      }, 403);
    }

    // Check if already reported on-chain
    const alreadyReported = await contract.hasReported(BigInt(queryId), wallet as Address);
    if (alreadyReported) {
      return c.json({ error: "Agent has already reported on this query" }, 409);
    }

    const agentId = await contract.getAgentId(wallet as Address);

    const result = orchestrator.joinPool(queryId, {
      address: wallet,
      agentId: agentId.toString(),
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
      description: "Deducted from positive payouts at claim time.",
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
