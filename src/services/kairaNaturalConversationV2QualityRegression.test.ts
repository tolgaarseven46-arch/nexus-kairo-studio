import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";
import { findKairaResponsePlanIssues, type KairaResponsePlan } from "./kairaResponsePlan";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticInterpretation } from "../types/semanticInterpretation";

function semantic(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw: "Mert yine geç kaldı",
    normalized: "mert yine geç kaldı",
    primaryIntent: "emotional_share",
    secondarySocialActs: [],
    target: "third_party",
    valence: "neutral",
    severity: { disrespect: 0.1, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0.2,
    sincerityConfidence: 0.8,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0.3,
    apology: false,
    repairAttempt: false,
    stopRequest: false,
    discourseFacets: {
      socialRoutine: "none",
      discourseAct: "none",
      repairSignal: "none",
      adviceRequested: false,
      knowledgeQuery: null,
      selfMemoryQuery: null,
      relationalAct: "none",
      relationalIntensity: 0.2,
      stopQuestions: false,
      stopTalking: false,
    },
    uncertainty: { overall: 0.25, intent: 0.2, target: 0.2, severity: 0.25 },
    evidence: [{ source: "llm", provider: "test", cues: [], confidence: 0.8 }],
    ...overrides,
  };
}

function resolvedPlan(
  semanticUncertainty: number,
  options: { socialRoutine?: string; questionStopRequested?: boolean } = {},
) {
  return resolveKairaResponsePlan({
    hard: {
      hardDisengage: false,
      hardDisengageReason: null,
      mustAcknowledgeBoundary: false,
      flirtingAllowed: false,
      counterFlirtAllowed: false,
      acceptsSlurBanter: true,
      epistemicHonesty: true,
      intimacyCeiling: 0.25,
      questionAllowed: false,
      humorAllowed: true,
      affectionAllowed: true,
      adviceAllowed: false,
      forgivenessAllowed: true,
      reopeningClosenessAllowed: true,
      maxSentences: 2,
      maxWords: 32,
      emojiBudget: 1,
      reasons: [],
    },
    soft: {
      opennessTendency: 0.8,
      warmthTendency: 0.65,
      guardedness: 0.2,
      humorInclination: 0.5,
      questionDrive: 0,
      intimacyInclination: 0.2,
      verbosityTendency: 0.5,
      rationale: [],
    },
    dialogue: {
      move: "natural_reaction",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 2,
      hasSupportedTargetClaim: false,
      reason: "natural",
      socialRoutine: options.socialRoutine ?? "none",
    } as any,
    speech: { register: "balanced", relationshipLevel: "new" } as any,
    contract: {
      conversationState: "active",
      continueConversation: true,
      playfulness: "allowed",
      affection: "allowed",
      questions: "forbidden",
      advice: "forbidden",
      questionStopRequested: options.questionStopRequested ?? false,
      forgivenessGranted: true,
      repairStatus: "repaired",
      reopeningCloseness: "allowed",
      stance: "open",
      maxResponseLength: "medium",
      reasons: [],
      semanticUncertainty,
    },
  });
}

describe("natural conversation v2 quality authority", () => {
  it("reconciles a neutral low-load third-party event away from emotional_share", async () => {
    const result = await understandTurkishMessage("Mert yine geç kaldı", {
      incomingSemanticInterpretation: semantic(),
    });
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.event.intent).not.toBe("emotional_share");
    expect(result.interpretation.evidence.some((e) => e.source === "reconciled")).toBe(true);
  });

  it("preserves a genuine negative high-load third-party emotional share", async () => {
    const result = await understandTurkishMessage("Mert yüzünden çok üzgünüm", {
      incomingSemanticInterpretation: semantic({
        raw: "Mert yüzünden çok üzgünüm",
        normalized: "mert yüzünden çok üzgünüm",
        valence: "negative",
        emotionalLoad: 0.75,
      }),
    });
    expect(result.interpretation.primaryIntent).toBe("emotional_share");
    expect(result.event.intent).toBe("emotional_share");
  });

  it("requires content engagement on grounded ordinary natural reactions", () => {
    const resolved = resolvedPlan(0.2);
    expect(resolved.requiredContent).toContain("engage_user_content");
    expect(resolved.requiredContent).not.toContain("preserve_ambiguity");
    const plan = {
      allowQuestion: false,
      allowAdvice: false,
      allowHumor: true,
      allowAffection: true,
      allowForgiveness: true,
      allowReopeningCloseness: true,
      counterFlirtAllowed: false,
      maxSentences: 2,
      maxWords: 32,
      emojiBudget: 1,
      socialMove: "none",
      requiredContent: resolved.requiredContent,
    } as KairaResponsePlan;
    expect(findKairaResponsePlanIssues("he anladım", plan)).toContain("response_plan_content_engagement_missing");
    expect(findKairaResponsePlanIssues("of kahve masayı seçmiş bugün", plan)).not.toContain("response_plan_content_engagement_missing");
  });

  it("keeps ambiguity preservation exclusive of content engagement", () => {
    const resolved = resolvedPlan(0.85);
    expect(resolved.requiredContent).toContain("preserve_ambiguity");
    expect(resolved.requiredContent).not.toContain("engage_user_content");
  });

  it("does not force content engagement on social routines", () => {
    const resolved = resolvedPlan(0.2, { socialRoutine: "how_are_you" });
    expect(resolved.requiredContent).not.toContain("engage_user_content");
  });

  it("does not force content engagement on explicit question-stop control turns", () => {
    const resolved = resolvedPlan(0.2, { questionStopRequested: true });
    expect(resolved.requiredContent).not.toContain("engage_user_content");
  });
});
