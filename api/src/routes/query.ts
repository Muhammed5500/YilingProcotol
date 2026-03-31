import { Hono } from "hono";
import * as contract from "../services/contract.js";
import { calculateCreationCharge, calculateNetPayout } from "../services/fees.js";
import { executePayout } from "../services/payout.js";
import { createTx, updateTx } from "../services/txTracker.js";
import type { Address } from "viem";

const query = new Hono();

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
    } = body;

    if (!question) return c.json({ error: "question is required" }, 400);
    if (!creator) return c.json({ error: "creator address is required" }, 400);
    if (!bondPool) return c.json({ error: "bondPool is required" }, 400);

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
      });

      updateTx(tx.id, { state: "hub_confirmed", hubTxHash: result.hash });

      // x402 settlement happens automatically via middleware
      updateTx(tx.id, { state: "settled" });

      return c.json({
        txHash: result.hash,
        txId: tx.id,
        status: "created",
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
    const { probability, reporter, sourceChain } = body;

    if (!probability) return c.json({ error: "probability is required" }, 400);
    if (!reporter) return c.json({ error: "reporter address is required" }, 400);

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

      return c.json({
        queryId: queryId.toString(),
        txHash: result.hash,
        txId: tx.id,
        reporter,
        bondAmount: params.bondAmount.toString(),
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
    const queryId = BigInt(c.req.param("id")!);

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

    return c.json({
      queryId: c.req.param("id"),
      question: info.question,
      currentPrice: info.currentPrice.toString(),
      creator: info.creator,
      resolved: info.resolved,
      totalPool: info.totalPool.toString(),
      reportCount: info.reportCount.toString(),
      params: {
        alpha: params.alpha.toString(),
        k: params.k.toString(),
        flatReward: params.flatReward.toString(),
        bondAmount: params.bondAmount.toString(),
        liquidityParam: params.liquidityParam.toString(),
        createdAt: params.createdAt.toString(),
      },
      reports,
    });
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

    // Execute direct ERC-20 transfer from protocol treasury
    // Agent specifies payoutChain, or defaults to their bond source chain
    let payoutResult;
    try {
      payoutResult = await executePayout(
        reporter as Address,
        netPayout,
        payoutChain || "eip155:84532" // default to Base Sepolia
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

    return c.json({
      queryId: queryId.toString(),
      txHash: result.hash,
      status: "resolved",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default query;
