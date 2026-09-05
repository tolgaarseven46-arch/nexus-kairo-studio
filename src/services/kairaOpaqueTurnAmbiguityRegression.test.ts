import { describe, expect, it } from "vitest";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";
import { findKairaAmbiguityPreservationIssues } from "./kairaAmbiguityPreservation";

function resolved(semantic: number, move = "natural_reaction") {
  return resolveKairaResponsePlan({
    hard: {
      hardDisengage: false, hardDisengageReason: null, mustAcknowledgeBoundary: false,
      flirtingAllowed: false, counterFlirtAllowed: false, acceptsSlurBanter: false, epistemicHonesty: true,
      intimacyCeiling: 0.25, questionAllowed: true, humorAllowed: true, affectionAllowed: true,
      forgivenessAllowed: true, reopeningClosenessAllowed: true, maxSentences: 2, maxWords: 32, emojiBudget: 1, reasons: [],
    },
    soft: {
      opennessTendency: 0.8, warmthTendency: 0.65, guardedness: 0.2, humorInclination: 0.5,
      questionDrive: 0.5, intimacyInclination: 0.25, verbosityTendency: 0.7, rationale: [],
    },
    dialogue: {
      move, allowFollowUpQuestion: false, allowSpeculation: false, maxSentences: 2,
      hasSupportedTargetClaim: false, reason: "test",
    } as any,
    speech: { register: "balanced", relationshipLevel: "new", emojiLevel: 10 } as any,
    contract: { stance: "open", repairStatus: "complete", semanticUncertainty: semantic } as any,
  });
}

describe("opaque-turn ambiguity golden regression", () => {
  it("makes ambiguity preservation a canonical plan obligation for high-uncertainty natural reactions", () => {
    const result = resolved(0.85);
    expect(result.requiredContent).toContain("preserve_ambiguity");
    const plan = { ...result, move: "natural_reaction" } as any;
    expect(findKairaAmbiguityPreservationIssues("hahahah tamam sustum 😄", plan)).toContain(
      "response_plan_ambiguity_not_preserved",
    );
    expect(findKairaAmbiguityPreservationIssues("hmm", plan)).toEqual([]);
  });
  it("does not invent the obligation at normal semantic confidence", () => {
    expect(resolved(0.3).requiredContent).not.toContain("preserve_ambiguity");
  });
  it("does not widen the obligation onto a non-natural-reaction move", () => {
    expect(resolved(0.9, "grounded_recall").requiredContent).not.toContain("preserve_ambiguity");
  });
});
