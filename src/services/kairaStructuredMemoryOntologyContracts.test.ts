import { describe, expect, it } from "vitest";
import {
  KAIRA_MEMORY_ONTOLOGY,
  kairaMemoryDomainDefinition,
} from "./kairaMemoryOntology";

describe("Kaira structured-memory ontology", () => {
  it("assigns exactly one declared authority to every canonical memory/state domain", () => {
    expect(KAIRA_MEMORY_ONTOLOGY.map((item) => item.domain)).toEqual([
      "self_fact",
      "autobiographical_memory",
      "world_event",
      "claim",
      "language_style",
      "relationship_state",
      "discourse_state",
    ]);
    expect(new Set(KAIRA_MEMORY_ONTOLOGY.map((item) => item.domain)).size).toBe(
      KAIRA_MEMORY_ONTOLOGY.length,
    );
    for (const item of KAIRA_MEMORY_ONTOLOGY) {
      expect(item.authority.length).toBeGreaterThan(0);
      expect(item.recallAuthority.length).toBeGreaterThan(0);
    }
  });

  it("keeps self truth instance-owned and distinct from world/claim evidence", () => {
    expect(kairaMemoryDomainDefinition("self_fact")).toMatchObject({
      authority: "kairaCanonicalIdentityStore",
      kind: "self_truth",
      mutability: "evidence_revision",
      promotion: "none",
    });
    expect(kairaMemoryDomainDefinition("autobiographical_memory")).toMatchObject({
      authority: "kairaCanonicalIdentityStore",
      kind: "self_truth",
      mutability: "append_only",
      promotion: "lived_autobiographical_append",
    });
    expect(kairaMemoryDomainDefinition("claim").kind).toBe("evidence");
    expect(kairaMemoryDomainDefinition("world_event").kind).toBe("world_truth");
  });

  it("requires explicit grounded promotion for claims and forbids implicit cross-store promotion elsewhere", () => {
    expect(kairaMemoryDomainDefinition("claim").promotion).toBe(
      "explicit_grounded_world_event",
    );
    for (const domain of [
      "self_fact",
      "world_event",
      "language_style",
      "relationship_state",
      "discourse_state",
    ] as const) {
      expect(kairaMemoryDomainDefinition(domain).promotion).toBe("none");
    }
  });

  it("keeps HOW learning, relationship state and discourse state out of truth-memory authority", () => {
    expect(kairaMemoryDomainDefinition("language_style")).toMatchObject({
      kind: "style",
      persistence: "policy_gated",
      mutability: "bounded_learning",
    });
    expect(kairaMemoryDomainDefinition("relationship_state")).toMatchObject({
      kind: "relational_state",
      mutability: "reducer_state",
    });
    expect(kairaMemoryDomainDefinition("discourse_state")).toMatchObject({
      kind: "discourse_state",
      persistence: "ephemeral",
      mutability: "recomputed",
    });
  });
});
