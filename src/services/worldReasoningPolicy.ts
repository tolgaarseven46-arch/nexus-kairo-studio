import type { WorldStateAppraisal } from "./worldStateAppraisal";

export type WorldReasoningMode =
  | "no_grounded_basis"
  | "qualified_evidence"
  | "preserve_conflict"
  | "current_state_answer";

export interface WorldReasoningPolicy {
  mode: WorldReasoningMode;
  mayAnswerFromMemory: boolean;
  mayStateCurrentWorldState: boolean;
  mustQualify: boolean;
  mustPreserveConflict: boolean;
  mustPreserveReportedAttribution: boolean;
  mayClaimNoMemory: boolean;
  readOnly: true;
  reasons: string[];
}

/**
 * Converts read-only world-state appraisal into bounded response permissions.
 *
 * This is intentionally separate from BehaviorContract: it cannot change
 * relationship, emotion, personality, playfulness, affection, questions or
 * dynamic state. It only decides how strongly the response may speak about
 * retrieved world-memory evidence.
 */
export function deriveWorldReasoningPolicy(
  appraisal: WorldStateAppraisal,
): WorldReasoningPolicy {
  const reported = ["grounded_reported", "grounded_mixed"].includes(
    appraisal.evidencePosture,
  );

  if (appraisal.truthPosture === "conflicting") {
    return {
      mode: "preserve_conflict",
      mayAnswerFromMemory: appraisal.groundedEvidenceCount > 0,
      mayStateCurrentWorldState: false,
      mustQualify: true,
      mustPreserveConflict: true,
      mustPreserveReportedAttribution: reported,
      mayClaimNoMemory: appraisal.mayClaimNoMemory,
      readOnly: true,
      reasons: ["Canonical world evidence is conflicting; response must preserve the conflict."],
    };
  }

  if (
    appraisal.truthPosture === "current_state_supported" &&
    appraisal.groundedEvidenceCount > 0
  ) {
    return {
      mode: reported ? "qualified_evidence" : "current_state_answer",
      mayAnswerFromMemory: true,
      mayStateCurrentWorldState: !reported,
      mustQualify: appraisal.requiresEpistemicQualifier || reported,
      mustPreserveConflict: false,
      mustPreserveReportedAttribution: reported,
      mayClaimNoMemory: false,
      readOnly: true,
      reasons: [
        reported
          ? "Current-state evidence is grounded but user-reported; keep attribution."
          : "Current-state projection is grounded and consistent; bounded current-state answer is allowed.",
      ],
    };
  }

  if (appraisal.groundedEvidenceCount > 0) {
    return {
      mode: "qualified_evidence",
      mayAnswerFromMemory: true,
      mayStateCurrentWorldState: false,
      mustQualify: true,
      mustPreserveConflict: false,
      mustPreserveReportedAttribution: reported,
      mayClaimNoMemory: false,
      readOnly: true,
      reasons: ["Grounded evidence exists without authoritative current-state support; answer only as qualified recall evidence."],
    };
  }

  return {
    mode: "no_grounded_basis",
    mayAnswerFromMemory: false,
    mayStateCurrentWorldState: false,
    mustQualify: false,
    mustPreserveConflict: false,
    mustPreserveReportedAttribution: false,
    mayClaimNoMemory: true,
    readOnly: true,
    reasons: ["No grounded world-memory basis is available."],
  };
}

export function buildWorldReasoningPolicyInstruction(
  policy: WorldReasoningPolicy,
): string {
  if (policy.mode === "no_grounded_basis") return "";

  return [
    "WORLD REASONING POLICY (BAĞLAYICI, READ-ONLY):",
    `mode=${policy.mode}`,
    `mayAnswerFromMemory=${policy.mayAnswerFromMemory}`,
    `mayStateCurrentWorldState=${policy.mayStateCurrentWorldState}`,
    `mustQualify=${policy.mustQualify}`,
    `mustPreserveConflict=${policy.mustPreserveConflict}`,
    `mustPreserveReportedAttribution=${policy.mustPreserveReportedAttribution}`,
    `mayClaimNoMemory=${policy.mayClaimNoMemory}`,
    "KURALLAR:",
    "- Bu politika yalnızca world-memory hakkında ne kadar iddialı konuşabileceğini sınırlar; sosyal davranış, ilişki, duygu, kişilik ve dynamic state üzerinde yetkisi yoktur.",
    "- mode=preserve_conflict ise tek tarafı doğru ilan etme ve çelişkiyi gizleme.",
    "- mode=qualified_evidence ise kaydı/anlatılanı hatırladığını söyleyebilirsin fakat onu dış dünyada doğrulanmış gerçek gibi sunma.",
    "- mustPreserveReportedAttribution=true ise kullanıcının daha önce aktardığı bilgi olduğunu koru.",
    "- mayStateCurrentWorldState=false ise canonical evidence dışında kesin şimdiki durum sonucu üretme.",
  ].join("\n");
}
