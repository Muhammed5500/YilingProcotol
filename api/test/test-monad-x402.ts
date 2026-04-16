/**
 * Monad x402 Payment Test
 * Tests x402 payment using Monad testnet USDC
 */

import "dotenv/config";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API_URL = "https://api.yilingprotocol.com";
const PRIVATE_KEY = process.env.TEST_BUILDER_KEY;
if (!PRIVATE_KEY) throw new Error("Missing env var: TEST_BUILDER_KEY. See api/.env.example.");

async function main() {
  console.log("=== Monad x402 Payment Test ===\n");

  const signer = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log(`Wallet: ${signer.address}`);
  console.log(`API: ${API_URL}\n`);

  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // Test 1: No payment → 402
  console.log("--- Test 1: No payment → expect 402 ---");
  const res1 = await fetch(`${API_URL}/query/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "test" }),
  });
  console.log(`Status: ${res1.status}`);
  console.log(res1.status === 402 ? "✅ 402 returned\n" : "❌ Expected 402\n");

  // Test 2: Pay with Monad USDC → expect 200
  console.log("--- Test 2: Monad USDC payment → expect 200 ---");
  try {
    const res2 = await fetchWithPayment(`${API_URL}/query/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Monad x402 test — paid with Monad USDC!",
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
    console.log(res2.status === 200 ? "\n✅ Query created with MONAD USDC!" : `\n❌ Got ${res2.status}`);
  } catch (err: any) {
    console.log(`Error: ${err.message}`);
  }

  console.log("\n=== Test complete ===");
}

main().catch(console.error);
