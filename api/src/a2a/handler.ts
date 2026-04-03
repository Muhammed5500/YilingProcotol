import { Hono } from "hono";
import { createAgentCard } from "./agent-card.js";
import * as contract from "../services/contract.js";
import { calculateCreationCharge, calculateNetPayout } from "../services/fees.js";
import type { Address } from "viem";

/**
 * A2A Message Handler for Yiling Protocol
 *
 * Handles incoming A2A tasks from external agents.
 * External agent sends a question → Yiling creates a query → agents solve it → result returns.
 *
 * Task lifecycle: submitted → working → completed/rejected
 */

interface A2ATask {
  id: string;
  status: "submitted" | "working" | "completed" | "rejected";
  skill: string;
  input: any;
  output?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory task store (replace with DB in production)
const tasks = new Map<string, A2ATask>();

export function createA2ARoutes(baseUrl: string) {
  const a2a = new Hono();

  // Agent Card discovery
  a2a.get("/.well-known/agent-card.json", (c) => {
    return c.json(createAgentCard(baseUrl));
  });

  // Submit a new task
  a2a.post("/a2a/tasks", async (c) => {
    try {
      const body = await c.req.json();
      const { skill, input } = body;

      const taskId = crypto.randomUUID();
      const now = new Date().toISOString();

      const task: A2ATask = {
        id: taskId,
        status: "submitted",
        skill,
        input,
        createdAt: now,
        updatedAt: now,
      };

      tasks.set(taskId, task);

      // Process task asynchronously
      processTask(taskId).catch(console.error);

      return c.json({ taskId, status: "submitted" }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  // Get task status
  a2a.get("/a2a/tasks/:taskId", (c) => {
    const taskId = c.req.param("taskId")!;
    const task = tasks.get(taskId);

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    return c.json(task);
  });

  return a2a;
}

/**
 * Process an A2A task asynchronously
 */
async function processTask(taskId: string) {
  const task = tasks.get(taskId);
  if (!task) return;

  task.status = "working";
  task.updatedAt = new Date().toISOString();

  try {
    switch (task.skill) {
      case "truth-discovery":
        await handleTruthDiscovery(task);
        break;
      case "agent-reputation":
        await handleReputationCheck(task);
        break;
      default:
        task.status = "rejected";
        task.error = `Unknown skill: ${task.skill}`;
    }
  } catch (err: any) {
    task.status = "rejected";
    task.error = err.message;
  }

  task.updatedAt = new Date().toISOString();
}

/**
 * Handle truth-discovery skill
 *
 * Input: { question, bondPool, params... }
 * Output: { queryId, status, result... }
 */
async function handleTruthDiscovery(task: A2ATask) {
  const { question, bondPool, alpha, k, flatReward, bondAmount, liquidityParam, initialPrice, creator } = task.input;

  if (!question) {
    task.status = "rejected";
    task.error = "question is required";
    return;
  }

  const charge = calculateCreationCharge(BigInt(bondPool || "1000000000"));

  const result = await contract.createQuery({
    question,
    alpha: BigInt(alpha || "200000000000000000"),
    k: BigInt(k || "1"),
    flatReward: BigInt(flatReward || "10000000000000000"),
    bondAmount: BigInt(bondAmount || "100000000000000000"),
    liquidityParam: BigInt(liquidityParam || "1000000000000000000"),
    initialPrice: BigInt(initialPrice || "500000000000000000"),
    fundingAmount: charge.bondPool,
    minReputation: 0n,
    reputationTag: "",
    creator: (creator || "0x0000000000000000000000000000000000000000") as Address,
    queryChain: "eip155:10143",
    source: "a2a",
  });

  task.status = "completed";
  task.output = {
    queryId: "pending",
    txHash: result.hash,
    fees: {
      bondPool: charge.bondPool.toString(),
      creationFee: charge.creationFee.toString(),
      totalCharged: charge.totalCharge.toString(),
    },
    note: "Query created. Agents will analyze and report. Check status via GET /query/{id}/status",
  };
}

/**
 * Handle agent-reputation skill
 *
 * Input: { agentId, tag? }
 * Output: { score, feedbackCount... }
 */
async function handleReputationCheck(task: A2ATask) {
  const { agentId, tag } = task.input;

  if (!agentId) {
    task.status = "rejected";
    task.error = "agentId is required";
    return;
  }

  const id = BigInt(agentId);
  const reputation = tag
    ? await contract.getAgentReputationByTag(id, tag)
    : await contract.getAgentReputation(id);

  task.status = "completed";
  task.output = {
    agentId,
    tag: tag || "general",
    feedbackCount: reputation.count.toString(),
    score: reputation.value.toString(),
    decimals: reputation.decimals,
  };
}
