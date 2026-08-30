import { describe, expect, it } from "vitest";
import {
  buildWorldReasoningPolicyInstruction,
  deriveWorldReasoningPolicy,
} from "./worldReasoningPolicy";
import type { WorldStateAppraisal } from "./worldStateAppraisal";

function appraisal(
  input: Partial<WorldStateAppraisal> = {},
): WorldStateAppraisal {
  return {
    evidencePosture: "none",
    truthPosture: "unknown",
    groundedEvidenceCount: 0,
    ambiguousEvidenceCount: 0,
    assertionStates: [],
    lifecycleStates: [],
    requiresEpistemicQualifier: false,
    mayClaimNoMemory: true,
    mayPromoteToVerifiedTruth: false,
    readOnly: true,
    ...input,
  };
}

describe("world reasoning policy contract", () => {
  it("preserves canonical conflict and forbids current-state promotion", () => {
    const policy = deriveWorldReasoningPolicy(appraisal({
      evidencePosture: "grounded_mixed",
      truthPosture: "conflicting",
      groundedEvidenceCount: 2,
      requiresEpistemicQualifier: true,
      mayClaimNoMemory: false,
    }));

    expect(policy.mode).toBe("preserve_conflict");
    expect(policy.mustPreserveConflict).toBe(true);
    expect(policy.mayStateCurrentWorldState).toBe(false);
    expect(policy.mustPreserveReportedAttribution).toBe(true);
    expect(policy.readOnly).toBe(true);
  });

  it("allows bounded current-state answer only for grounded direct consistent state", () => {
    const policy = deriveWorldReasoningPolicy(appraisal({
      evidencePosture: "grounded_direct",
      truthPosture: "current_state_supported",
      groundedEvidenceCount: 1,
      mayClaimNoMemory: false,
    }));

    expect(policy.mode).toBe("current_state_answer");
    expect(policy.mayAnswerFromMemory).toBe(true);
    expect(policy.mayStateCurrentWorldState).toBe(true);
    expect(policy.mustQualify).toBe(false);
  });

  it("keeps user-reported current-state evidence qualified", () => {
    const policy = deriveWorldReasoningPolicy(appraisal({
      evidencePosture: "grounded_reported",
      truthPosture: "current_state_supported",
      groundedEvidenceCount: 1,
      requiresEpistemicQualifier: true,
      mayClaimNoMemory: false,
    }));

    expect(policy.mode).toBe("qualified_evidence");
    expect(policy.mayStateCurrentWorldState).toBe(false);
    expect(policy.mustQualify).toBe(true);
    expect(policy.mustPreserveReportedAttribution).toBe(true);
  });

  it("does not invent grounded basis from ambiguous-only appraisal", () => {
    const policy = deriveWorldReasoningPolicy(appraisal({
      evidencePosture: "ambiguous_only",
      ambiguousEvidenceCount: 1,
    }));

    expect(policy.mode).toBe("no_grounded_basis");
    expect(policy.mayAnswerFromMemory).toBe(false);
    expect(policy.mayClaimNoMemory).toBe(true);
    expect(buildWorldReasoningPolicyInstruction(policy)).toBe("");
  });

  it("keeps reasoning policy separate from social behavior authority", () => {
    const instruction = buildWorldReasoningPolicyInstruction(
      deriveWorldReasoningPolicy(appraisal({
        evidencePosture: "grounded_reported",
        truthPosture: "evidence_only",
        groundedEvidenceCount: 1,
        requiresEpistemicQualifier: true,
        mayClaimNoMemory: false,
      })),
    );

    expect(instruction).toContain("READ-ONLY");
    expect(instruction).toContain("ilişki");
    expect(instruction).toContain("dynamic state");
    expect(instruction).toContain("mode=qualified_evidence");
  });
});
