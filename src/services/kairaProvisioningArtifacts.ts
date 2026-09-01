import {
  validateKairaIdentitySeed,
  type KairaIdentitySeed,
} from "./kairaIdentityContracts";
import {
  canonicalIdentityFromSeed,
  type KairaCanonicalIdentityState,
} from "./kairaCanonicalIdentity";
import type { KairaKnowledgeProfile } from "./kairaKnowledgeProfile";

export interface KairaProvisioningArtifacts {
  canonicalIdentity: KairaCanonicalIdentityState;
  knowledgeProfile: KairaKnowledgeProfile;
}

/**
 * Provisioning is the only seam that splits the initial seed across owners.
 * Identity owns self-facts + autobiography. Knowledge owns known concepts.
 * Neither store duplicates the other's canonical records.
 */
export function buildKairaProvisioningArtifacts(
  seed: KairaIdentitySeed,
): KairaProvisioningArtifacts {
  const issues = validateKairaIdentitySeed(seed);
  if (issues.length) {
    throw new Error(
      `Invalid Kaira identity seed: ${issues.map((issue) => issue.invariant).join(", ")}`,
    );
  }

  return {
    canonicalIdentity: canonicalIdentityFromSeed(seed),
    knowledgeProfile: {
      kairaInstanceId: seed.kairaInstanceId,
      schemaVersion: 1,
      coverage: "bounded_catalog",
      concepts: seed.knownConcepts.map((concept) => ({ ...concept })),
    },
  };
}
