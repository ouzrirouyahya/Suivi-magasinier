/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PCV v2.0 (PLS v3.3)
 * Module: Confidence Score Engine
 * File: /src/core/ConfidenceEngine.ts
 *
 * Computes a probabilistic metric (0 to 1) representing the alignment,
 * freshness, and sync health of the local master snapshots.
 */

export interface ConfidenceMetrics {
  score: number;
  mode: 'NORMAL' | 'DEGRADED' | 'VALIDATION_REQUIRED';
  snapshotAgeMs: number;
  pendingQueueSize: number;
  dlqSize: number;
}

const STALENESS_DECAY_HALF_LIFE_MS = 25000; // Half life of confidence under severe off-grid mine latency (25s)

/**
 * Calculates a probabilistic confidence score between 0.0 and 1.0 based on system facts.
 */
export function calculateSnapshotConfidence(
  lastSnapshotTimestamp: number,
  pendingQueueLength: number,
  dlqLength: number,
  lastReconciliationTimestamp?: number
): ConfidenceMetrics {
  const now = Date.now();
  const snapshotAgeMs = lastSnapshotTimestamp > 0 ? now - lastSnapshotTimestamp : Infinity;

  // 1. Snapshot Age Score (decay function)
  let ageScore = 1.0;
  if (snapshotAgeMs !== Infinity) {
    // Standard exponential decay: confidence decays as time since last update increases
    ageScore = Math.exp(-snapshotAgeMs / STALENESS_DECAY_HALF_LIFE_MS);
  } else {
    ageScore = 0.0;
  }

  // Ensure minimum floor for ageScore if we haven't timed out completely
  ageScore = Math.max(0.0, Math.min(1.0, ageScore));

  // 2. Queue Health Score
  // Small queues represent normal offline operations. Large queues reduce confidence.
  let queueScore = 1.0;
  if (pendingQueueLength > 0) {
    queueScore = Math.max(0.4, 1.0 - pendingQueueLength * 0.1); // Max penalty is 60%
  }

  // 3. Dead Letter Queue Impact
  // A DLQ with active failures represents permanent discrepancies that require manual review
  let dlqScore = 1.0;
  if (dlqLength > 0) {
    dlqScore = Math.max(0.2, 1.0 - dlqLength * 0.25); // Hard penalty for unresolved errors
  }

  // 4. Verification Freshness
  let reconScore = 1.0;
  if (lastReconciliationTimestamp) {
    const timeSinceRecon = now - lastReconciliationTimestamp;
    reconScore = Math.max(0.7, Math.exp(-timeSinceRecon / 60000)); // decays over 1 minute
  }

  // Multiply factors into final probabilistic score
  const score = Number((ageScore * queueScore * dlqScore * reconScore).toFixed(4));

  // Set modes based on SRE PCV v2.0 Rule guidelines:
  // - > 0.8: normal mode
  // - 0.5 to 0.8: degraded mode
  // - < 0.5: validation required (not auto-blocked, soft read, writes evaluated via BSV)
  let mode: 'NORMAL' | 'DEGRADED' | 'VALIDATION_REQUIRED' = 'NORMAL';
  if (score < 0.5) {
    mode = 'VALIDATION_REQUIRED';
  } else if (score <= 0.8) {
    mode = 'DEGRADED';
  }

  return {
    score,
    mode,
    snapshotAgeMs,
    pendingQueueSize: pendingQueueLength,
    dlqSize: dlqLength,
  };
}
