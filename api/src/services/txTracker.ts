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
