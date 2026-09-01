import { describe, expect, it } from "vitest";
import { canonicalIdentityFromSeed } from "./kairaCanonicalIdentity";
import { buildKairaIdentityTestFixture } from "./kairaIdentityContracts";
import {
  buildKairaAutobiographicalRecallInstruction,
  selectKairaAutobiographicalRecall,
} from "./kairaAutobiographicalRecall";

describe("Kaira selective autobiographical recall contracts", () => {
  it("retrieves a matching self-fact by canonical key without importing knowledge concepts", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin en sevdiğin çiçek neydi",
        scope: "self_fact",
        factKey: "favorite_flower",
        confidence: 0.95,
      },
      state,
    );
    expect(recall.selfFacts[0]?.fact.key).toBe("favorite_flower");
    expect(recall.selfFacts).toHaveLength(1);
    expect(recall.memories).toHaveLength(0);
    expect(JSON.stringify(recall)).not.toContain("concept_krizantem");
  });

  it("fails closed instead of guessing between unrelated self-facts", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin en sevdiğin şey ne",
        scope: "self_fact",
        confidence: 0.9,
      },
      state,
    );
    expect(recall.selfFacts).toHaveLength(0);
  });

  it("retrieves only relevant ordinary autobiography", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    state.autobiographicalMemories.push({
      id: "mem_private",
      origin: "lived",
      participantIds: [],
      eventType: "storm_secret",
      facts: ["yağmurda gizli bir olay yaşandı"],
      emotions: [],
      salience: 0.95,
      sensitivity: "private",
      canonical: true,
    });

    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin yağmura yakalandığın anıyı hatırlıyor musun",
        scope: "autobiographical_memory",
        confidence: 0.96,
      },
      state,
    );
    expect(recall.memories.map((item) => item.memory.id)).toContain("mem_fixture_storm");
    expect(recall.memories.map((item) => item.memory.id)).not.toContain("mem_private");
    expect(recall.withheldSensitiveCount).toBe(1);
  });

  it("does not spill autobiography into a self-fact-only query", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin favori rengin ne",
        scope: "self_fact",
        factKey: "preferred_clothing_color",
        confidence: 0.9,
      },
      state,
    );
    expect(recall.selfFacts[0]?.fact.key).toBe("preferred_clothing_color");
    expect(recall.memories).toHaveLength(0);
  });

  it("builds a grounded instruction and forbids invented autobiography", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin geçmişindeki yağmur anısı",
        scope: "autobiographical_memory",
        confidence: 0.9,
      },
      state,
    );
    const instruction = buildKairaAutobiographicalRecallInstruction(recall);
    expect(instruction).toContain("KAIRA SELECTIVE SELF-MEMORY RECALL");
    expect(instruction).toContain("mem_fixture_storm");
    expect(instruction).toContain("ayrıntıyı uydurma");
    expect(instruction).toContain("private/sensitive");
  });

  it("returns an explicit no-match grounding instead of model-prior autobiography", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin mars kolonisi anın",
        scope: "autobiographical_memory",
        confidence: 0.9,
      },
      state,
    );
    expect(recall.memories).toHaveLength(0);
    expect(buildKairaAutobiographicalRecallInstruction(recall)).toContain("MATCHED_RECORDS=none");
  });
});
