import { describe, expect, it } from "vitest";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";
import {
  findDialogueDecisionIssues,
  planDialogueResponse,
  type DialogueDecisionPlan,
} from "./kairoDialogueDecisionEngine";
import type { SemanticEvent } from "./semanticEventEngine";

const event: SemanticEvent = {
  raw: "neyse aşkım oyun mu oynasak ya birlikte",
  normalized: "neyse aşkım birlikte oyun mu oynasak",
  intent: "command",
  socialRoutine: "none",
  discourseAct: "none",
  repairSignal: "none",
  adviceRequested: false,
  target: "kaira",
  relationalAct: "closeness_bid",
  relationalIntensity: 0.7,
  affection: 0.7,
  worldMemory: { claims: [], query: null },
} as SemanticEvent;

function resolve(dialogue: DialogueDecisionPlan) {
  return resolveKairaResponsePlan({
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
    speech: {
      register: "casual",
      relationshipLevel: "new",
    } as any,
    contract: {
      stance: "open",
      repairStatus: "none",
      semanticUncertainty: 0.2,
    } as any,
  });
}

describe("action-request coordination question regression", () => {
  it("allows one clarification/coordination question when the action obligation explicitly allows clarify", () => {
    const dialogue = planDialogueResponse([], event.raw, "Mert", event);
    expect(dialogue.move).toBe("respond_to_action_request");
    expect(dialogue.obligation?.type).toBe("action_request");
    expect(dialogue.obligation?.satisfactionCriteria.allowedResolutions).toContain("clarify");

    const resolved = resolve(dialogue);
    expect(resolved.allowQuestion).toBe(true);
    expect(resolved.resolverRationale).toContain(
      "action_request:clarification-question-authorized-by-obligation",
    );
    expect(
      findDialogueDecisionIssues("oyun olur, ne oynayalım?", dialogue, {
        allowQuestion: resolved.allowQuestion,
      }),
    ).not.toContain("Diyalog kararı takip sorusunu yasakladığı halde soru eklendi");
  });

  it("does not turn question permission into a free-form escape from the action obligation", () => {
    const dialogue = planDialogueResponse([], "bana şiir oku", "Mert", {
      ...event,
      raw: "bana şiir oku",
      normalized: "bana şiir oku",
      relationalAct: "none",
      affection: 0,
    });
    const resolved = resolve(dialogue);

    expect(resolved.allowQuestion).toBe(true);
    expect(findDialogueDecisionIssues("tamam", dialogue)).toContain(
      "DialogueDecision obligation karşılanmadı: action_request yalnız acknowledgement ile kapatılamaz",
    );
  });

  it("keeps neighboring non-obligation moves governed by ordinary question drive", () => {
    const dialogue: DialogueDecisionPlan = {
      move: "natural_reaction",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      hasSupportedTargetClaim: false,
      reason: "test",
    };

    expect(resolve(dialogue).allowQuestion).toBe(false);
  });
});
