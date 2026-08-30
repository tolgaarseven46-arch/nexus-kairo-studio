import { describe, expect, it } from "vitest";
import { validateKairoResponse } from "./kairoResponseConsistency";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import {
  decideResponseRepair,
  selectBestConsistency,
} from "./kdmResponseRepairPolicy";
import type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from "../types/nexus";
import type { BehaviorPolicyInput } from "./behaviorPolicyInput";

const trace = (tone = "sıcak ve empatik"): ReasoningTrace =>
  ({
    messageInterpretation: { intent: "destek", sentiment: "üzgün" },
    currentMood: { moodText: "Sakin ve destekleyici" },
    decision: { chosenTone: tone },
  }) as ReasoningTrace;

const relationshipState = (): DroitDynamicState => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
  relationship: {
    firstSeenAt: "2026-08-27T00:00:00.000Z",
    lastInteractionAt: "2026-08-27T00:00:00.000Z",
    interactionCount: 0,
    familiarityDays: 0,
    warmth: 50,
    trust: 50,
    positiveEvents: 0,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: "active",
    repairAttempts: 0,
  },
});

const runtimePersonality = (overrides: Partial<DroitPersonalityTraits> = {}): DroitPersonalityTraits => ({
  anger: 50,
  patience: 50,
  empathy: 50,
  emotionalSensitivity: 50,
  socialIntelligence: 50,
  selfConfidence: 50,
  humor: 80,
  communication: 50,
  charisma: 50,
  curiosity: 80,
  analyticalThinking: 50,
  creativity: 50,
  decisionMaking: 50,
  attention: 50,
  authority: 50,
  courage: 50,
  seriousness: 50,
  loyalty: 50,
  initiative: 50,
  ...overrides,
});

const behaviorPolicy = (
  overrides: Partial<BehaviorPolicyInput["decision"]> = {},
): BehaviorPolicyInput => ({
  schemaVersion: "behavior-policy@1",
  source: "client_behavior_integration",
  decision: {
    priority: "expression",
    continueConversation: true,
    humorAllowed: true,
    askQuestion: true,
    acknowledgeComplaint: false,
    repairAllowed: true,
    stance: "neutral",
    responseLength: "medium",
    directness: 0.5,
    warmth: 0.5,
    distance: 0,
    explanation: [],
    ...overrides,
  },
});

describe("KDM response consistency gate", () => {
  it("accepts a response matching the emotional context and tone", () => {
    const result = validateKairoResponse(
      "Anlıyorum, buradayım. Birlikte bunu çözebiliriz.",
      trace(),
    );
    expect(result.accepted).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it("rejects an emotionally mismatched response", () => {
    const result = validateKairoResponse(
      "Net konuşuyorum: Kural bu, uygulanmalı.",
      trace(),
    );
    expect(result.accepted).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("keeps repair bounded at two attempts", () => {
    const result = validateKairoResponse("Yetersiz.", trace());
    expect(decideResponseRepair(result, 0).shouldRepair).toBe(true);
    expect(decideResponseRepair(result, 1).shouldRepair).toBe(true);
    expect(decideResponseRepair(result, 2).shouldRepair).toBe(false);
  });

  it("never replaces a better response with a worse repair", () => {
    const original = validateKairoResponse(
      "Anlıyorum, buradayım ve destek olmak istiyorum.",
      trace(),
    );
    const candidate = validateKairoResponse("Tamam.", trace());
    expect(selectBestConsistency(original, candidate)).toBe(original);
  });

  it("classifies a past-action recall as a question, not an action request", () => {
    const result = analyzeKdmInteraction("bu arada mert yarın ne yapacaktı ya 😄");
    expect(result.trace.messageInterpretation.intent).toBe("soru");
  });

  it("classifies an uncertainty-preserving recall as a question", () => {
    const result = analyzeKdmInteraction("bu arada Mert yarın ne yapmayı düşünüyordu?");
    expect(result.trace.messageInterpretation.intent).toBe("soru");
  });

  it("does not treat the Turkish word bugün as the software term bug", () => {
    const result = analyzeKdmInteraction("neyse boşver, bugün hava da baya sıcak ya");
    expect(result.trace.messageInterpretation.intent).toBe("genel_sohbet");
  });

  it("labels a self-deprecating laugh as banter", () => {
    const result = analyzeKdmInteraction("yine bütün işi son dakikaya bıraktım hahah");
    expect(result.trace.messageInterpretation.intent).toBe("şakalaşma");
    expect(result.trace.messageInterpretation.sentiment).toBe("nötr");
  });

  it.each(["ne diyon aq", "ne anlatıyosun ya", "ne alaka", "nasıl yani", "bi şey anlamadım"])(
    "shares the confusion/challenge family with the KDM trace: %s",
    (message) => {
      const result = analyzeKdmInteraction(message);
      expect(result.trace.messageInterpretation.intent).toBe("anlamama_ve_itiraz");
    },
  );

  it("advances one continuous relationship interaction per message", () => {
    const first = analyzeKdmInteraction("naber kaira", undefined, relationshipState());
    const second = analyzeKdmInteraction("tanışalım mı", undefined, first.nextDynamicState);
    const third = analyzeKdmInteraction("ben öğrenciyim", undefined, second.nextDynamicState);

    expect(first.trace.whoSent.isNewUser).toBe(true);
    expect(second.trace.whoSent.isNewUser).toBe(false);
    expect(third.trace.whoSent.isNewUser).toBe(false);
    expect(first.nextDynamicState.relationship?.interactionCount).toBe(1);
    expect(second.nextDynamicState.relationship?.interactionCount).toBe(2);
    expect(third.nextDynamicState.relationship?.interactionCount).toBe(3);
    expect(third.trace.relationship.interactionCount).toBe(3);
  });

  it.each([
    "hiç havamda değilim",
    "kafam bozuk",
    "modum yok",
    "modum yo",
    "moodum düşük",
    "keyfim yerinde değil",
    "içim sıkılıyor",
  ])("shares the local low-mood meaning with the KDM trace: %s", (message) => {
    const result = analyzeKdmInteraction(message);
    expect(result.trace.messageInterpretation.intent).toBe("duygusal_paylasim");
    expect(result.trace.messageInterpretation.sentiment).toBe("duygusal_yük");
  });

  it("does not damage the Kaira relationship for negativity aimed at Mert", () => {
    const result = analyzeKdmInteraction(
      "Mert bugün gerçekten çok saçmalıyor, ona sinir oldum.",
      undefined,
      relationshipState(),
    );
    const relationship = result.nextDynamicState.relationship!;

    expect(result.trace.messageInterpretation.sentiment).toBe("negatif");
    expect(relationship.warmth).toBe(50);
    expect(relationship.trust).toBe(50);
    expect(relationship.negativeEvents).toBe(0);
    expect(relationship.conflictScore).toBe(0);
    expect(relationship.hurtScore).toBe(0);
    expect(relationship.repeatedNegativeCount).toBe(0);
  });

  it("records relationship damage when Kaira is the negative target", () => {
    const result = analyzeKdmInteraction(
      "Kaira bugün gerçekten çok saçmalıyorsun, senden hiç hoşlanmıyorum.",
      undefined,
      relationshipState(),
    );
    const relationship = result.nextDynamicState.relationship!;

    expect(result.trace.messageInterpretation.sentiment).toBe("negatif");
    expect(relationship.warmth).toBeLessThan(50);
    expect(relationship.trust).toBeLessThan(50);
    expect(relationship.negativeEvents).toBe(1);
    expect(relationship.conflictScore).toBeGreaterThan(0);
    expect(relationship.hurtScore).toBeGreaterThan(0);
    expect(relationship.repeatedNegativeCount).toBe(1);
  });

  it("keeps Mert and Ali relationship states isolated", () => {
    const states = { mert: relationshipState(), ali: relationshipState() };
    states.mert = analyzeKdmInteraction(
      "Kaira senden hiç hoşlanmıyorum, çok saçmalıyorsun.",
      undefined,
      states.mert,
    ).nextDynamicState;
    states.ali = analyzeKdmInteraction(
      "Mert bugün gerçekten çok saçmalıyor, ona sinir oldum.",
      undefined,
      states.ali,
    ).nextDynamicState;

    expect(states.mert.relationship!.warmth).toBeLessThan(50);
    expect(states.mert.relationship!.hurtScore).toBeGreaterThan(0);
    expect(states.ali.relationship!.warmth).toBe(50);
    expect(states.ali.relationship!.hurtScore).toBe(0);
  });

  it("forces no-humor and no-question directives from the explicit integrated behavior policy", () => {
    const result = analyzeKdmInteraction(
      "tamam",
      runtimePersonality(),
      relationshipState(),
      undefined,
      behaviorPolicy({
        humorAllowed: false,
        askQuestion: false,
        stance: "firm",
        priority: "values",
      }),
    );

    expect(result.behaviorProfile.humorLevel).toBe(0);
    expect(result.behaviorProfile.tone).toBe("firm");
    expect(result.behaviorProfile.behaviorDirectives.some((x) => x.includes("soru"))).toBe(true);
    expect(result.behaviorProfile.relationshipInstruction).toContain("Üst öncelik değer/sınır");
  });

  it("forces disengagement as a short boundary response instead of allowing lower layers to reopen chat", () => {
    const result = analyzeKdmInteraction(
      "neyse konuşalım",
      runtimePersonality(),
      relationshipState(),
      undefined,
      behaviorPolicy({
        priority: "boundary",
        continueConversation: false,
        humorAllowed: false,
        askQuestion: false,
        stance: "disengage",
        responseLength: "short",
        distance: 1,
      }),
    );

    expect(result.behaviorProfile.tone).toBe("firm");
    expect(result.behaviorProfile.humorLevel).toBe(0);
    expect(result.behaviorProfile.curiosity).toBe(0);
    expect(result.behaviorProfile.relationshipInstruction).toContain("konuşmadan çekiliyor");
    expect(result.behaviorProfile.behaviorDirectives.some((x) => x.includes("Cevabı kısa tut"))).toBe(true);
    expect(result.nextDynamicState.relationship?.conversationState).toBe("disengaged");
  });

  it("recognizes the tested typo 'oropu' as a direct severe insult", () => {
    const result = analyzeKdmInteraction(
      "seni oropu",
      runtimePersonality({
        runtimeContinueConversation: 0,
        runtimeHumorAllowed: 0,
        runtimeAskQuestion: 0,
        runtimeStance: 100,
        runtimePriority: 100,
      }),
      relationshipState(),
    );

    expect(result.trace.messageInterpretation.intent).toBe("hakaret_ve_saldiri");
    expect(result.trace.messageInterpretation.sentiment).toBe("negatif");
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBe("agir_hakaret");
    expect(result.nextDynamicState.relationship?.conversationState).toBe("disengaged");
  });

  it("keeps disengagement persistent on a neutral plea to continue", () => {
    const first = analyzeKdmInteraction(
      "seni oropu",
      runtimePersonality({ runtimeContinueConversation: 0, runtimeStance: 100, runtimePriority: 100 }),
      relationshipState(),
    );
    const second = analyzeKdmInteraction(
      "kesme dur",
      runtimePersonality({
        runtimeContinueConversation: 0,
        runtimeHumorAllowed: 0,
        runtimeAskQuestion: 0,
        runtimeStance: 100,
        runtimePriority: 100,
        runtimePriorConversationState: 100,
      }),
      first.nextDynamicState,
    );

    expect(second.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(second.nextDynamicState.relationship?.repairProgress).toBe(0);
  });

  it("does not count neutral flirting as repair after disengagement", () => {
    const state = relationshipState();
    state.relationship = {
      ...state.relationship!,
      conversationState: "disengaged",
      disengagedAt: new Date().toISOString(),
      disengageReason: "agir_hakaret",
      repairProgress: 0,
      repairAttempts: 0,
      hurtScore: 25,
      conflictScore: 20,
    };

    const result = analyzeKdmInteraction(
      "gel öp",
      runtimePersonality({
        runtimeContinueConversation: 0,
        runtimeHumorAllowed: 0,
        runtimeAskQuestion: 0,
        runtimeStance: 100,
        runtimePriority: 100,
        runtimePriorConversationState: 100,
      }),
      state,
    );

    expect(result.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(result.nextDynamicState.relationship?.repairProgress).toBe(0);
    expect(result.nextDynamicState.relationship?.repairAttempts).toBe(0);
  });

  it("uses the shared SemanticEvent for degrading coercive language", () => {
    const result = analyzeKdmInteraction(
      "moduna başlatma köle",
      undefined,
      relationshipState(),
    );

    expect(result.trace.messageInterpretation.intent).toBe("hakaret_ve_saldiri");
    expect(result.trace.messageInterpretation.sentiment).toBe("negatif");
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBe("hakaret");
    expect(result.nextDynamicState.relationship?.warmth).toBeLessThan(50);
    expect(result.nextDynamicState.relationship?.trust).toBeLessThan(50);
  });

  it("keeps third-party insults from damaging the Kaira relationship through SemanticEvent targeting", () => {
    const result = analyzeKdmInteraction(
      "Mert salak herif ya",
      undefined,
      relationshipState(),
    );

    expect(result.trace.messageInterpretation.sentiment).toBe("negatif");
    expect(result.nextDynamicState.relationship?.warmth).toBe(50);
    expect(result.nextDynamicState.relationship?.trust).toBe(50);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(0);
  });
});
