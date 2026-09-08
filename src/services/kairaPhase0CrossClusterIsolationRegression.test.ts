import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import type { DroitDynamicState } from "../types/nexus";

const neutral: DroitDynamicState = {
  calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10,
  lastStatus: "Sakin ve kontrollü", reactionMode: "neutral",
};
const hurt: DroitDynamicState = {
  ...neutral,
  calmness: 35, anger: 25, stress: 65, happiness: 25, reactionMode: "hurt",
  relationship: { warmthScore: 45, trustScore: 45, conflictScore: 35, hurtScore: 70, repairProgress: 0 },
};

describe("Phase 0 cross-cluster authority isolation", () => {
  it("keeps self-memory semantics identical while affective state changes downstream appraisal", async () => {
    const message = "senin en sevdiğin çiçek ne?";
    const language = await understandTurkishMessage(message);
    expect(language.interpretation.discourseFacets.selfMemoryQuery).not.toBeNull();

    const personality = normalizeDroitPersonality(null);
    const fromNeutral = analyzeKdmInteractionCanonicalTurn(
      message, personality, neutral, language.interpretation, language.event, null, null,
    );
    const fromHurt = analyzeKdmInteractionCanonicalTurn(
      message, personality, hurt, language.interpretation, language.event, null, null,
    );

    // Mood/relationship are downstream context. They may change appraisal and
    // expression, but must never mutate or replace the canonical self-memory query.
    expect(language.interpretation.discourseFacets.selfMemoryQuery).toEqual(
      language.event.selfMemoryQuery,
    );
    expect(fromNeutral.trace.messageInterpretation.intent).toBe(fromHurt.trace.messageInterpretation.intent);
    expect(fromNeutral.trace.messageInterpretation.sentiment).toBe(fromHurt.trace.messageInterpretation.sentiment);
  });
});
