import { describe, expect, it } from "vitest";
import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import {
  preferenceEvidenceFromExperienceAppraisal,
  projectExperiencePreferenceEvidenceToLivedMemory,
  type KairaExperiencePreferenceAppraisal,
} from "./kairaExperiencePreferenceAppraisal";

const appraisal = (
  overrides: Partial<KairaExperiencePreferenceAppraisal> = {},
): KairaExperiencePreferenceAppraisal => ({
  experienceId: "exp_1",
  sourceWorldObservationId: "obs_1",
  ownership: "kaira_direct",
  completion: "completed",
  preferenceKey: "preferred_music",
  experiencedValue: "ambient",
  outcomeValence: 0.82,
  appraisalConfidence: 0.9,
  attributionConfidence: 0.88,
  ...overrides,
});

const livedMemory = (source = "obs_1"): KairaAutobiographicalMemory => ({
  id: "lived_1",
  origin: "lived",
  occurredAt: "2026-09-01T10:00:00.000Z",
  participantIds: [],
  eventType: "experience",
  facts: ["typed experience record"],
  emotions: [],
  salience: 0.8,
  sensitivity: "ordinary",
  canonical: true,
  sourceWorldObservationIds: [source],
  consolidationKey: `world:${source}`,
});

describe("Kaira experience preference appraisal contracts", () => {
  it("produces preference evidence only from a direct completed positive Kaira-owned outcome", () => {
    const decision = preferenceEvidenceFromExperienceAppraisal(appraisal());
    expect(decision.status).toBe("evidence");
    if (decision.status !== "evidence") throw new Error("expected evidence");
    expect(decision.evidence).toMatchObject({ factKey: "preferred_music", domain: "preference", value: "ambient" });
    expect(decision.evidence.confidence).toBeGreaterThan(0.78);
  });

  it("emits the same canonical evidence shape consumed by canonical identity", () => {
    const decision = preferenceEvidenceFromExperienceAppraisal(appraisal({
      preferenceKey: " Preferred Music ",
      experiencedValue: "  ambient  ",
    }));
    expect(decision.status).toBe("evidence");
    if (decision.status !== "evidence") throw new Error("expected evidence");
    expect(decision.evidence.factKey).toBe("preferred_music");
    expect(decision.evidence.value).toBe("ambient");
  });

  it.each([
    ["reported", { ownership: "reported" as const }, "not_direct"],
    ["inferred", { ownership: "inferred" as const }, "not_direct"],
    ["ongoing", { completion: "ongoing" as const }, "not_completed"],
    ["interrupted", { completion: "interrupted" as const }, "not_completed"],
    ["negative", { outcomeValence: -0.8 }, "weak_or_negative_outcome"],
    ["weak", { outcomeValence: 0.3 }, "weak_or_negative_outcome"],
    ["uncertain appraisal", { appraisalConfidence: 0.6 }, "low_appraisal_confidence"],
    ["uncertain attribution", { attributionConfidence: 0.6 }, "low_attribution_confidence"],
  ])("rejects %s experience as canonical preference evidence", (_name, overrides, reason) => {
    expect(preferenceEvidenceFromExperienceAppraisal(appraisal(overrides))).toEqual({ status: "rejected", evidence: null, reason });
  });

  it("binds produced evidence to the exact lived world-observation provenance", () => {
    const projection = projectExperiencePreferenceEvidenceToLivedMemory(livedMemory("obs_1"), appraisal());
    expect(projection.status).toBe("projected");
    if (projection.status !== "projected") throw new Error("expected projection");
    expect(projection.memory.selfRevisionEvidence).toMatchObject({ factKey: "preferred_music", domain: "preference", value: "ambient" });
  });

  it("cannot attach a valid appraisal to another lived episode", () => {
    const projection = projectExperiencePreferenceEvidenceToLivedMemory(livedMemory("obs_other"), appraisal());
    expect(projection).toMatchObject({ status: "rejected", reason: "provenance_mismatch" });
    expect(projection.memory.selfRevisionEvidence).toBeUndefined();
  });

  it("treats one lived episode revision vote as write-once", () => {
    const memory = {
      ...livedMemory(),
      selfRevisionEvidence: { factKey: "preferred_music", domain: "preference" as const, value: "jazz", confidence: 0.9 },
    };
    const projection = projectExperiencePreferenceEvidenceToLivedMemory(memory, appraisal());
    expect(projection).toMatchObject({ status: "rejected", reason: "existing_revision_evidence" });
    expect(projection.memory.selfRevisionEvidence?.value).toBe("jazz");
  });

  it("cannot project experience evidence onto inherited autobiography", () => {
    const memory = { ...livedMemory(), origin: "inherited" as const, sourceWorldObservationIds: undefined, consolidationKey: undefined };
    const projection = projectExperiencePreferenceEvidenceToLivedMemory(memory, appraisal());
    expect(projection).toMatchObject({ status: "rejected", reason: "not_lived_memory" });
  });

  it("does not expose any belief-producing path from affective experience appraisal", () => {
    const decision = preferenceEvidenceFromExperienceAppraisal(appraisal());
    expect(decision.status).toBe("evidence");
    if (decision.status !== "evidence") throw new Error("expected evidence");
    expect(decision.evidence.domain).toBe("preference");
  });
});
