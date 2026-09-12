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

function semantic(input: {
  actorId?: string;
  scopeKey?: string;
  intentionality?: "intentional" | "unintentional" | "unknown";
  violation?: "present" | "absent" | "unknown";
}) {
  return normalizeSemanticInterpretation({
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "kaira",
    valence: input.violation === "present" ? "negative" : "neutral",
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
    emotionalLoad: input.violation === "present" ? 0.2 : 0,
    apology: false,
    repairAttempt: false,
    attribution: {
      actorId: input.actorId ?? "current_user",
      scopeKey: input.scopeKey ?? "commitment:project_report",
      intentionality: input.intentionality ?? "intentional",
      commitmentViolation: input.violation ?? "present",
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
}

function memory(overrides: Record<string, unknown> = {}): SocialAppraisalMemoryContext {
  return {
    world: [
      {
        kind: "commitment",
        state: "active",
        actorId: "current_user",
        counterpartyId: "kaira",
        scopeKey: "commitment:project_report",
        confidence: 0.96,
        provenance: ["world_event:commitment-1"],
        ...overrides,
      },
    ],
  };
}

function appraise(
  semanticInput: ReturnType<typeof semantic>,
  worldMemory?: SocialAppraisalMemoryContext,
) {
  return resolveRuntimeSocialAppraisal({
    semantic: semanticInput,
    relationshipScope: "kaira_user",
    relationship,
    memory: worldMemory,
    currentState,
    personality: normalizeDroitPersonality({}),
  }).runtimeAppraisal as ReturnType<typeof resolveRuntimeSocialAppraisal>["runtimeAppraisal"] & {
    betrayal?: { status: "present" | "absent" | "unknown"; confidence: number; reasons: readonly string[] };
    unfairness?: { status: "present" | "absent" | "unknown"; confidence: number; reasons: readonly string[] };
  };
}

describe("SocialAppraisal commitment betrayal characterization", () => {
  it("A: active same-party same-scope commitment plus intentional violation produces betrayal", () => {
    const result = appraise(semantic({}), memory());

    expect(result.betrayal?.status).toBe("present");
    expect(result.betrayal?.confidence).toBeGreaterThan(0);
  });

  it("B: no active prior commitment cannot produce betrayal", () => {
    const result = appraise(semantic({}), undefined);

    expect(result.betrayal?.status).toBe("absent");
  });

  it("C: party mismatch cannot produce betrayal", () => {
    const result = appraise(semantic({}), memory({ actorId: "person:other" }));

    expect(result.betrayal?.status).toBe("absent");
  });

  it("D: scope mismatch cannot produce betrayal", () => {
    const result = appraise(
      semantic({ scopeKey: "commitment:project_report" }),
      memory({ scopeKey: "commitment:meeting" }),
    );

    expect(result.betrayal?.status).toBe("absent");
  });

  it("E: missing intentionality evidence fails closed instead of inventing betrayal", () => {
    const result = appraise(semantic({ intentionality: "unknown" }), memory());

    expect(result.betrayal?.status).toBe("unknown");
  });

  it("keeps unfairness unknown when comparative/norm evidence is absent", () => {
    const result = appraise(semantic({}), memory());

    expect(result.unfairness?.status).toBe("unknown");
  });

  it("orders evidenced betrayal above the same violation without commitment evidence", () => {
    const evidenced = appraise(semantic({}), memory());
    const unsupported = appraise(semantic({}), undefined);

    expect(evidenced.betrayal?.confidence ?? 0).toBeGreaterThan(
      unsupported.betrayal?.confidence ?? 0,
    );
    expect(evidenced.relational.harmEvidence).toBeGreaterThan(
      unsupported.relational.harmEvidence,
    );
  });
});
