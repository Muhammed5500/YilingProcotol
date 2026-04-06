import { createWalletClient, createPublicClient, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

/**
 * Payout Service — Direct ERC-20 transfers from protocol treasury
 *
 * IMPORTANT: x402 is a PULL payment protocol — it cannot push payments.
 * All outbound payouts use standard ERC-20 transfer() calls from
 * protocol-controlled treasury wallets on each supported chain.
 *
 * This is a CUSTODIAL operation — the protocol holds agent funds
 * in treasury wallets and transfers them upon claim. This is the
 * core trust assumption of Phase 1 (trusted operator model).
 *
 * Phase 2 would replace this with spoke contracts that lock bonds
 * on-chain and enforce payouts trustlessly via cross-chain messaging.
 */

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
]);

// Treasury wallet configs per chain
// In production: use MPC, multisig, or HSM for key management
interface ChainTreasury {
  rpcUrl: string;
  usdcAddress: Address;
  chainName: string;
}

const TREASURY_CHAINS: Record<string, ChainTreasury> = {
  // Monad testnet (primary — same chain as Hub contract)
  "eip155:10143": {
    rpcUrl: "https://testnet-rpc.monad.xyz",
    usdcAddress: "0x534b2f3A21130d7a60830c2Df862319e593943A3" as Address, // Monad testnet USDC
    chainName: "Monad Testnet",
  },
  // EVM testnets
  "eip155:84532": {
    rpcUrl: "https://sepolia.base.org",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address, // Base Sepolia USDC
    chainName: "Base Sepolia",
  },
  "eip155:421614": {
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address, // Arbitrum Sepolia USDC
    chainName: "Arbitrum Sepolia",
  },
  "eip155:11155111": {
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address, // Ethereum Sepolia USDC
    chainName: "Ethereum Sepolia",
  },
  // Add more EVM chains as needed

  // Non-EVM chains are handled separately in executePayout()
  // Solana uses SPL token transfer, not ERC-20
};

// Solana treasury config (separate because different transfer mechanism)
const SOLANA_TREASURY = {
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": {
    rpcUrl: "https://api.devnet.solana.com",
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // Solana Devnet USDC
    chainName: "Solana Devnet",
  },
};

/**
 * Execute a payout to an agent on their preferred chain
 *
 * @param recipientAddress - agent's wallet address
 * @param amount - payout amount in USDC smallest units (6 decimals)
 * @param sourceChain - CAIP-2 chain ID where the agent paid bond
 * @returns transaction hash
 */
export async function executePayout(
  recipientAddress: Address,
  amount: bigint,
  sourceChain: string
): Promise<{ txHash: string; chain: string }> {
  // Check if this is a Solana chain
  if (sourceChain.startsWith("solana:")) {
    const solConfig = SOLANA_TREASURY[sourceChain as keyof typeof SOLANA_TREASURY];
    if (!solConfig) {
      throw new Error(`Solana chain ${sourceChain} not configured`);
    }
    return executeSolanaPayout(recipientAddress, amount, solConfig);
  }

  // EVM payout
  const chainConfig = TREASURY_CHAINS[sourceChain];

  if (!chainConfig) {
    throw new Error(
      `Payout not supported on chain ${sourceChain}. ` +
      `Supported EVM: ${Object.keys(TREASURY_CHAINS).join(", ")}. ` +
      `Solana: coming soon.`
    );
  }

  const treasuryKey = config.treasuryPrivateKey || config.privateKey;
  if (!treasuryKey) {
    throw new Error("Treasury private key not configured (set TREASURY_PRIVATE_KEY)");
  }

  const account = privateKeyToAccount(treasuryKey as Hex);

  const walletClient = createWalletClient({
    account,
    chain: undefined, // dynamic chain — determined by RPC
    transport: http(chainConfig.rpcUrl),
  });

  // Convert from WAD (18 decimals) to USDC (6 decimals)
  const usdcAmount = amount / 1_000_000_000_000n; // 18 - 6 = 12 zeros

  if (usdcAmount === 0n) {
    throw new Error("Payout amount too small to convert to USDC");
  }

  // Treasury balance pre-check
  const publicClient = createPublicClient({ transport: http(chainConfig.rpcUrl) });
  const treasuryBalance = await publicClient.readContract({
    address: chainConfig.usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(`[Payout] ${chainConfig.chainName} | From: ${account.address} | To: ${recipientAddress} | Amount: ${usdcAmount} USDC (${amount} WAD) | Treasury balance: ${treasuryBalance}`);

  if (treasuryBalance < usdcAmount) {
    throw new Error(
      `Insufficient treasury balance on ${chainConfig.chainName}. ` +
      `Required: ${usdcAmount}, Available: ${treasuryBalance}`
    );
  }

  // Execute ERC-20 transfer from treasury to agent
  const txHash = await walletClient.writeContract({
    address: chainConfig.usdcAddress,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [recipientAddress, usdcAmount],
    chain: undefined,
  });

  // Wait for on-chain confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === "reverted") {
    throw new Error(`ERC-20 transfer reverted on-chain. txHash: ${txHash}`);
  }

  console.log(`[Payout] Success! txHash: ${txHash} | Block: ${receipt.blockNumber}`);

  return {
    txHash,
    chain: chainConfig.chainName,
  };
}

/**
 * Get all treasury balances across all chains
 */
export async function getAllTreasuryBalances(): Promise<
  { chain: string; chainId: string; balance: string; balanceUSDC: string }[]
> {
  const treasuryKey = config.treasuryPrivateKey || config.privateKey;
  if (!treasuryKey) throw new Error("Treasury private key not configured (set TREASURY_PRIVATE_KEY)");
  const account = privateKeyToAccount(treasuryKey as Hex);

  const results = [];
  for (const [chainId, chainConfig] of Object.entries(TREASURY_CHAINS)) {
    try {
      const client = createPublicClient({ transport: http(chainConfig.rpcUrl) });
      const balance = await client.readContract({
        address: chainConfig.usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      });
      results.push({
        chain: chainConfig.chainName,
        chainId,
        balance: balance.toString(),
        balanceUSDC: (Number(balance) / 1e6).toFixed(2),
      });
    } catch {
      results.push({
        chain: chainConfig.chainName,
        chainId,
        balance: "0",
        balanceUSDC: "0.00",
      });
    }
  }
  return results;
}

/**
 * Check treasury balance on a specific chain
 */
export async function getTreasuryBalance(
  sourceChain: string
): Promise<{ balance: bigint; chain: string }> {
  const chainConfig = TREASURY_CHAINS[sourceChain];

  if (!chainConfig) {
    throw new Error(`Chain ${sourceChain} not configured`);
  }

  const treasuryKey = config.treasuryPrivateKey || config.privateKey;
  if (!treasuryKey) {
    throw new Error("Treasury private key not configured (set TREASURY_PRIVATE_KEY)");
  }

  const account = privateKeyToAccount(treasuryKey as Hex);

  const publicClient = createPublicClient({
    transport: http(chainConfig.rpcUrl),
  });

  const balance = await publicClient.readContract({
    address: chainConfig.usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  return {
    balance,
    chain: chainConfig.chainName,
  };
}

/**
 * Execute Solana SPL token payout
 */
async function executeSolanaPayout(
  recipientAddress: string,
  amount: bigint,
  solConfig: { rpcUrl: string; usdcMint: string; chainName: string }
): Promise<{ txHash: string; chain: string }> {
  const { Connection, Keypair, PublicKey } = await import("@solana/web3.js");
  const { getOrCreateAssociatedTokenAccount, transfer } = await import("@solana/spl-token");

  const treasuryKey = config.treasuryPrivateKey || config.privateKey;
  if (!treasuryKey) throw new Error("Treasury private key not configured (set TREASURY_PRIVATE_KEY)");

  // Convert WAD (18 decimals) to USDC (6 decimals)
  const usdcAmount = Number(amount / 1_000_000_000_000n);
  if (usdcAmount === 0) throw new Error("Payout amount too small");

  const connection = new Connection(solConfig.rpcUrl, "confirmed");

  // Derive Solana keypair from private key (first 32 bytes)
  const privKeyBytes = Buffer.from(treasuryKey.replace("0x", ""), "hex");
  const keypair = Keypair.fromSeed(privKeyBytes);

  const mintPubkey = new PublicKey(solConfig.usdcMint);
  const recipientPubkey = new PublicKey(recipientAddress);

  // Get or create associated token accounts
  const senderATA = await getOrCreateAssociatedTokenAccount(
    connection, keypair, mintPubkey, keypair.publicKey
  );
  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection, keypair, mintPubkey, recipientPubkey
  );

  // Transfer SPL tokens
  const txHash = await transfer(
    connection,
    keypair,
    senderATA.address,
    recipientATA.address,
    keypair.publicKey,
    usdcAmount
  );

  return {
    txHash,
    chain: solConfig.chainName,
  };
}
