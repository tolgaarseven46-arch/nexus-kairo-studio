import { describe, expect, it } from "vitest";
import type { KairaCanonicalIdentityState } from "./kairaCanonicalIdentity";
import {
  buildKairaAutobiographicalRecallInstruction,
  selectKairaAutobiographicalRecall,
} from "./kairaAutobiographicalRecall";
import type { SemanticSelfMemoryQuery } from "./kairaSelfMemoryQuery";

describe("Kaira self capability ontology regression", () => {
  it("represents a current capability as a typed self_fact and resolves it by canonical factKey", () => {
    const state: KairaCanonicalIdentityState = {
      kairaInstanceId: "kaira_capability_fixture",
      schemaVersion: 1,
      selfFacts: [
        {
          id: "sf_sleep_ability_fixture",
          domain: "capability",
          key: "sleep_ability",
          value: "fixture_capability_value",
          canonical: true,
          confidence: 1,
          source: "identity_seed",
        },
      ],
      autobiographicalMemories: [],
    };
    const query: SemanticSelfMemoryQuery = {
      surface: "sen uyuyamıyon mu şimdi",
      scope: "self_fact",
      factKey: "sleep_ability",
      confidence: 0.98,
    };

    const recall = selectKairaAutobiographicalRecall(query, state);

    expect(recall.selfFacts).toHaveLength(1);
    expect(recall.selfFacts[0]?.fact.domain).toBe("capability");
    expect(recall.selfFacts[0]?.fact.key).toBe("sleep_ability");
    expect(recall.selfFacts[0]?.reasons).toContain("canonical_fact_key_match");
    expect(buildKairaAutobiographicalRecallInstruction(recall)).toContain(
      "key=sleep_ability; value=fixture_capability_value",
    );
  });
});
