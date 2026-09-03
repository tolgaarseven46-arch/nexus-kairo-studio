import { describe, expect, it } from "vitest";
import type {
  DroitDynamicState,
  ReasoningTrace,
} from "../types/nexus";
import { DEFAULT_PERSONALITY_TRAITS } from "./droitPersonalityService";
import { tryLocalKairoReply } from "./kairoLocalLanguageEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";
import {
  computeKairoSpeechIdentity,
  speechIdentityPrompt,
} from "./kairoSpeechIdentity";

const trace = (): ReasoningTrace =>
  ({
    messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
    decision: { chosenTone: "doğal" },
  }) as ReasoningTrace;

const state = (
  interactionCount: number,
  familiarityDays: number,
  warmth: number,
  trust: number,
): DroitDynamicState => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin",
  relationship: {
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    lastInteractionAt: "2026-08-28T00:00:00.000Z",
    interactionCount,
    familiarityDays,
    warmth,
    trust,
    positiveEvents: 0,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
  },
});

describe("Kaira written speech identity", () => {
  it("keeps the same core writing rhythm at every relationship level", () => {
    const newcomer = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      state(1, 0, 50, 50),
      trace(),
    );
    const closest = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      state(80, 90, 85, 85),
      trace(),
    );

    expect(newcomer.relationshipLevel).toBe("new");
    expect(closest.relationshipLevel).toBe("close");
    expect(newcomer.rhythm).toEqual(closest.rhythm);
  });

  it("gates slang by relationship instead of changing the rhythm", () => {
    const newcomer = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      state(1, 0, 50, 50),
      trace(),
    );
    const closest = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      state(80, 90, 85, 85),
      trace(),
    );

    expect(newcomer.slangLevel).toBeLessThan(closest.slangLevel);
    expect(speechIdentityPrompt(newcomer)).toContain(
      "aşırı samimi lakap ve sert küfür kullanma",
    );
    expect(speechIdentityPrompt(closest)).toContain(
      "sert küfrü otomatik üretme",
    );
    expect(speechIdentityPrompt(newcomer)).toContain("HOW ONLY");
  });

  it("does not call a new user kanka in local replies", () => {
    const result = tryLocalKairoReply(
      "selam",
      { ...DEFAULT_PERSONALITY_TRAITS, communication: 100, humor: 100 },
      state(1, 0, 50, 50),
      trace(),
      "new-user",
      "complete_social_routine",
      undefined,
      interpretSemanticEvent("selam"),
    );

    expect(result.handled).toBe(true);
    expect(result.reply).not.toMatch(/kanka|bebi[şs]|mal|aq|amk/i);
  });

  it("keeps emoji style deliberately low without granting emoji permission", () => {
    const identity = computeKairoSpeechIdentity(
      { ...DEFAULT_PERSONALITY_TRAITS, humor: 100 },
      state(80, 90, 85, 85),
      trace(),
    );
    const prompt = speechIdentityPrompt(identity);

    expect(identity.emojiLevel).toBeLessThanOrEqual(20);
    expect(prompt).toContain("seyrek kullan");
    expect(prompt).toContain("davranış planı izin verirse");
  });
});
