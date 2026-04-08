/**
 * Fee calculation service for Yiling Protocol
 *
 * Revenue model: spread between x402 inflows and outflows
 *
 * IN:  Builder pays (bond pool + creation fee)
 * OUT: Protocol pays agents (payouts - settlement rake)
 * NET: difference stays in protocol treasury
 */

// Fee rates (configurable per phase)
export const FEE_CONFIG = {
  // Phase 1: Prove It Works (months 1-3)
  // creationFeeRate: 0,
  // settlementRakeRate: 0,

  // Phase 2: Early Monetization (months 4-6)
  // creationFeeRate: 0.05,
  // settlementRakeRate: 0.02,

  // Phase 3: Full Pricing (months 7+)
  creationFeeRate: 0.15,      // 15% of bond pool
  settlementRakeRate: 0.05,   // 5% of positive payouts
  minCreationFee: 10_000_000, // 10 USDC (6 decimals)
};

/**
 * Calculate the total x402 payment amount for creating a query
 *
 * Builder wants a 500 USDC bond pool:
 *   creation fee = 500 * 0.15 = 75 USDC
 *   total charge = 500 + 75 = 575 USDC
 */
export function calculateCreationCharge(bondPool: bigint): {
  bondPool: bigint;
  creationFee: bigint;
  totalCharge: bigint;
} {
  // Calculate fee: bondPool * rate
  let creationFee = (bondPool * BigInt(Math.floor(FEE_CONFIG.creationFeeRate * 10000))) / 10000n;

  // Apply minimum fee
  const minFee = BigInt(FEE_CONFIG.minCreationFee);
  if (creationFee < minFee) {
    creationFee = minFee;
  }

  return {
    bondPool,
    creationFee,
    totalCharge: bondPool + creationFee,
  };
}

/**
 * Calculate the actual payout after settlement rake
 *
 * Rake is applied ONLY to profit above the bond, not the bond itself.
 * This ensures agents who break even (ΔS=0) get their full bond back.
 *
 * Agent deposited 1 USDC bond, earned 1.50 USDC gross:
 *   profit = 1.50 - 1.00 = 0.50 USDC
 *   rake = 0.50 * 0.05 = 0.025 USDC
 *   net payout = 1.50 - 0.025 = 1.475 USDC
 *
 * Agent deposited 1 USDC bond, earned 0.80 USDC gross (slashed):
 *   profit = 0.80 - 1.00 = -0.20 → no rake
 *   net payout = 0.80 USDC
 */
export function calculateNetPayout(grossPayout: bigint, bondAmount?: bigint): {
  grossPayout: bigint;
  rake: bigint;
  netPayout: bigint;
} {
  if (grossPayout <= 0n) {
    return { grossPayout, rake: 0n, netPayout: 0n };
  }

  const bond = bondAmount ?? 0n;
  const profit = grossPayout - bond;

  // Only rake the profit portion; if agent lost money (profit <= 0), no rake
  if (profit <= 0n) {
    return { grossPayout, rake: 0n, netPayout: grossPayout };
  }

  const rake = (profit * BigInt(Math.floor(FEE_CONFIG.settlementRakeRate * 10000))) / 10000n;

  return {
    grossPayout,
    rake,
    netPayout: grossPayout - rake,
  };
}

/**
 * Calculate total revenue from a resolved query
 */
export function calculateQueryRevenue(
  bondPool: bigint,
  positivePayouts: bigint[],
  bondAmount?: bigint
): {
  creationFee: bigint;
  totalRake: bigint;
  totalRevenue: bigint;
  payoutDetails: { gross: bigint; rake: bigint; net: bigint }[];
} {
  const { creationFee } = calculateCreationCharge(bondPool);

  let totalRake = 0n;
  const payoutDetails = positivePayouts.map((gross) => {
    const { rake, netPayout } = calculateNetPayout(gross, bondAmount);
    totalRake += rake;
    return { gross, rake, net: netPayout };
  });

  return {
    creationFee,
    totalRake,
    totalRevenue: creationFee + totalRake,
    payoutDetails,
  };
}
