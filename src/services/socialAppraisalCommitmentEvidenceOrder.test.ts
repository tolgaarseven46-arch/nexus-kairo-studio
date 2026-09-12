import { describe, expect, it } from "vitest";
import type { SocialAppraisalMemoryContext } from "../types/socialAppraisal";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { resolveRuntimeSocialAppraisal } from "./socialAppraisalRuntimeProjection";

const relationship = {
  familiarityDays: 30,
  interactionCount: 80,
  warmth: 78,
  trust: 84,
  conflictScore: 0,
  hurtScore: 0,
  repairProgress: 0,
  positiveEvents: 60,
  negativeEvents: 3,
};

const currentState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};

const semantic = normalizeSemanticInterpretation({
  primaryIntent: "smalltalk",
  secondarySocialActs: [],
  target: "kaira",
  valence: "negative",
  severity: {
    disrespect: 0,
    coercion: 0,
    manipulation: 0,
    privacy: 0,
    aggression: 0,
  },
  jokingConfidence: 0,
  sincerityConfidence: 0.95,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.2,
  apology: false,
  repairAttempt: false,
  attribution: {
    actorId: "current_user",
    scopeKey: "commitment:project_report",
    intentionality: "intentional",
    commitmentViolation: "present",
    confidence: 0.95,
    provenance: ["semantic_provider:explicit_intentionality"],
  },
  uncertainty: {
    overall: 0.05,
    intent: 0.05,
    target: 0.05,
    severity: 0.05,
  },
  evidence: [
    {
      source: "llm",
      provider: "llm_semantic_runtime",
      cues: ["explicit intentional violation"],
      confidence: 0.95,
    },
  ],
});

const incomplete = {
  kind: "commitment" as const,
  state: "active" as const,
  actorId: "current_user",
  counterpartyId: "kaira",
  scopeKey: "commitment:project_report",
  confidence: 0,
  provenance: [] as string[],
};

const valid = {
  kind: "commitment" as const,
  state: "active" as const,
  actorId: "current_user",
  counterpartyId: "kaira",
  scopeKey: "commitment:project_report",
  confidence: 0.96,
  provenance: ["world_event:commitment-valid"],
};

function appraise(world: NonNullable<SocialAppraisalMemoryContext["world"]>) {
  return resolveRuntimeSocialAppraisal({
    semantic,
    relationshipScope: "kaira_user",
    relationship,
    memory: { world },
    currentState,
    personality: normalizeDroitPersonality({}),
  }).runtimeAppraisal;
}

describe("SocialAppraisal commitment evidence ordering", () => {
  it("does not let an incomplete duplicate mask later valid Kaira-directed evidence", () => {
    const incompleteFirst = appraise([incomplete, valid]);
    const validFirst = appraise([valid, incomplete]);

    expect(validFirst.betrayal?.status).toBe("present");
    expect(incompleteFirst.betrayal?.status).toBe("present");
    expect(incompleteFirst.betrayal?.confidence).toBe(validFirst.betrayal?.confidence);
  });

  it("keeps an incomplete-only Kaira-directed commitment uncertain", () => {
    expect(appraise([incomplete]).betrayal?.status).toBe("unknown");
  });
});
