import { describe, expect, it } from "vitest";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { DEFAULT_PERSONALITY_TRAITS } from "./droitPersonalityService";

function state(reactionMode: "withdrawn" | "repairing") {
  return {
    calmness: 55,
    anger: 20,
    stress: 35,
    happiness: 40,
    confidence: 60,
    surprise: 5,
    reactionMode,
    relationship: {
      warmth: 45,
      trust: 45,
      conflictScore: 30,
      hurtScore: 40,
      familiarityDays: 20,
      interactionCount: 30,
    },
  } as any;
}

const trace = {
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
  currentMood: {},
  decision: { chosenTone: "doğal" },
} as any;

describe("speech identity HOW-only closure", () => {
  it("does not independently forbid reopening closeness", () => {
    const speech = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      state("withdrawn"),
      trace,
    );

    expect(speech.instructions.join("\n")).not.toMatch(
      /yeniden yakınlaşma başlatma/iu,
    );
  });

  it("does not independently decide whether relationship repair is complete", () => {
    const speech = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      state("repairing"),
      trace,
    );

    expect(speech.instructions.join("\n")).not.toMatch(
      /ilişkiyi tamamen düzelmiş ilan etme/iu,
    );
  });
});
