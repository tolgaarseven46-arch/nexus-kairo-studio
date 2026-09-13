import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { WorldEventObservation } from "./worldModelEventStore";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { assessCommitmentBetrayal } from "./socialAppraisalCommitmentBetrayal";
import { buildSocialAppraisalCommitmentContext } from "./socialAppraisalWorldMemoryContext";

const SCOPE = "commitment:ambiguous-lifecycle";

function plan(): WorldEventObservation {
  return {
    id: "plan",
    createdAt: "2026-09-13T01:00:00.000Z",
    event: {
      raw: "plan",
      proposition: {
        key: SCOPE,
        actorKey: "current_user",
        targetKey: "kaira",
      },
      polarity: "positive",
      certainty: 0.95,
      modality: { kind: "commitment", strength: 0.95 },
      lifecycle: { kind: "unspecified", strength: 0 },
    },
  } as unknown as WorldEventObservation;
}

function outcome(
  id: string,
  kind: "executed" | "cancelled",
): WorldEventObservation {
  return {
    id,
    createdAt: "2026-09-13T01:01:00.000Z",
    event: {
      raw: id,
      proposition: {
        key: SCOPE,
        actorKey: "current_user",
        targetKey: "kaira",
      },
      polarity: "positive",
      certainty: 0.95,
      modality: { kind: "assertion", strength: 0.95 },
      lifecycle: { kind, strength: 0.95 },
    },
  } as unknown as WorldEventObservation;
}

function currentIntentionalViolation(): SemanticInterpretation {
  return normalizeSemanticInterpretation({
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
      scopeKey: SCOPE,
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
}

describe("SocialAppraisal ambiguous commitment lifecycle", () => {
  it("fails closed as unknown instead of treating an evidenced but unresolved commitment as absent", () => {
    const commitments = buildSocialAppraisalCommitmentContext([
      plan(),
      outcome("executed", "executed"),
      outcome("cancelled", "cancelled"),
    ]);

    expect(commitments).toHaveLength(1);
    expect(commitments[0]?.state).toBe("unknown");
    expect(commitments[0]?.actorId).toBe("current_user");
    expect(commitments[0]?.counterpartyId).toBe("kaira");
    expect(commitments[0]?.scopeKey).toBe(SCOPE);

    const betrayal = assessCommitmentBetrayal(currentIntentionalViolation(), commitments);

    expect(betrayal.status).toBe("unknown");
    expect(betrayal.confidence).toBe(0);
    expect(betrayal.reasons).toContain("betrayal:prior-commitment-lifecycle-unknown");
  });
});
