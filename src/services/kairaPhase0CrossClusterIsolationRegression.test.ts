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
  it("keeps canonical self-memory semantics identical while affective state changes downstream appraisal", async () => {
    const message = "senin en sevdiğin çiçek ne?";
    const language = await understandTurkishMessage(message);
    const selfMemoryQuery = {
      surface: message,
      scope: "self_fact" as const,
      retrievalMode: "targeted" as const,
      confidence: 0.88,
    };
    const interpretation = {
      ...language.interpretation,
      discourseFacets: {
        ...language.interpretation.discourseFacets,
        selfMemoryQuery,
      },
    };
    const event = {
      ...language.event,
      selfMemoryQuery,
    };

    const personality = normalizeDroitPersonality(null);
    const fromNeutral = analyzeKdmInteractionCanonicalTurn(
      message, personality, neutral, interpretation, event, null, null,
    );
    const fromHurt = analyzeKdmInteractionCanonicalTurn(
      message, personality, hurt, interpretation, event, null, null,
    );

    // This is an authority-isolation proof, not a language-ingress coverage test:
    // the same typed canonical semantics are held constant while only downstream
    // affect/relationship context changes.
    expect(interpretation.discourseFacets.selfMemoryQuery).toEqual(event.selfMemoryQuery);
    expect(fromNeutral.trace.messageInterpretation.intent).toBe(fromHurt.trace.messageInterpretation.intent);
    expect(fromNeutral.trace.messageInterpretation.sentiment).toBe(fromHurt.trace.messageInterpretation.sentiment);
  });
});
