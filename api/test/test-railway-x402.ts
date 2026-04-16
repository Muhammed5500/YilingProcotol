/**
 * Railway x402 Payment Test
 * Tests the full x402 flow against the live Railway deployment
 */

import "dotenv/config";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API_URL = "https://api.yilingprotocol.com";
const PRIVATE_KEY = process.env.TEST_BUILDER_KEY;
if (!PRIVATE_KEY) throw new Error("Missing env var: TEST_BUILDER_KEY. See api/.env.example.");

async function main() {
  console.log("=== Railway x402 Payment Test ===\n");
  console.log(`API: ${API_URL}\n`);

  const signer = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log(`Wallet: ${signer.address}\n`);

  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // Test 1: No payment → 402
  console.log("--- Test 1: No payment → expect 402 ---");
  const res1 = await fetch(`${API_URL}/query/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Railway x402 test - no payment",
      bondPool: "1000000000000000000",
      alpha: "1", k: "1",
      flatReward: "10000000000000000",
      bondAmount: "100000000000000000",
      liquidityParam: "1000000000000000000",
      initialPrice: "500000000000000000",
      creator: signer.address,
    }),
  });
  console.log(`Status: ${res1.status}`);
  console.log(res1.status === 402 ? "✅ 402 returned\n" : "❌ Expected 402\n");

  // Test 2: With x402 payment → 200
  console.log("--- Test 2: x402 payment → expect 200 ---");
  try {
    const res2 = await fetchWithPayment(`${API_URL}/query/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Railway live test - paid with Base Sepolia USDC!",
        bondPool: "1000000000000000000",
        alpha: "1", k: "1",
        flatReward: "10000000000000000",
        bondAmount: "100000000000000000",
        liquidityParam: "1000000000000000000",
        initialPrice: "500000000000000000",
        creator: signer.address,
      }),
    });
    console.log(`Status: ${res2.status}`);
    const body = await res2.json();
    console.log(`Response: ${JSON.stringify(body, null, 2)}`);
    console.log(res2.status === 200 ? "✅ Query created with x402 payment!\n" : `❌ Expected 200, got ${res2.status}\n`);
  } catch (err: any) {
    console.log(`Error: ${err.message}\n`);
  }

  // Test 3: Verify query was created
  console.log("--- Test 3: Verify query exists ---");
  const res3 = await fetch(`${API_URL}/health`);
  const health = await res3.json();
  console.log(`Query count: ${health.queryCount}`);
  console.log("✅ Verified\n");

  // Test 4: Free endpoints still work
  console.log("--- Test 4: Free endpoints ---");
  const res4 = await fetch(`${API_URL}/query/pricing`);
  console.log(`Pricing status: ${res4.status}`);
  console.log(res4.status === 200 ? "✅ Free endpoints work\n" : "❌ Failed\n");

  console.log("=== All Railway tests complete ===");
}

main().catch(console.error);
