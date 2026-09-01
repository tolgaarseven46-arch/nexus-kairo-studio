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
        retrievalMode: "targeted",
        confidence: 0.96,
      },
      state,
    );
    expect(recall.memories.map((item) => item.memory.id)).toContain("mem_fixture_storm");
    expect(recall.memories.map((item) => item.memory.id)).not.toContain("mem_private");
    expect(recall.withheldSensitiveCount).toBe(1);
  });

  it("returns high-salience ordinary memories for broad autobiography", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    state.autobiographicalMemories.push(
      {
        id: "mem_high",
        origin: "lived",
        participantIds: ["ali"],
        eventType: "support",
        facts: ["zor bir anda destek gördü"],
        emotions: [{ label: "rahatlama", intensity: 0.8 }],
        salience: 0.96,
        sensitivity: "ordinary",
        canonical: true,
      },
      {
        id: "mem_low",
        origin: "lived",
        participantIds: ["mert"],
        eventType: "general",
        facts: ["sıradan bir konuşma oldu"],
        emotions: [],
        salience: 0.3,
        sensitivity: "ordinary",
        canonical: true,
      },
      {
        id: "mem_sensitive_high",
        origin: "lived",
        participantIds: [],
        eventType: "private_event",
        facts: ["özel olay"],
        emotions: [{ label: "kaygı", intensity: 1 }],
        salience: 1,
        sensitivity: "sensitive",
        canonical: true,
      },
    );

    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin geçmişinde neler yaşadın",
        scope: "autobiographical_memory",
        retrievalMode: "broad",
        confidence: 0.95,
      },
      state,
      2,
    );

    expect(recall.memories[0]?.memory.id).toBe("mem_high");
    expect(recall.memories.map((item) => item.memory.id)).not.toContain("mem_sensitive_high");
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
        retrievalMode: "targeted",
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

  it("returns an explicit no-match grounding for a targeted miss", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    const recall = selectKairaAutobiographicalRecall(
      {
        surface: "senin mars kolonisi anın",
        scope: "autobiographical_memory",
        retrievalMode: "targeted",
        confidence: 0.9,
      },
      state,
    );
    expect(recall.memories).toHaveLength(0);
    expect(buildKairaAutobiographicalRecallInstruction(recall)).toContain("MATCHED_RECORDS=none");
  });
});
