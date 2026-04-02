/**
 * Test x402 payment flow end-to-end:
 * 1. Hit paid endpoint → get 402 response
 * 2. Parse 402 payment requirements
 * 3. Sign payment with agent's private key
 * 4. Retry with payment header → get 200
 *
 * Run: cd api && npx tsx test/test-x402-flow.ts
 */

import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";

const API_URL = "https://api.yilingprotocol.com";

// The Analyst
const ANALYST_KEY = "0xe0af02e91f4d43450ae79742823fb5903f77abe433fa4c4d3ddd174114687a68" as `0x${string}`;
const ANALYST_ADDRESS = "0x9E3F2FA5177b2eFc7542EFaA1D588832d4bdF1B1";

async function main() {
  // Step 1: Hit paid endpoint without payment → should get 402
  console.log("=== Step 1: Check 402 Response ===\n");

  const rawRes = await fetch(`${API_URL}/query/6/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      probability: "600000000000000000",
      reporter: ANALYST_ADDRESS,
      sourceChain: "eip155:10143",
    }),
  });

  console.log("Status:", rawRes.status);
  console.log("Headers:");
  rawRes.headers.forEach((v, k) => {
    if (k.toLowerCase().includes("x402") || k.toLowerCase().includes("payment") || k.toLowerCase().includes("www-authenticate")) {
      console.log(`  ${k}: ${v}`);
    }
  });

  const body = await rawRes.text();
  console.log("Body:", body.slice(0, 500));

  if (rawRes.status !== 402) {
    console.log("\nNot a 402 response — x402 may not be active yet. Exiting.");
    return;
  }

  // Step 2: Create x402 client and try with payment
  console.log("\n=== Step 2: Create x402 Client ===\n");

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

  console.log("Signer address:", signer.address);
  console.log("Client schemes:", [...client.registeredClientSchemes.keys()]);

  const httpClient = new x402HTTPClient(client);
  const x402Fetch = wrapFetchWithPayment(fetch, httpClient);

  // Step 3: Try with x402 payment
  console.log("\n=== Step 3: Submit with x402 Payment ===\n");

  try {
    const res = await x402Fetch(`${API_URL}/query/6/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        probability: "600000000000000000",
        reporter: ANALYST_ADDRESS,
        sourceChain: "eip155:10143",
      }),
    });

    console.log("Status:", res.status);
    const result = await res.text();
    console.log("Response:", result.slice(0, 500));
  } catch (err: any) {
    console.log("FAILED:", err.message);
    if (err.cause) console.log("Cause:", err.cause.message);
  }
}

main().catch(console.error);
