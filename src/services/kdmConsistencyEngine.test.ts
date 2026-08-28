import { describe, expect, it } from "vitest";
import { validateKairoResponse } from "./kairoResponseConsistency";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import {
  decideResponseRepair,
  selectBestConsistency,
} from "./kdmResponseRepairPolicy";
import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";

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
    const result = analyzeKdmInteraction(
      "bu arada mert yarın ne yapacaktı ya 😄",
    );
    expect(result.trace.messageInterpretation.intent).toBe("soru");
  });

  it("classifies an uncertainty-preserving recall as a question", () => {
    const result = analyzeKdmInteraction(
      "bu arada Mert yarın ne yapmayı düşünüyordu?",
    );
    expect(result.trace.messageInterpretation.intent).toBe("soru");
  });

  it("does not treat the Turkish word bugün as the software term bug", () => {
    const result = analyzeKdmInteraction(
      "neyse boşver, bugün hava da baya sıcak ya",
    );
    expect(result.trace.messageInterpretation.intent).toBe("genel_sohbet");
  });

  it("labels a self-deprecating laugh as banter", () => {
    const result = analyzeKdmInteraction(
      "yine bütün işi son dakikaya bıraktım hahah",
    );

    expect(result.trace.messageInterpretation.intent).toBe("şakalaşma");
    expect(result.trace.messageInterpretation.sentiment).toBe("nötr");
  });

  it("advances one continuous relationship interaction per message", () => {
    const first = analyzeKdmInteraction(
      "naber kaira",
      undefined,
      relationshipState(),
    );
    const second = analyzeKdmInteraction(
      "tanışalım mı",
      undefined,
      first.nextDynamicState,
    );
    const third = analyzeKdmInteraction(
      "ben öğrenciyim",
      undefined,
      second.nextDynamicState,
    );

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

    expect(result.trace.messageInterpretation.intent).toBe(
      "duygusal_paylasim",
    );
    expect(result.trace.messageInterpretation.sentiment).toBe(
      "duygusal_yük",
    );
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
    const states = {
      mert: relationshipState(),
      ali: relationshipState(),
    };

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
});
