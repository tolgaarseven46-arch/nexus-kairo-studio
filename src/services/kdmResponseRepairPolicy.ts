import type { ResponseConsistencyResult } from './kairoResponseConsistency';

export interface ResponseRepairDecision {
  shouldRepair: boolean;
  maxAttempts: number;
  minAcceptScore: number;
  reason: string;
}

/**
 * KDM response-repair policy.
 * Keeps repair bounded so an inconsistent response cannot create an endless
 * generation loop or silently replace a better response with a worse one.
 */
export function decideResponseRepair(
  consistency: ResponseConsistencyResult,
  attempt: number
): ResponseRepairDecision {
  const maxAttempts = 2;
  const minAcceptScore = 100;

  if (consistency.accepted && consistency.score >= minAcceptScore) {
    return {
      shouldRepair: false,
      maxAttempts,
      minAcceptScore,
      reason: 'Yanıt KDM doğrulamasından geçti.',
    };
  }

  if (attempt >= maxAttempts) {
    return {
      shouldRepair: false,
      maxAttempts,
      minAcceptScore,
      reason: 'Maksimum KDM onarım denemesi tamamlandı; döngü durduruldu.',
    };
  }

  return {
    shouldRepair: true,
    maxAttempts,
    minAcceptScore,
    reason: `KDM uyumsuzluğu tespit edildi: ${consistency.issues.join('; ') || `skor ${consistency.score}`}`,
  };
}

/**
 * A repair is only allowed to replace the previous response when it is at
 * least as consistent. This prevents a failed repair from degrading output.
 */
export function selectBestConsistency(
  original: ResponseConsistencyResult,
  candidate: ResponseConsistencyResult
): ResponseConsistencyResult {
  if (candidate.accepted && !original.accepted) return candidate;
  if (candidate.score > original.score) return candidate;
  return original;
}
