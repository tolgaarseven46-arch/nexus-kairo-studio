import type { RetrievedWorldEvent } from "./worldEventRetrieval";
import type { WorldModelAssertionState } from "./worldModelProjection";
import type { PlanLifecycleState } from "./worldEventLifecycle";
import { resolveContradictionEvidence } from "./worldEventContradictionResolver";

export type WorldStateEvidencePosture =
  | "none"
  | "ambiguous_only"
  | "grounded_reported"
  | "grounded_direct"
  | "grounded_mixed";

export type WorldStateTruthPosture =
  | "unknown"
  | "evidence_only"
  | "current_state_supported"
  | "conflicting";

export interface WorldStateAppraisal {
  evidencePosture: WorldStateEvidencePosture;
  truthPosture: WorldStateTruthPosture;
  groundedEvidenceCount: number;
  ambiguousEvidenceCount: number;
  assertionStates: WorldModelAssertionState[];
  lifecycleStates: PlanLifecycleState[];
  requiresEpistemicQualifier: boolean;
  mayClaimNoMemory: boolean;
  mayPromoteToVerifiedTruth: boolean;
  readOnly: true;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

/**
 * Read-only appraisal over already retrieved canonical world evidence.
 *
 * This seam is intentionally NOT allowed to mutate relationship, emotion,
 * personality or dynamic state. It only turns canonical evidence/projection
 * into bounded reasoning permissions for response generation.
 */
export function appraiseRetrievedWorldState(
  items: RetrievedWorldEvent[],
): WorldStateAppraisal {
  const grounded = items.filter((item) => item.observation.status === "grounded");
  const ambiguous = items.filter((item) => item.observation.status !== "grounded");
  const hasReported = grounded.some((item) => item.observation.kind === "reported_claim");
  const hasDirect = grounded.some((item) => item.observation.kind === "direct_interaction");

  const assertionStates = unique(
    items
      .map((item) => item.projectedState?.assertionState)
      .filter((value): value is WorldModelAssertionState => Boolean(value)),
  );
  const lifecycleStates = unique(
    items
      .map((item) => item.projectedState?.lifecycle.state)
      .filter((value): value is PlanLifecycleState => Boolean(value) && value !== "unknown"),
  );

  const rawGroundedConflict = resolveContradictionEvidence(
    grounded.map((item) => item.observation),
  ).some((set) => set.status === "conflicting");

  const hasCanonicalConflict =
    rawGroundedConflict ||
    items.some(
      (item) =>
        item.projectedState?.evidenceStatus === "conflicting" ||
        item.projectedState?.assertionState === "conflicting" ||
        item.reasons.includes("canonical_conflict_evidence"),
    );

  const hasSupportedCurrentState =
    grounded.length > 0 &&
    !hasCanonicalConflict &&
    items.some(
      (item) =>
        item.projectedState &&
        item.projectedState.evidenceStatus === "consistent" &&
        ["affirmed", "denied"].includes(item.projectedState.assertionState),
    );

  let evidencePosture: WorldStateEvidencePosture = "none";
  if (!grounded.length && ambiguous.length) evidencePosture = "ambiguous_only";
  else if (grounded.length && hasReported && hasDirect) evidencePosture = "grounded_mixed";
  else if (grounded.length && hasReported) evidencePosture = "grounded_reported";
  else if (grounded.length && hasDirect) evidencePosture = "grounded_direct";

  let truthPosture: WorldStateTruthPosture = "unknown";
  if (hasCanonicalConflict) truthPosture = "conflicting";
  else if (hasSupportedCurrentState) truthPosture = "current_state_supported";
  else if (grounded.length) truthPosture = "evidence_only";

  const requiresEpistemicQualifier =
    hasCanonicalConflict ||
    hasReported ||
    ambiguous.length > 0 ||
    truthPosture === "evidence_only";

  return {
    evidencePosture,
    truthPosture,
    groundedEvidenceCount: grounded.length,
    ambiguousEvidenceCount: ambiguous.length,
    assertionStates,
    lifecycleStates,
    requiresEpistemicQualifier,
    mayClaimNoMemory: grounded.length === 0,
    // Even a consistent projection is a bounded read-model, not an external
    // verification oracle. Reported claims in particular are never promoted to
    // verified truth by appraisal.
    mayPromoteToVerifiedTruth: false,
    readOnly: true,
  };
}

export function buildWorldStateAppraisalInstruction(
  appraisal: WorldStateAppraisal,
): string {
  if (appraisal.evidencePosture === "none") return "";

  const assertions = appraisal.assertionStates.length
    ? appraisal.assertionStates.join(",")
    : "yok";
  const lifecycles = appraisal.lifecycleStates.length
    ? appraisal.lifecycleStates.join(",")
    : "yok";

  return `WORLD STATE APPRAISAL (READ-ONLY):\n` +
    `evidence=${appraisal.evidencePosture}; truth=${appraisal.truthPosture}; ` +
    `grounded=${appraisal.groundedEvidenceCount}; ambiguous=${appraisal.ambiguousEvidenceCount}; ` +
    `assertion=${assertions}; lifecycle=${lifecycles}; qualifier=${appraisal.requiresEpistemicQualifier ? "required" : "optional"}.\n` +
    `KURALLAR:\n` +
    `- Bu appraisal yalnızca cevap muhakemesini sınırlar; duygu, ilişki, kişilik veya dynamic state DEĞİŞTİRMEZ.\n` +
    `- truth=conflicting ise tek gerçek seçme; çelişkiyi koru.\n` +
    `- truth=evidence_only ise kanıtın varlığını anlatabilirsin ama bunu dış dünyada doğrulanmış gerçek gibi yükseltme.\n` +
    `- qualifier=required ise reported/ambiguous/conflicting niteliğini cevapta koru.\n` +
    `- grounded>0 ise hafıza/kanıt yokmuş gibi davranma.\n` +
    `- Appraisal ham mesajı yeniden yorumlamaz; canonical state dışında yeni actor, olay, neden veya sonuç UYDURMA.`;
}
