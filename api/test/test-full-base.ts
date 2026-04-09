import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API = "https://api.yilingprotocol.com";

// Builder wallet (has Base USDC)
const builder = privateKeyToAccount("0x75796d8d70e01350e9114f68c754b9ec184c99a86b3079eaa41a03477da1f484" as `0x${string}`);

// Agent wallets (have Base USDC)
const agents = [
  { name: "Analyst",    key: "0xe0af02e91f4d43450ae79742823fb5903f77abe433fa4c4d3ddd174114687a68" as `0x${string}`, prob: "350000000000000000" },
  { name: "Contrarian", key: "0xb13d4a39f4a2925606b288df6fd686b778cfd1518a79cfc2c872c2fbff832384" as `0x${string}`, prob: "750000000000000000" },
  { name: "Optimist",   key: "0xc40f0792faedbbf3ee6aa1c999e9ce7c65d3810fab02afb1ff014f8e4666915d" as `0x${string}`, prob: "850000000000000000" },
];

function createPayClient(key: `0x${string}`) {
  const signer = privateKeyToAccount(key);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  return { pay: wrapFetchWithPayment(fetch, client), address: signer.address };
}

async function main() {
  console.log("=== FULL BASE CHAIN TEST ===\n");

  // 1. Builder creates query from Base
  console.log("1. Builder creates query (Base USDC, x402)...");
  const { pay: builderPay } = createPayClient("0x75796d8d70e01350e9114f68c754b9ec184c99a86b3079eaa41a03477da1f484" as `0x${string}`);
  const res1 = await builderPay(`${API}/query/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PREFERRED-CHAIN": "base" },
    body: JSON.stringify({
      question: "Will Ethereum L2s capture more value than L1 by 2028?",
      bondPool: "1000000000000000000",
      alpha: "1", k: "1",
      flatReward: "10000000000000000",
      bondAmount: "100000000000000000",
      liquidityParam: "1000000000000000000",
      initialPrice: "500000000000000000",
      creator: builder.address,
      queryChain: "eip155:84532",  // Base
    }),
  });
  console.log(`   Status: ${res1.status}`);
  if (res1.status !== 200) { console.log("   FAIL"); return; }
  const createBody = await res1.json();
  console.log(`   txHash: ${createBody.txHash}`);
  console.log(`   OK!\n`);

  // Get query ID
  const health = await fetch(`${API}/health`).then(r => r.json());
  const queryId = Number(health.queryCount) - 1;
  console.log(`   Query ID: ${queryId}\n`);

  // 2. Agents submit reports from Base (x402)
  for (const agent of agents) {
    console.log(`2. ${agent.name} submitting (Base x402 bond)...`);
    const { pay, address } = createPayClient(agent.key);
    try {
      const res = await pay(`${API}/query/${queryId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-PREFERRED-CHAIN": "base" },
        body: JSON.stringify({
          probability: agent.prob,
          reporter: address,
          sourceChain: "eip155:84532",  // Base — matches queryChain
        }),
      });
      console.log(`   Status: ${res.status}`);
      if (res.status === 200) {
        const body = await res.json();
        console.log(`   txHash: ${body.txHash}`);
        console.log(`   OK!\n`);
      } else {
        const body = await res.json();
        console.log(`   Error: ${JSON.stringify(body)}\n`);
      }
    } catch (err: any) {
      console.log(`   Error: ${err.message}\n`);
    }
  }

  // 3. Check status
  console.log("3. Query status...");
  const status = await fetch(`${API}/query/${queryId}/status`).then(r => r.json());
  console.log(`   Question: ${status.question}`);
  console.log(`   Reports: ${status.reportCount}`);
  console.log(`   Resolved: ${status.resolved}`);
  for (const r of status.reports) {
    console.log(`   Agent ${r.agentId}: ${(parseInt(r.probability)/1e18*100).toFixed(0)}% (chain: ${r.sourceChain})`);
  }
  console.log();

  // 4. Check payouts
  if (status.resolved) {
    console.log("4. Payouts...");
    for (const agent of agents) {
      const { address } = createPayClient(agent.key);
      const payout = await fetch(`${API}/query/${queryId}/payout/${address}`).then(r => r.json());
      console.log(`   ${agent.name}: gross=${payout.gross}, net=${payout.net}`);
    }
  } else {
    console.log("4. Not resolved yet (alpha=1, need forceResolve)");
  }

  console.log("\n=== Test complete ===");
}

main().catch(console.error);
