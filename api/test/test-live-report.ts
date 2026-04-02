/**
 * Live test: submit a report to query #1 using The Analyst agent
 * with x402 payment on Monad testnet.
 *
 * Run: cd api && npx tsx test/test-live-report.ts
 */

import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";

const API_URL = "https://api.yilingprotocol.com";

// The Analyst (agentId: 1722)
const ANALYST_ADDRESS = "0x9E3F2FA5177b2eFc7542EFaA1D588832d4bdF1B1";
const ANALYST_KEY = "0xe0af02e91f4d43450ae79742823fb5903f77abe433fa4c4d3ddd174114687a68" as `0x${string}`;

// Build x402 client with EVM payment support
const account = privateKeyToAccount(ANALYST_KEY);
const publicClient = createPublicClient({
  chain: {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  },
  transport: http("https://testnet-rpc.monad.xyz"),
});

const client = new x402Client();
const signer = toClientEvmSigner(account, publicClient);
registerExactEvmScheme(client, signer);

const httpClient = new x402HTTPClient(client);
const x402Fetch = wrapFetchWithPayment(fetch, httpClient);

async function main() {
  console.log("=== Live Report Test ===\n");

  // 1. Check agent registration
  console.log("1. Checking agent registration...");
  const statusRes = await fetch(`${API_URL}/agent/${ANALYST_ADDRESS}/status`);
  const status = await statusRes.json() as any;
  console.log(`   Registered: ${status.isRegistered}, agentId: ${status.agentId}\n`);

  if (!status.isRegistered) {
    console.log("Agent not registered! Aborting.");
    return;
  }

  // 2. Get active queries
  console.log("2. Fetching active queries...");
  const queriesRes = await fetch(`${API_URL}/queries/active`);
  const queries = await queriesRes.json() as any;
  console.log(`   Found ${queries.activeQueries.length} active queries\n`);

  if (queries.activeQueries.length === 0) {
    console.log("No active queries. Aborting.");
    return;
  }

  const query = queries.activeQueries[0];
  console.log(`   Using query #${query.queryId}: "${query.question}"`);
  console.log(`   Current price: ${Number(query.currentPrice) / 1e18}\n`);

  // 3. Submit report with x402 payment
  const probability = 0.72;
  const probWad = BigInt(Math.floor(probability * 1e18)).toString();

  console.log(`3. Submitting report: probability = ${probability} (${probWad} WAD)`);
  console.log(`   Agent: The Analyst (${ANALYST_ADDRESS})`);
  console.log(`   Paying bond via x402 on Monad testnet...\n`);

  try {
    const reportRes = await x402Fetch(`${API_URL}/query/${query.queryId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        probability: probWad,
        reporter: ANALYST_ADDRESS,
        sourceChain: "eip155:10143",
      }),
    });

    const result = await reportRes.json() as any;
    console.log("   Response:", JSON.stringify(result, null, 2));

    if (result.txHash) {
      console.log(`\n   SUCCESS! txHash: ${result.txHash}`);
      console.log(`   Query resolved: ${result.queryResolved}`);
    } else if (result.error) {
      console.log(`\n   ERROR: ${result.error}`);
    }
  } catch (err: any) {
    console.log(`   FAILED: ${err.message}`);
  }

  // 4. Check query status after report
  console.log("\n4. Checking query status after report...");
  const afterRes = await fetch(`${API_URL}/query/${query.queryId}/status`);
  const after = await afterRes.json() as any;
  console.log(`   Reports: ${after.reportCount}`);
  console.log(`   Resolved: ${after.resolved}`);
  console.log(`   Current price: ${Number(after.currentPrice) / 1e18}`);
}

main().catch(console.error);
