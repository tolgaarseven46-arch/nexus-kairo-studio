import { describe, expect, it } from "vitest";
import type { SocialAppraisalCommitmentContext } from "../types/socialAppraisal";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { assessCommitmentBetrayal } from "./socialAppraisalCommitmentBetrayal";

const commitment = (
  lifecycleOutcome: SocialAppraisalCommitmentContext["lifecycleOutcome"],
): SocialAppraisalCommitmentContext => ({
  kind: "commitment",
  state: lifecycleOutcome === "postponed" || lifecycleOutcome === "none" ? "active" : lifecycleOutcome === "fulfilled" ? "fulfilled" : lifecycleOutcome === "cancelled" ? "cancelled" : lifecycleOutcome === "failed" ? "failed" : "unknown",
  previousState: "active",
  lifecycleOutcome,
  actorId: "user:ali",
  counterpartyId: "kaira",
  scopeKey: "promise:meet-kaira",
  confidence: 0.9,
  provenance: ["world_event:promise-1"],
});

function semantic(overrides: Partial<{
  intentionality: "intentional" | "unintentional" | "unknown";
  controllability: "high" | "low" | "unknown";
  communicationConsent: "present" | "absent" | "unknown";
  externalCause: "present" | "absent" | "unknown";
}>) {
  return normalizeSemanticInterpretation({
    raw: "commitment lifecycle update",
    attribution: {
      actorId: "user:ali",
      scopeKey: "promise:meet-kaira",
      intentionality: overrides.intentionality ?? "intentional",
      commitmentViolation: "present",
      deception: "unknown",
      controllability: overrides.controllability ?? "high",
      communicationConsent: overrides.communicationConsent ?? "absent",
      externalCause: overrides.externalCause ?? "absent",
      confidence: 0.9,
      provenance: ["semantic:current-turn"],
    },
  });
}

describe("SocialAppraisal lifecycle betrayal regression neighbors", () => {
  it("does not call a failed commitment betrayal when controllability is low", () => {
    const result = assessCommitmentBetrayal(
      semantic({ controllability: "low" }),
      [commitment("failed")],
    );
    expect(result.status).toBe("absent");
  });

  it("fails closed when failed-outcome controllability is unknown", () => {
    const result = assessCommitmentBetrayal(
      semantic({ controllability: "unknown" }),
      [commitment("failed")],
    );
    expect(result.status).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("fails closed when cancellation consent is unknown", () => {
    const result = assessCommitmentBetrayal(
      semantic({ communicationConsent: "unknown" }),
      [commitment("cancelled")],
    );
    expect(result.status).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("preserves legacy active-commitment intentional betrayal semantics", () => {
    const legacyActive: SocialAppraisalCommitmentContext = {
      kind: "commitment",
      state: "active",
      actorId: "user:ali",
      counterpartyId: "kaira",
      scopeKey: "promise:meet-kaira",
      confidence: 0.9,
      provenance: ["world_event:promise-legacy"],
    };
    const result = assessCommitmentBetrayal(
      semantic({}),
      [legacyActive],
    );
    expect(result.status).toBe("present");
    expect(result.confidence).toBeGreaterThan(0);
  });
});
