import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as contract from "../services/contract.js";
import { calculateCreationCharge, calculateNetPayout } from "../services/fees.js";
import type { Address } from "viem";

/**
 * Yiling Protocol MCP Server
 *
 * Exposes truth discovery as tools for AI agents.
 * Agents can autonomously:
 *   - Discover open queries
 *   - Submit reports (predictions)
 *   - Check reputation
 *   - Claim payouts
 *
 * x402 payments handled via MCP transport.
 */
export function createMCPServer() {
  const server = new McpServer({
    name: "Yiling Protocol",
    version: "0.1.0",
  });

  // ========== DISCOVERY TOOLS ==========

  server.tool(
    "list_queries",
    "List all active (unresolved) truth discovery queries in the Yiling ecosystem",
    {},
    async () => {
      const totalQueries = await contract.getQueryCount();
      const activeQueries = [];

      for (let i = 0n; i < totalQueries; i++) {
        const info = await contract.getQueryInfo(i);
        if (!info.resolved) {
          const params = await contract.getQueryParams(i);
          activeQueries.push({
            queryId: i.toString(),
            question: info.question,
            currentPrice: info.currentPrice.toString(),
            bondAmount: params.bondAmount.toString(),
            reportCount: info.reportCount.toString(),
            totalPool: info.totalPool.toString(),
          });
        }
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(activeQueries, null, 2) }],
      };
    }
  );

  server.tool(
    "get_query",
    "Get detailed information about a specific query",
    {
      queryId: z.string().describe("The query ID to look up"),
    },
    async ({ queryId }) => {
      const id = BigInt(queryId);
      const [info, params, reportCount] = await Promise.all([
        contract.getQueryInfo(id),
        contract.getQueryParams(id),
        contract.getReportCount(id),
      ]);

      const reports = [];
      for (let i = 0n; i < reportCount; i++) {
        const report = await contract.getReport(id, i);
        reports.push({
          agentId: report.agentId.toString(),
          probability: report.probability.toString(),
          priceBefore: report.priceBefore.toString(),
          priceAfter: report.priceAfter.toString(),
        });
      }

      const result = {
        queryId,
        question: info.question,
        currentPrice: info.currentPrice.toString(),
        resolved: info.resolved,
        totalPool: info.totalPool.toString(),
        reportCount: info.reportCount.toString(),
        params: {
          alpha: params.alpha.toString(),
          k: params.k.toString(),
          bondAmount: params.bondAmount.toString(),
          flatReward: params.flatReward.toString(),
        },
        reports,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ========== PARTICIPATION TOOLS ==========

  server.tool(
    "submit_report",
    "Submit a probability report for a query. Requires bond payment via x402. You must be a registered ERC-8004 agent.",
    {
      queryId: z.string().describe("The query ID to report on"),
      probability: z.string().describe("Your probability estimate in WAD format (e.g., '700000000000000000' for 0.7)"),
      reporter: z.string().describe("Your wallet address (must be registered via ERC-8004)"),
      sourceChain: z.string().describe("Chain where you paid bond (e.g., 'eip155:84532')"),
    },
    async ({ queryId, probability, reporter, sourceChain }) => {
      try {
        const id = BigInt(queryId);
        const params = await contract.getQueryParams(id);

        const result = await contract.submitReport({
          queryId: id,
          probability: BigInt(probability),
          reporter: reporter as Address,
          bondAmount: params.bondAmount,
          sourceChain,
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: "submitted",
              queryId,
              txHash: result.hash,
              bondAmount: params.bondAmount.toString(),
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "create_query",
    "Create a new truth discovery query. Requires x402 payment (bondPool + 15% creation fee).",
    {
      question: z.string().describe("The question to resolve"),
      bondPool: z.string().describe("Total bond pool size in smallest unit (e.g., '500000000' for 500 USDC)"),
      alpha: z.string().describe("Stop probability per report in WAD (e.g., '200000000000000000' for 20%)"),
      k: z.string().describe("Number of last agents getting flat reward"),
      flatReward: z.string().describe("Flat reward per last-k agent"),
      bondAmount: z.string().describe("Required bond per report"),
      liquidityParam: z.string().describe("LMSR scaling parameter in WAD"),
      initialPrice: z.string().describe("Starting price in WAD (e.g., '500000000000000000' for 0.5)"),
      creator: z.string().describe("Creator wallet address"),
    },
    async ({ question, bondPool, alpha, k, flatReward, bondAmount, liquidityParam, initialPrice, creator }) => {
      try {
        const charge = calculateCreationCharge(BigInt(bondPool));

        const result = await contract.createQuery({
          question,
          alpha: BigInt(alpha),
          k: BigInt(k),
          flatReward: BigInt(flatReward),
          bondAmount: BigInt(bondAmount),
          liquidityParam: BigInt(liquidityParam),
          initialPrice: BigInt(initialPrice),
          fundingAmount: charge.bondPool,
          minReputation: 0n,
          reputationTag: "",
          creator: creator as Address,
          queryChain: "eip155:10143",
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: "created",
              txHash: result.hash,
              fees: {
                bondPool: charge.bondPool.toString(),
                creationFee: charge.creationFee.toString(),
                totalCharged: charge.totalCharge.toString(),
              },
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ========== PAYOUT TOOLS ==========

  server.tool(
    "check_payout",
    "Check your payout amount for a resolved query (before claiming)",
    {
      queryId: z.string().describe("The query ID"),
      reporter: z.string().describe("Your wallet address"),
    },
    async ({ queryId, reporter }) => {
      const id = BigInt(queryId);
      const grossPayout = await contract.getPayoutAmount(id, reporter as Address);
      const { rake, netPayout } = calculateNetPayout(grossPayout);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            queryId,
            reporter,
            gross: grossPayout.toString(),
            rake: rake.toString(),
            net: netPayout.toString(),
            rakeRate: "5%",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "claim_payout",
    "Claim your payout for a resolved query. 5% settlement rake is deducted. Payout is sent as a direct ERC-20 transfer from protocol treasury (not x402).",
    {
      queryId: z.string().describe("The query ID"),
      reporter: z.string().describe("Your wallet address"),
      payoutChain: z.string().optional().describe("Chain for payout (CAIP-2 format, e.g., 'eip155:84532'). Defaults to Base Sepolia."),
    },
    async ({ queryId, reporter, payoutChain }) => {
      try {
        const id = BigInt(queryId);
        const grossPayout = await contract.getPayoutAmount(id, reporter as Address);

        if (grossPayout === 0n) {
          return {
            content: [{ type: "text" as const, text: "No payout available for this query." }],
            isError: true,
          };
        }

        const { rake, netPayout } = calculateNetPayout(grossPayout);
        const hubResult = await contract.recordPayoutClaim(id, reporter as Address);

        // Payout via direct ERC-20 transfer from treasury
        const { executePayout } = await import("../services/payout.js");
        const payoutResult = await executePayout(
          reporter as Address,
          netPayout,
          payoutChain || "eip155:84532"
        );

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: "claimed",
              hubTxHash: hubResult.hash,
              payoutTxHash: payoutResult.txHash,
              payoutChain: payoutResult.chain,
              payout: {
                gross: grossPayout.toString(),
                rake: rake.toString(),
                net: netPayout.toString(),
              },
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ========== REPUTATION TOOLS ==========

  server.tool(
    "get_reputation",
    "Check an agent's reputation score from ERC-8004",
    {
      agentId: z.string().describe("The agent's ERC-8004 ID"),
      tag: z.string().optional().describe("Optional: filter by application type (e.g., 'governance', 'dispute')"),
    },
    async ({ agentId, tag }) => {
      const id = BigInt(agentId);
      const reputation = tag
        ? await contract.getAgentReputationByTag(id, tag)
        : await contract.getAgentReputation(id);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            agentId,
            tag: tag || "general",
            feedbackCount: reputation.count.toString(),
            score: reputation.value.toString(),
            decimals: reputation.decimals,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "check_registration",
    "Check if a wallet address is registered as an agent in the Yiling ecosystem",
    {
      address: z.string().describe("The wallet address to check"),
    },
    async ({ address }) => {
      const [isRegistered, agentId] = await Promise.all([
        contract.isRegisteredAgent(address as Address),
        contract.getAgentId(address as Address),
      ]);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            address,
            isRegistered,
            agentId: agentId.toString(),
          }, null, 2),
        }],
      };
    }
  );

  // ========== INFO TOOLS ==========

  server.tool(
    "get_pricing",
    "View the current fee structure for Yiling Protocol",
    {},
    async () => {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            creationFee: "15% of bond pool (min 10 USDC)",
            settlementRake: "5% of positive payouts",
            agentParticipationFee: "0% — agents are never charged to participate",
          }, null, 2),
        }],
      };
    }
  );

  return server;
}
