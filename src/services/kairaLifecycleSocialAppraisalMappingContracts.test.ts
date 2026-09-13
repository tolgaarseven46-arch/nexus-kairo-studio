import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { SocialAppraisalCommitmentContext } from "../types/socialAppraisal";
import type { WorldEventObservation } from "./worldModelEventStore";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { assessCommitmentBetrayal } from "./socialAppraisalCommitmentBetrayal";
import { buildSocialAppraisalCommitmentContext } from "./socialAppraisalWorldMemoryContext";

const SCOPE = "commitment:lifecycle-mapping";

function observation(
  id: string,
  createdAt: string,
  modality: "commitment" | "assertion",
  lifecycle: "unspecified" | "postponed" | "failed" | "cancelled",
): WorldEventObservation {
  return {
    id,
    createdAt,
    event: {
      raw: id,
      proposition: { key: SCOPE, actorKey: "current_user", targetKey: "kaira" },
      polarity: "positive",
      certainty: 0.96,
      modality: { kind: modality, strength: 0.96 },
      lifecycle: { kind: lifecycle, strength: lifecycle === "unspecified" ? 0 : 0.95 },
    },
  } as unknown as WorldEventObservation;
}

function semanticAttribution(overrides: Record<string, unknown> = {}): SemanticInterpretation {
  return normalizeSemanticInterpretation({
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "kaira",
    valence: "negative",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
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
      deception: "absent",
      controllability: "high",
      communicationConsent: "unknown",
      externalCause: "absent",
      confidence: 0.95,
      provenance: ["semantic_provider:typed_commitment_evidence"],
      ...overrides,
    },
    uncertainty: { overall: 0.05, intent: 0.05, target: 0.05, severity: 0.05 },
    evidence: [{
      source: "llm",
      provider: "llm_semantic_runtime",
      cues: ["typed commitment evidence"],
      confidence: 0.95,
    }],
  });
}

function commitment(
  state: "active" | "fulfilled" | "cancelled" | "failed" | "unknown",
  lifecycleOutcome: "none" | "postponed" | "fulfilled" | "cancelled" | "failed" | "unknown",
): SocialAppraisalCommitmentContext {
  return {
    kind: "commitment",
    state,
    actorId: "current_user",
    counterpartyId: "kaira",
    scopeKey: SCOPE,
    confidence: 0.96,
    provenance: ["world_event:plan", `world_event:${lifecycleOutcome}`],
    previousState: "active",
    lifecycleOutcome,
  } as SocialAppraisalCommitmentContext;
}

describe("Lifecycle -> SocialAppraisal typed evidence mapping", () => {
  it("preserves postponed as an active commitment while exposing postponed lifecycle evidence", () => {
    const contexts = buildSocialAppraisalCommitmentContext([
      observation("plan", "2026-09-13T01:00:00.000Z", "commitment", "unspecified"),
      observation("postponed", "2026-09-13T01:05:00.000Z", "assertion", "postponed"),
    ]);

    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.state).toBe("active");
    expect((contexts[0] as any)?.previousState).toBe("active");
    expect((contexts[0] as any)?.lifecycleOutcome).toBe("postponed");
  });

  it("preserves typed controllability/consent/external-cause evidence in canonical attribution", () => {
    const semantic = semanticAttribution({
      controllability: "high",
      communicationConsent: "absent",
      externalCause: "absent",
    });
    const attribution = semantic.attribution as any;

    expect(attribution.controllability).toBe("high");
    expect(attribution.communicationConsent).toBe("absent");
    expect(attribution.externalCause).toBe("absent");
  });

  it("postponed never becomes betrayal even when communication consent is absent", () => {
    const result = assessCommitmentBetrayal(
      semanticAttribution({ communicationConsent: "absent" }),
      [commitment("active", "postponed")],
    );
    expect(result.status).toBe("absent");
  });

  it("failed with external cause remains non-betrayal", () => {
    const result = assessCommitmentBetrayal(
      semanticAttribution({ intentionality: "intentional", controllability: "high", externalCause: "present" }),
      [commitment("failed", "failed")],
    );
    expect(result.status).toBe("absent");
  });

  it("failed with deliberate controllable breach and no external cause is betrayal", () => {
    const result = assessCommitmentBetrayal(
      semanticAttribution({ intentionality: "intentional", controllability: "high", externalCause: "absent" }),
      [commitment("failed", "failed")],
    );
    expect(result.status).toBe("present");
  });

  it("communicated/consented cancellation is not betrayal", () => {
    const result = assessCommitmentBetrayal(
      semanticAttribution({ communicationConsent: "present" }),
      [commitment("cancelled", "cancelled")],
    );
    expect(result.status).toBe("absent");
  });

  it("unilateral intentional cancellation is betrayal-eligible", () => {
    const result = assessCommitmentBetrayal(
      semanticAttribution({ intentionality: "intentional", communicationConsent: "absent" }),
      [commitment("cancelled", "cancelled")],
    );
    expect(result.status).toBe("present");
  });

  it("unknown lifecycle preserves uncertainty and can never produce betrayal", () => {
    const result = assessCommitmentBetrayal(
      semanticAttribution({ intentionality: "intentional", communicationConsent: "absent" }),
      [commitment("unknown", "unknown")],
    );
    expect(result.status).toBe("unknown");
    expect(result.confidence).toBe(0);
  });
});
