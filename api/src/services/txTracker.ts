/**
 * Transaction State Tracker
 *
 * Tracks the two-phase commit state of each operation:
 *   Phase 1: Hub contract submission
 *   Phase 2: x402 payment settlement
 *
 * Prevents:
 *   - Hub tx succeeds but settlement fails → retry settlement
 *   - Settlement succeeds but Hub tx fails → refund
 *   - Duplicate submissions
 *
 * In production: replace in-memory store with persistent DB.
 */

export type TxState =
  | "pending"           // operation started
  | "hub_confirmed"     // Hub tx succeeded, settlement pending
  | "settled"           // both Hub tx and settlement succeeded
  | "hub_failed"        // Hub tx failed, need refund if settled
  | "settlement_failed" // Hub succeeded but settlement failed, retry needed
  | "refunded";         // refund completed

export interface TxRecord {
  id: string;
  type: "create_query" | "submit_report" | "claim_payout";
  state: TxState;
  hubTxHash?: string;
  settlementTxHash?: string;
  queryId?: string;
  reporter?: string;
  amount?: string;
  sourceChain?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory store (replace with DB in production)
const txStore = new Map<string, TxRecord>();

/**
 * Create a new transaction record
 */
export function createTx(
  type: TxRecord["type"],
  metadata: Partial<TxRecord>
): TxRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record: TxRecord = {
    id,
    type,
    state: "pending",
    ...metadata,
    createdAt: now,
    updatedAt: now,
  };

  txStore.set(id, record);
  return record;
}

/**
 * Update transaction state
 */
export function updateTx(
  id: string,
  updates: Partial<TxRecord>
): TxRecord | null {
  const record = txStore.get(id);
  if (!record) return null;

  Object.assign(record, updates, { updatedAt: new Date().toISOString() });
  return record;
}

/**
 * Get transaction record
 */
export function getTx(id: string): TxRecord | null {
  return txStore.get(id) || null;
}

/**
 * Get all transactions needing retry (hub confirmed but settlement failed)
 */
export function getRetryable(): TxRecord[] {
  return Array.from(txStore.values()).filter(
    (tx) => tx.state === "settlement_failed"
  );
}

/**
 * Get all transactions needing refund (settlement succeeded but hub failed)
 */
export function getRefundable(): TxRecord[] {
  return Array.from(txStore.values()).filter(
    (tx) => tx.state === "hub_failed"
  );
}

/**
 * Get all transactions by query ID
 */
export function getTxsByQuery(queryId: string): TxRecord[] {
  return Array.from(txStore.values()).filter(
    (tx) => tx.queryId === queryId
  );
}

/**
 * Retry failed settlements automatically.
 * Runs on an interval, picks up settlement_failed txs and re-executes payout.
 * Max 3 retries per tx — after that, requires manual intervention.
 */
const MAX_RETRIES = 3;
const retryAttempts = new Map<string, number>();
let retryTimer: ReturnType<typeof setInterval> | null = null;

async function retryFailedSettlements() {
  const retryable = getRetryable();
  if (retryable.length === 0) return;

  const { executePayout } = await import("./payout.js");
  const { emitEvent } = await import("./webhooks.js");

  for (const tx of retryable) {
    const attempts = retryAttempts.get(tx.id) || 0;
    if (attempts >= MAX_RETRIES) continue;

    retryAttempts.set(tx.id, attempts + 1);

    try {
      if (!tx.reporter || !tx.amount || !tx.sourceChain) {
        console.warn(`[txRetry] Skipping ${tx.id}: missing reporter/amount/sourceChain`);
        continue;
      }

      console.log(`[txRetry] Attempt ${attempts + 1}/${MAX_RETRIES} for tx ${tx.id}`);

      const result = await executePayout(
        tx.reporter as `0x${string}`,
        BigInt(tx.amount),
        tx.sourceChain,
      );

      updateTx(tx.id, {
        state: "settled",
        settlementTxHash: result.txHash,
      });

      retryAttempts.delete(tx.id);

      emitEvent("payout.claimed", {
        queryId: tx.queryId,
        reporter: tx.reporter,
        retried: true,
        payoutTxHash: result.txHash,
        chain: result.chain,
      });

      console.log(`[txRetry] ✓ Settled tx ${tx.id} → ${result.txHash}`);
    } catch (err: any) {
      console.error(`[txRetry] ✗ Attempt ${attempts + 1} failed for ${tx.id}: ${err.message}`);
      updateTx(tx.id, { error: `Retry ${attempts + 1} failed: ${err.message}` });
    }
  }
}

/**
 * Start the retry background job (runs every 60s)
 */
export function startRetryJob(intervalMs = 60_000) {
  if (retryTimer) return;
  console.log(`[txRetry] Background retry job started (every ${intervalMs / 1000}s)`);
  retryTimer = setInterval(() => {
    retryFailedSettlements().catch((err) =>
      console.error("[txRetry] Job error:", err)
    );
  }, intervalMs);
}

/**
 * Stop the retry background job
 */
export function stopRetryJob() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
    console.log("[txRetry] Background retry job stopped");
  }
}

/**
 * Get transaction summary for admin monitoring
 */
export function getTxSummary(): Record<TxState, number> {
  const summary: Record<string, number> = {
    pending: 0,
    hub_confirmed: 0,
    settled: 0,
    hub_failed: 0,
    settlement_failed: 0,
    refunded: 0,
  };

  for (const tx of txStore.values()) {
    summary[tx.state] = (summary[tx.state] || 0) + 1;
  }

  return summary as Record<TxState, number>;
}
