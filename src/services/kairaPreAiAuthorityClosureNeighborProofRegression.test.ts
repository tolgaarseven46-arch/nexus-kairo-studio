import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { buildKairoGroundingInstruction } from "./kairoConversationGrounding";
import { buildDialogueBoardInstruction } from "./kairoDialogueChaosEngine";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { DEFAULT_PERSONALITY_TRAITS } from "./droitPersonalityService";

function semanticSnapshot(raw: string, uncertaintyOverall: number): SemanticInterpretation {
  return {
    schemaVersion: "semantic-interpretation@2",
    raw,
    normalized: raw.toLocaleLowerCase("tr-TR"),
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "unknown",
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: 1,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
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
      relationalIntensity: 0,
      stopQuestions: false,
      stopTalking: false,
    },
    uncertainty: {
      overall: uncertaintyOverall,
      intent: uncertaintyOverall,
      target: 0,
      severity: 0,
    },
    evidence: [{ source: "reconciled", cues: ["neighbor_proof"], confidence: 1 }],
  };
}

const speechTrace = {
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
  currentMood: {},
  decision: { chosenTone: "doğal" },
} as any;

function speechState(reactionMode: "withdrawn" | "repairing") {
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

describe("pre-AI final authority closure neighbor regression", () => {
  it("keeps persisted certainty authoritative even when historical wording looks uncertain", () => {
    const text = "Mert yarın istifa etmeyi düşünüyorum dedi.";
    const instruction = buildKairoGroundingInstruction(
      [{ sender: "user", text, semanticInterpretation: semanticSnapshot(text, 0) }],
      "Mert ne yapacaktı?",
    );
    expect(instruction).not.toContain(`- ${text}`);
  });

  it("preserves persisted historical uncertainty when canonical semantics carries it", () => {
    const text = "Mert yarın istifa etmeyi düşünüyorum dedi.";
    const instruction = buildKairoGroundingInstruction(
      [{ sender: "user", text, semanticInterpretation: semanticSnapshot(text, 0.8) }],
      "Mert ne yapacaktı?",
    );
    expect(instruction).toContain(`- ${text}`);
  });

  it("fails closed for historical uncertainty when no canonical snapshot exists", () => {
    const text = "Mert yarın istifa etmeyi düşünüyorum dedi.";
    const instruction = buildKairoGroundingInstruction(
      [{ sender: "user", text }],
      "Mert ne yapacaktı?",
    );
    expect(instruction).not.toContain(`- ${text}`);
  });

  it("keeps Dialogue Board observational and without question permission", () => {
    const instruction = buildDialogueBoardInstruction([], "Mert ne yapacak?", "Tolga");
    expect(instruction).toContain("GÖZLEMSEL — KARAR DEĞİL");
    expect(instruction).toContain("Bu blok soru, tavsiye, şaka, spekülasyon, sosyal hareket, uzunluk veya stil izni vermez");
    expect(instruction).not.toMatch(/netleştirme sor|soru sor/iu);
  });

  it("keeps withdrawn SpeechIdentity on HOW without reopening authority", () => {
    const speech = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      speechState("withdrawn"),
      speechTrace,
    );
    const instructions = speech.instructions.join("\n");
    expect(instructions).toContain("minimum sosyal yatırım");
    expect(instructions).not.toMatch(/yeniden yakınlaşma başlatma/iu);
  });

  it("keeps repairing SpeechIdentity on HOW without declaring relationship completion", () => {
    const speech = computeKairoSpeechIdentity(
      DEFAULT_PERSONALITY_TRAITS,
      speechState("repairing"),
      speechTrace,
    );
    const instructions = speech.instructions.join("\n");
    expect(instructions).toContain("kontrollü, ölçülü bir yumuşama");
    expect(instructions).not.toMatch(/ilişkiyi tamamen düzelmiş ilan etme/iu);
  });
});
