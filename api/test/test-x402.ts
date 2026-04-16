/**
 * x402 Payment Flow Test
 *
 * Tests:
 * 1. Request without payment → expect 402
 * 2. Request with x402 payment → expect 200
 * 3. Free endpoint → expect 200 without payment
 */

import "dotenv/config";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API_URL = "http://localhost:3001";
const PRIVATE_KEY = process.env.TEST_BUILDER_KEY;
if (!PRIVATE_KEY) throw new Error("Missing env var: TEST_BUILDER_KEY. See api/.env.example.");

async function main() {
  console.log("=== x402 Payment Flow Test ===\n");

  // Setup wallet
  const signer = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log(`Wallet: ${signer.address}`);

  // Create x402 client with EVM scheme
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });

  // Wrap fetch with x402 payment handling
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // Test 1: Request without payment → should get 402
  console.log("\n--- Test 1: Request without payment ---");
  try {
    const res = await fetch(`${API_URL}/query/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "x402 test - no payment",
        bondPool: "1000000000000000000",
        alpha: "1",
        k: "1",
        flatReward: "10000000000000000",
        bondAmount: "100000000000000000",
        liquidityParam: "1000000000000000000",
        initialPrice: "500000000000000000",
        creator: signer.address,
      }),
    });

    console.log(`Status: ${res.status}`);
    if (res.status === 402) {
      console.log("✅ Correctly returned 402 Payment Required");
    } else {
      console.log("❌ Expected 402, got", res.status);
    }
  } catch (err: any) {
    console.log("Error:", err.message);
  }

  // Test 2: Request with x402 payment → should get 200
  console.log("\n--- Test 2: Request with x402 payment (Base Sepolia USDC) ---");
  try {
    const res = await fetchWithPayment(`${API_URL}/query/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "x402 paid query - real USDC payment!",
        bondPool: "1000000000000000000",
        alpha: "1",
        k: "1",
        flatReward: "10000000000000000",
        bondAmount: "100000000000000000",
        liquidityParam: "1000000000000000000",
        initialPrice: "500000000000000000",
        creator: signer.address,
      }),
    });

    console.log(`Status: ${res.status}`);
    const body = await res.json();
    console.log("Response:", JSON.stringify(body, null, 2));

    if (res.status === 200) {
      console.log("✅ x402 payment accepted! Query created with real USDC payment!");
    } else {
      console.log("❌ Expected 200, got", res.status);
    }
  } catch (err: any) {
    console.log("Error:", err.message);
  }

  // Test 3: Free endpoint → should always return 200
  console.log("\n--- Test 3: Free endpoint (no payment needed) ---");
  try {
    const res = await fetch(`${API_URL}/health`);
    console.log(`Status: ${res.status}`);
    if (res.status === 200) {
      console.log("✅ Free endpoint works without payment");
    }
  } catch (err: any) {
    console.log("Error:", err.message);
  }

  // Check USDC balance after test
  console.log("\n--- USDC Balance Check ---");
  try {
    const { createPublicClient, http, parseAbi } = await import("viem");
    const { baseSepolia } = await import("viem/chains");

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http("https://sepolia.base.org"),
    });

    const balance = await publicClient.readContract({
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
      functionName: "balanceOf",
      args: [signer.address],
    });

    console.log(`USDC Balance: ${Number(balance) / 1e6} USDC`);
  } catch (err: any) {
    console.log("Balance check error:", err.message);
  }

  console.log("\n=== Tests complete ===");
}

main().catch(console.error);
