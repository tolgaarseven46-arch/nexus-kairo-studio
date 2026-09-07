import { describe, expect, it } from "vitest";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";
import type { SemanticEvent } from "./semanticEventEngine";

function event(raw: string): SemanticEvent {
  return {
    raw,
    normalized: raw,
    intent: "command",
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    target: "kaira",
    relationalAct: "none",
    relationalIntensity: 0.2,
    affection: 0.1,
    worldMemory: { claims: [], query: null },
  } as SemanticEvent;
}

function allowQuestion(raw: string) {
  const dialogue = planDialogueResponse([], raw, "Mert", event(raw));
  const plan = resolveKairaResponsePlan({
    dialogue,
    hard: {
      hardDisengage: false,
      mustAcknowledgeBoundary: false,
      questionAllowed: true,
      humorAllowed: true,
      adviceAllowed: false,
      flirtingAllowed: false,
      counterFlirtAllowed: false,
      intimacyCeiling: 0.25,
      affectionAllowed: false,
      forgivenessAllowed: true,
      reopeningClosenessAllowed: true,
      maxSentences: 2,
      maxWords: 24,
      emojiBudget: 1,
      reasons: [],
    } as any,
    soft: {
      questionDrive: 0,
      warmthTendency: 0.65,
      guardedness: 0.2,
      intimacyInclination: 0.25,
      opennessTendency: 0.8,
      verbosityTendency: 0.5,
      rationale: [],
    } as any,
    speech: { register: "casual", relationshipLevel: "new" } as any,
    contract: { stance: "open", repairStatus: "none", semanticUncertainty: 0.2 } as any,
  });
  return { dialogue, plan };
}

describe("action clarification bug-class neighbor proof", () => {
  it("reported: captured play-together request authorizes a coordination question", () => {
    const { dialogue, plan } = allowQuestion("neyse aşkım oyun mu oynasak ya birlikte");
    expect(dialogue.obligation?.satisfactionCriteria.allowedResolutions).toContain("clarify");
    expect(plan.allowQuestion).toBe(true);
  });

  it("neighbor-1: another collaborative action request authorizes clarification", () => {
    const { dialogue, plan } = allowQuestion("hadi birlikte bir şey yapalım");
    expect(dialogue.obligation?.satisfactionCriteria.allowedResolutions).toContain("clarify");
    expect(plan.allowQuestion).toBe(true);
  });

  it("neighbor-2: a joint selection action request authorizes clarification", () => {
    const { dialogue, plan } = allowQuestion("birlikte bir oyun seçelim");
    expect(dialogue.obligation?.satisfactionCriteria.allowedResolutions).toContain("clarify");
    expect(plan.allowQuestion).toBe(true);
  });

  it("counterexample: ordinary natural reaction with no obligation remains governed by normal question drive", () => {
    const dialogue = {
      move: "natural_reaction",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      hasSupportedTargetClaim: false,
      reason: "test",
    } as any;
    const plan = resolveKairaResponsePlan({
      dialogue,
      hard: {
        hardDisengage: false,
        mustAcknowledgeBoundary: false,
        questionAllowed: true,
        humorAllowed: true,
        adviceAllowed: false,
        flirtingAllowed: false,
        counterFlirtAllowed: false,
        intimacyCeiling: 0.25,
        affectionAllowed: false,
        forgivenessAllowed: true,
        reopeningClosenessAllowed: true,
        maxSentences: 2,
        maxWords: 24,
        emojiBudget: 1,
        reasons: [],
      } as any,
      soft: {
        questionDrive: 0,
        warmthTendency: 0.65,
        guardedness: 0.2,
        intimacyInclination: 0.25,
        opennessTendency: 0.8,
        verbosityTendency: 0.5,
        rationale: [],
      } as any,
      speech: { register: "casual", relationshipLevel: "new" } as any,
      contract: { stance: "open", repairStatus: "none", semanticUncertainty: 0.2 } as any,
    });
    expect(plan.allowQuestion).toBe(false);
  });
});
