import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { DEFAULT_PERSONALITY_TRAITS } from "./droitPersonalityService";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/kairoSpeechIdentity.ts"),
  "utf8",
);

const state = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 60,
  confidence: 70,
  surprise: 10,
  relationship: {
    interactionCount: 20,
    familiarityDays: 10,
    warmth: 60,
    trust: 60,
    conflictScore: 0,
    hurtScore: 0,
  },
} as any;

const trace = {
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
  decision: { chosenTone: "doğal" },
} as any;

describe("speech identity authority boundary", () => {
  it("does not read runtime behavior permission flags", () => {
    expect(source).not.toContain('runtime(personality, "runtimeContinueConversation"');
    expect(source).not.toContain('runtime(personality, "runtimeAskQuestion"');
    expect(source).not.toContain('runtime(personality, "runtimeHumorAllowed"');
    expect(source).not.toContain('runtime(personality, "runtimeRepairAllowed"');
    expect(source).not.toContain('runtime(personality, "runtimeStance"');
    expect(source).not.toContain('runtime(personality, "runtimePriority"');
  });

  it("emits style instructions without WHAT/WHETHER directives", () => {
    const speech = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      state,
      trace,
    );
    const joined = speech.instructions.join("\n");

    expect(joined).not.toMatch(/BU TUR YENİ SORU SORMA|KONUŞMAYI SÜRDÜRME KARARI|Özür veya barışma sinyali|BU TUR MİZAH KULLANMA/u);
    expect(speech.rhythm.messageLength).toBe("short_first");
    expect(["casual", "balanced", "firm", "hurt"]).toContain(speech.register);
  });
});
