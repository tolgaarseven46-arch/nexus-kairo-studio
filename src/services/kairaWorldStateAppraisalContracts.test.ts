import { describe, expect, it } from "vitest";
import type { RetrievedWorldEvent } from "./worldEventRetrieval";
import { appraiseRetrievedWorldState, buildWorldStateAppraisalInstruction } from "./worldStateAppraisal";
import type { WorldEventObservation } from "./worldModelEventStore";
import type { WorldModelPropositionState } from "./worldModelProjection";

function observation(input: {
  kind?: "reported_claim" | "direct_interaction";
  status?: "grounded" | "ambiguous";
  polarity?: "positive" | "negative";
  id?: string;
  raw?: string;
} = {}): WorldEventObservation {
  const kind = input.kind || "reported_claim";
  const status = input.status || "grounded";
  const polarity = input.polarity || "positive";
  return {
    id: input.id || `${kind}-${status}-${polarity}`,
    userId: "u",
    kairaInstanceId: "kaira_a",
    sessionId: "s",
    speakerName: "Mert",
    kind,
    status,
    createdAt: "2026-08-30T08:00:00.000Z",
    event: {
      raw: input.raw || (polarity === "negative" ? "Ali istifa etmeyecek" : "Ali istifa edecek"),
      eventType: "general",
      actor: { name: "Ali", source: "explicit_name", confidence: 0.95 },
      target: { name: "Mert", source: "first_person", confidence: 1 },
      reportedSpeech: kind === "reported_claim",
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      polarity,
      temporal: { relation: "future", asksLatest: false },
      proposition: {
        key: "ali|general|mert|istifa",
        predicate: "general",
        actorKey: "ali",
        targetKey: "mert",
        contentKey: "istifa",
      },
      modality: { kind: "plan", strength: 0.8 },
      lifecycle: { kind: "unspecified", strength: 0 },
    },
  };
}

function state(input: Partial<WorldModelPropositionState> = {}): WorldModelPropositionState {
  return {
    kairaInstanceId: "kaira_a",
    propositionKey: "ali|general|mert|istifa",
    assertionState: "affirmed",
    evidenceStatus: "consistent",
    latestEvidenceId: "reported_claim-grounded-positive",
    latestEvidenceAt: "2026-08-30T08:00:00.000Z",
    latestEvidencePolarity: "positive",
    latestEvidenceCertainty: 0.9,
    evidenceObservationIds: ["reported_claim-grounded-positive"],
    lifecycle: {
      propositionKey: "ali|general|mert|istifa",
      state: "planned",
      evidenceObservationIds: ["reported_claim-grounded-positive"],
    },
    ...input,
  };
}

function retrieved(input: {
  kind?: "reported_claim" | "direct_interaction";
  status?: "grounded" | "ambiguous";
  polarity?: "positive" | "negative";
  id?: string;
  raw?: string;
  projectedState?: WorldModelPropositionState;
  reasons?: string[];
} = {}): RetrievedWorldEvent {
  return {
    observation: observation(input),
    score: 10,
    reasons: input.reasons || ["grounded"],
    projectedState: input.projectedState,
  };
}

describe("world-state appraisal contract", () => {
  it("keeps grounded reported evidence epistemically qualified", () => {
    const appraisal = appraiseRetrievedWorldState([
      retrieved({ projectedState: state() }),
    ]);

    expect(appraisal.evidencePosture).toBe("grounded_reported");
    expect(appraisal.truthPosture).toBe("current_state_supported");
    expect(appraisal.requiresEpistemicQualifier).toBe(true);
    expect(appraisal.mayClaimNoMemory).toBe(false);
    expect(appraisal.mayPromoteToVerifiedTruth).toBe(false);
    expect(appraisal.readOnly).toBe(true);
  });

  it("preserves canonical projection conflict instead of choosing a winner", () => {
    const conflicting = state({
      assertionState: "conflicting",
      evidenceStatus: "conflicting",
    });
    const appraisal = appraiseRetrievedWorldState([
      retrieved({ projectedState: conflicting, reasons: ["canonical_conflict_evidence"] }),
    ]);

    expect(appraisal.truthPosture).toBe("conflicting");
    expect(appraisal.requiresEpistemicQualifier).toBe(true);
    expect(appraisal.mayPromoteToVerifiedTruth).toBe(false);
  });

  it("detects historical contradiction even when retrieval carries no projected state", () => {
    const appraisal = appraiseRetrievedWorldState([
      retrieved({ id: "yes", polarity: "positive", raw: "Ali istifa edecek" }),
      retrieved({ id: "no", polarity: "negative", raw: "Ali istifa etmeyecek" }),
    ]);

    expect(appraisal.assertionStates).toEqual([]);
    expect(appraisal.truthPosture).toBe("conflicting");
    expect(appraisal.requiresEpistemicQualifier).toBe(true);
  });

  it("does not pretend ambiguous-only evidence is grounded memory", () => {
    const appraisal = appraiseRetrievedWorldState([
      retrieved({ status: "ambiguous" }),
    ]);

    expect(appraisal.evidencePosture).toBe("ambiguous_only");
    expect(appraisal.truthPosture).toBe("unknown");
    expect(appraisal.mayClaimNoMemory).toBe(true);
  });

  it("exposes lifecycle only from canonical projected state", () => {
    const appraisal = appraiseRetrievedWorldState([
      retrieved({ projectedState: state() }),
    ]);
    const instruction = buildWorldStateAppraisalInstruction(appraisal);

    expect(appraisal.lifecycleStates).toEqual(["planned"]);
    expect(instruction).toContain("lifecycle=planned");
    expect(instruction).toContain("READ-ONLY");
    expect(instruction).toContain("dynamic state DEĞİŞTİRMEZ");
  });

  it("emits no reasoning instruction when retrieval has no evidence", () => {
    const appraisal = appraiseRetrievedWorldState([]);
    expect(appraisal.evidencePosture).toBe("none");
    expect(buildWorldStateAppraisalInstruction(appraisal)).toBe("");
  });
});
