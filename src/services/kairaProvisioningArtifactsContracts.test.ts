import { describe, expect, it } from "vitest";
import { buildKairaIdentityTestFixture } from "./kairaIdentityContracts";
import { buildKairaProvisioningArtifacts } from "./kairaProvisioningArtifacts";

describe("Kaira provisioning artifact authority contracts", () => {
  it("splits seed records across identity and knowledge owners without duplication", () => {
    const seed = buildKairaIdentityTestFixture("kaira_individual_01");
    const artifacts = buildKairaProvisioningArtifacts(seed);

    expect(artifacts.canonicalIdentity.kairaInstanceId).toBe("kaira_individual_01");
    expect(artifacts.canonicalIdentity.selfFacts).toEqual(seed.selfFacts);
    expect(artifacts.canonicalIdentity.autobiographicalMemories).toEqual(seed.inheritedMemories);
    expect(artifacts.canonicalIdentity).not.toHaveProperty("knownConcepts");
    expect(artifacts.knowledgeProfile.concepts).toEqual(seed.knownConcepts);
    expect(artifacts.knowledgeProfile).not.toHaveProperty("selfFacts");
    expect(artifacts.knowledgeProfile).not.toHaveProperty("autobiographicalMemories");
  });

  it("provisions seed knowledge as a bounded catalogue", () => {
    const artifacts = buildKairaProvisioningArtifacts(
      buildKairaIdentityTestFixture("kaira_individual_02"),
    );
    expect(artifacts.knowledgeProfile.coverage).toBe("bounded_catalog");
  });

  it("rejects an invalid seed before creating either owner artifact", () => {
    const seed = buildKairaIdentityTestFixture("kaira_invalid");
    seed.selfFacts[0].confidence = 2;
    expect(() => buildKairaProvisioningArtifacts(seed)).toThrow("Invalid Kaira identity seed");
  });
});
