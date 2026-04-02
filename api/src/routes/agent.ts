import { Hono } from "hono";
import * as contract from "../services/contract.js";
import { config } from "../config.js";
import type { Address } from "viem";

const agent = new Hono();

/**
 * GET /agent/:address/status
 * Check if an address is a registered agent
 */
agent.get("/:address/status", async (c) => {
  try {
    const address = c.req.param("address") as Address;

    const [isRegistered, agentId] = await Promise.all([
      contract.isRegisteredAgent(address),
      contract.getAgentId(address),
    ]);

    return c.json({
      address,
      isRegistered,
      agentId: agentId.toString(),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /agent/register
 * Register an agent in the Yiling Protocol ecosystem.
 *
 * Two-step process:
 *   Step 1: Mint an ERC-8004 Identity (if you don't have one)
 *   Step 2: Call joinEcosystem on the AgentRegistry contract
 *
 * Both steps require the agent to submit transactions from their own wallet
 * (msg.sender must be the agent owner). This endpoint returns the exact
 * calldata and contract addresses needed.
 */
agent.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { wallet, agentId } = body;

    if (!wallet) return c.json({ error: "wallet address is required" }, 400);

    // Check if already registered
    const isRegistered = await contract.isRegisteredAgent(wallet as Address);
    if (isRegistered) {
      const existingId = await contract.getAgentId(wallet as Address);
      return c.json({
        status: "already_registered",
        wallet,
        agentId: existingId.toString(),
        message: "This wallet is already registered in the Yiling Protocol ecosystem.",
      });
    }

    // If agentId provided, check if it has already joined
    if (agentId) {
      const hasJoined = await contract.hasJoined(BigInt(agentId));
      if (hasJoined) {
        return c.json({
          status: "agent_already_joined",
          agentId,
          message: "This agentId has already joined the ecosystem. Use the wallet associated with it.",
        });
      }
    }

    const ERC8004_IDENTITY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

    return c.json({
      status: "registration_required",
      wallet,
      steps: [
        {
          step: 1,
          name: "Get ERC-8004 Identity",
          description: "Mint an ERC-8004 agent identity token (if you don't have one).",
          contract: ERC8004_IDENTITY,
          chain: "Monad Testnet (chainId: 10143)",
          rpc: "https://testnet-rpc.monad.xyz",
          function: "register(string metadata)",
          abi: ["function register(string metadata) external returns (uint256)"],
          example: 'cast send 0x8004A818BFB912233c491871b3d84c89A494BD9e "register(string)" "my-agent-name" --rpc-url https://testnet-rpc.monad.xyz --private-key $PRIVATE_KEY',
          action: agentId
            ? "You already have agentId " + agentId + ". Skip to step 2."
            : "Call register(metadata) on the ERC-8004 Identity contract. The returned value is your agentId.",
        },
        {
          step: 2,
          name: "Join Yiling Ecosystem",
          description: "Call joinEcosystem(agentId) on the AgentRegistry contract from your agent wallet.",
          contract: config.agentRegistryAddress,
          chain: "Monad Testnet (chainId: 10143)",
          rpc: "https://testnet-rpc.monad.xyz",
          function: "joinEcosystem(uint256 agentId)",
          abi: ["function joinEcosystem(uint256 agentId) external"],
          note: "Must be called from the wallet that owns the ERC-8004 identity or the agent's designated wallet.",
        },
        {
          step: 3,
          name: "Verify Registration",
          description: "Confirm your registration by calling this API.",
          endpoint: "GET /agent/" + wallet + "/status",
          expect: "{ isRegistered: true }",
        },
      ],
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * GET /agent/:id/reputation
 * Get an agent's reputation score
 */
agent.get("/:id/reputation", async (c) => {
  try {
    const agentId = BigInt(c.req.param("id"));
    const tag = c.req.query("tag") || "";

    const reputation = tag
      ? await contract.getAgentReputationByTag(agentId, tag)
      : await contract.getAgentReputation(agentId);

    return c.json({
      agentId: agentId.toString(),
      tag: tag || "general",
      feedbackCount: reputation.count.toString(),
      score: reputation.value.toString(),
      decimals: reputation.decimals,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default agent;
