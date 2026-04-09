import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API = "https://api.yilingprotocol.com";
const PRIVATE_KEY = "0x75796d8d70e01350e9114f68c754b9ec184c99a86b3079eaa41a03477da1f484";

async function main() {
  console.log("=== Base Query Chain Test ===\n");

  const signer = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  const pay = wrapFetchWithPayment(fetch, client);

  // Step 1: Create query from Base (queryChain = Base)
  console.log("1. Creating query with Base USDC...");
  const res = await pay(`${API}/query/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Will DeFi TVL exceed 500B by 2027?",
      bondPool: "1000000000000000000",
      alpha: "1", k: "1",
      flatReward: "10000000000000000",
      bondAmount: "100000000000000000",
      liquidityParam: "1000000000000000000",
      initialPrice: "500000000000000000",
      creator: signer.address,
      queryChain: "eip155:84532",  // Base
    }),
  });
  console.log(`   Status: ${res.status}`);
  if (res.status === 200) {
    const body = await res.json();
    console.log(`   txHash: ${body.txHash}`);
    console.log("   OK: Base query created!\n");
  } else {
    console.log("   FAIL\n");
    return;
  }

  // Step 2: Check query status
  const health = await fetch(`${API}/health`).then(r => r.json());
  const queryId = Number(health.queryCount) - 1;
  console.log(`2. Query ID: ${queryId}`);
  const status = await fetch(`${API}/query/${queryId}/status`).then(r => r.json());
  console.log(`   Question: ${status.question}`);
  console.log(`   Resolved: ${status.resolved}\n`);

  // Step 3: Try submitting report with Monad chain (should fail - ChainMismatch)
  console.log("3. Agent tries Monad bond on Base query (should fail)...");
  try {
    const res2 = await pay(`${API}/query/${queryId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        probability: "700000000000000000",
        reporter: signer.address,
        sourceChain: "eip155:10143",  // Monad — wrong chain!
      }),
    });
    console.log(`   Status: ${res2.status}`);
    const body2 = await res2.json();
    console.log(`   Response: ${JSON.stringify(body2)}`);
    if (res2.status !== 200) {
      console.log("   OK: Correctly rejected (chain mismatch)!\n");
    }
  } catch (err: any) {
    console.log(`   Error: ${err.message}\n`);
  }

  // Step 4: Try submitting report with Base chain (should work)
  console.log("4. Agent tries Base bond on Base query (should work)...");
  try {
    const res3 = await pay(`${API}/query/${queryId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        probability: "700000000000000000",
        reporter: signer.address,
        sourceChain: "eip155:84532",  // Base — correct chain!
      }),
    });
    console.log(`   Status: ${res3.status}`);
    const body3 = await res3.json();
    console.log(`   Response: ${JSON.stringify(body3)}`);
    if (res3.status === 200) {
      console.log("   OK: Correctly accepted!\n");
    }
  } catch (err: any) {
    console.log(`   Error: ${err.message}\n`);
  }

  console.log("=== Test complete ===");
}

main().catch(console.error);
