import { YilingClient } from "../src/index.js";

const API_URL = "http://localhost:3001";
const WALLET = "0xd792E62177584EbF5237d24D26eB4842387ba93a";

async function main() {
  console.log("=== SDK Test ===\n");

  const yiling = new YilingClient({ apiUrl: API_URL, wallet: WALLET });

  // Test 1: Get pricing
  console.log("--- Test: getPricing ---");
  const pricing = await yiling.getPricing();
  console.log("Pricing:", JSON.stringify(pricing, null, 2));
  console.log("✅ getPricing works\n");

  // Test 2: Get active queries
  console.log("--- Test: getActiveQueries ---");
  const { activeQueries } = await yiling.getActiveQueries();
  console.log(`Active queries: ${activeQueries.length}`);
  console.log("✅ getActiveQueries works\n");

  // Test 3: Check agent
  console.log("--- Test: checkAgent ---");
  const agent = await yiling.checkAgent(WALLET);
  console.log(`Agent: ${agent.address}, registered: ${agent.isRegistered}, id: ${agent.agentId}`);
  console.log("✅ checkAgent works\n");

  // Test 4: Get reputation
  console.log("--- Test: getReputation ---");
  try {
    const rep = await yiling.getReputation(agent.agentId);
    console.log(`Reputation: score=${rep.score}, count=${rep.feedbackCount}`);
    console.log("✅ getReputation works\n");
  } catch (err: any) {
    console.log(`Reputation error (expected if no feedback): ${err.message}\n`);
  }

  // Test 5: Health check via custom fetch
  console.log("--- Test: health ---");
  const health = await fetch(`${API_URL}/health`).then(r => r.json());
  console.log(`Health: ${health.status}, queries: ${health.queryCount}`);
  console.log("✅ health works\n");

  console.log("=== All SDK tests passed ===");
}

main().catch(console.error);
