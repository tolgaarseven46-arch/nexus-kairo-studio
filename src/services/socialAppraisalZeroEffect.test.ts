import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import {
  appraiseExactZeroIfNoMaterialEvidence,
  exactZeroSocialAppraisal,
  hasMaterialSocialAppraisalEvidence,
} from "./socialAppraisalZeroEffect";
import { socialAppraisalHasNoMaterialEffect } from "../types/socialAppraisal";

const semantic = (overrides: Record<string, unknown> = {}) =>
  normalizeSemanticInterpretation({
    raw: "naber",
    primaryIntent: "general_chat",
    secondarySocialActs: [],
    target: "kaira",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    emotionalLoad: 0.1,
    discourseFacets: {},
    uncertainty: { overall: 0.2 },
    evidence: [],
    ...overrides,
  });

describe("SocialAppraisal G1 exact zero effect", () => {
  it("returns exact independent zeros when canonical semantics carries no material social evidence", () => {
    const result = appraiseExactZeroIfNoMaterialEvidence(semantic());

    expect(result).not.toBeNull();
    expect(result?.relational).toEqual({
      valence: "neutral",
      significance: 0,
      harmEvidence: 0,
      repairEvidence: 0,
    });
    expect(result?.affective).toEqual({
      valence: "neutral",
      significance: 0,
      activation: 0,
    });
    expect(result?.noMaterialEffect).toBe(true);
    expect(socialAppraisalHasNoMaterialEffect(result!)).toBe(true);
  });

  it("does not confuse null/continue-appraisal with zero for a canonical insult", () => {
    const input = semantic({
      primaryIntent: "insult",
      valence: "negative",
      severity: {
        disrespect: 0.7,
        coercion: 0,
        manipulation: 0,
        privacy: 0,
        aggression: 0.35,
      },
    });

    expect(hasMaterialSocialAppraisalEvidence(input)).toBe(true);
    expect(appraiseExactZeroIfNoMaterialEvidence(input)).toBeNull();
  });

  it("keeps a canonical positive social event out of the zero path", () => {
    const input = semantic({
      primaryIntent: "compliment",
      valence: "positive",
      compliment: 0.8,
    });

    expect(hasMaterialSocialAppraisalEvidence(input)).toBe(true);
    expect(appraiseExactZeroIfNoMaterialEvidence(input)).toBeNull();
  });

  it("keeps salient emotional load out of the zero path even when relationship evidence is absent", () => {
    const input = semantic({ emotionalLoad: 0.7 });

    expect(hasMaterialSocialAppraisalEvidence(input)).toBe(true);
    expect(appraiseExactZeroIfNoMaterialEvidence(input)).toBeNull();
  });

  it("constructs a literal zero result rather than epsilon drift", () => {
    const result = exactZeroSocialAppraisal("counterfactual-no-effect");

    expect([
      result.expectedness,
      result.normDeviation,
      result.relational.significance,
      result.relational.harmEvidence,
      result.relational.repairEvidence,
      result.affective.significance,
      result.affective.activation,
    ]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(result.reasons).toEqual(["counterfactual-no-effect"]);
  });
});
