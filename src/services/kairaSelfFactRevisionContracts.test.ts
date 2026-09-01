import { describe, expect, it } from "vitest";
import {
  canonicalIdentityFromSeed,
  validateKairaCanonicalIdentity,
} from "./kairaCanonicalIdentity";
import { buildKairaIdentityTestFixture, type KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import { evaluateKairaSelfFactRevision } from "./kairaSelfFactRevision";

const evidenceMemory = (
  id: string,
  factKey: string,
  value: string,
  confidence = 0.9,
  overrides: Partial<KairaAutobiographicalMemory> = {},
): KairaAutobiographicalMemory => ({
  id,
  origin: "lived",
  occurredAt: `2026-09-01T10:${id.slice(-2).padStart(2, "0")}:00.000Z`,
  participantIds: ["user_1"],
  eventType: "general",
  facts: [`evidence:${factKey}`],
  emotions: [],
  salience: 0.8,
  sensitivity: "ordinary",
  canonical: true,
  sourceWorldObservationIds: [`obs_${id}`],
  consolidationKey: `world:obs_${id}`,
  selfRevisionEvidence: {
    factKey,
    domain: "preference",
    value,
    confidence,
  },
  ...overrides,
});

describe("Kaira self-fact revision contracts", () => {
  it("does not revise identity from a single lived episode", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(evidenceMemory("m01", "preferred_music", "ambient", 0.95));
    const decision = evaluateKairaSelfFactRevision(state, "preferred_music");
    expect(decision.status).toBe("insufficient_evidence");
    expect(decision.fact).toBeNull();
  });

  it("creates a lived_revision only after repeated consistent evidence", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(
      evidenceMemory("m01", "preferred_music", "ambient", 0.9),
      evidenceMemory("m02", "preferred_music", "ambient", 0.88),
      evidenceMemory("m03", "preferred_music", "ambient", 0.92),
    );
    const decision = evaluateKairaSelfFactRevision(state, "preferred_music");
    expect(decision.status).toBe("revised");
    expect(decision.fact).toMatchObject({
      key: "preferred_music",
      value: "ambient",
      source: "lived_revision",
      domain: "preference",
    });
    expect(decision.evidenceMemoryIds).toHaveLength(3);
  });

  it("fails closed when evidence is materially conflicted", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(
      evidenceMemory("m01", "preferred_music", "ambient"),
      evidenceMemory("m02", "preferred_music", "ambient"),
      evidenceMemory("m03", "preferred_music", "metal"),
      evidenceMemory("m04", "preferred_music", "metal"),
    );
    const decision = evaluateKairaSelfFactRevision(state, "preferred_music");
    expect(["insufficient_evidence", "conflicted_evidence"]).toContain(decision.status);
    expect(decision.fact).toBeNull();
  });

  it("fails closed when the same fact key changes semantic domain", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(
      evidenceMemory("m01", "preferred_music", "ambient"),
      evidenceMemory("m02", "preferred_music", "ambient"),
      evidenceMemory("m03", "preferred_music", "ambient", 0.9, {
        selfRevisionEvidence: {
          factKey: "preferred_music",
          domain: "belief",
          value: "ambient",
          confidence: 0.9,
        },
      }),
    );
    const decision = evaluateKairaSelfFactRevision(state, "preferred_music");
    expect(decision.status).toBe("domain_mismatch");
    expect(decision.fact).toBeNull();
  });

  it("counts one world observation only once even if duplicate memory records exist", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(
      evidenceMemory("m01", "preferred_music", "ambient", 0.95, {
        sourceWorldObservationIds: ["obs_shared"],
        consolidationKey: "world:shared:1",
      }),
      evidenceMemory("m02", "preferred_music", "ambient", 0.95, {
        sourceWorldObservationIds: ["obs_shared"],
        consolidationKey: "world:shared:2",
      }),
      evidenceMemory("m03", "preferred_music", "ambient", 0.95, {
        sourceWorldObservationIds: ["obs_unique"],
        consolidationKey: "world:unique",
      }),
    );
    const decision = evaluateKairaSelfFactRevision(state, "preferred_music");
    expect(decision.status).toBe("insufficient_evidence");
    expect(decision.supportCount).toBe(2);
    expect(decision.fact).toBeNull();
  });

  it("requires stronger evidence to overturn a high-confidence identity seed", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(
      evidenceMemory("m01", "favorite_flower", "lale", 0.9),
      evidenceMemory("m02", "favorite_flower", "lale", 0.9),
      evidenceMemory("m03", "favorite_flower", "lale", 0.9),
    );
    expect(evaluateKairaSelfFactRevision(state, "favorite_flower").status).toBe("insufficient_evidence");

    state.autobiographicalMemories.push(evidenceMemory("m04", "favorite_flower", "lale", 0.9));
    const decision = evaluateKairaSelfFactRevision(state, "favorite_flower");
    expect(decision.status).toBe("revised");
    expect(decision.fact?.value).toBe("lale");
    expect(decision.fact?.source).toBe("lived_revision");
  });

  it("does not reinterpret raw memory facts/event types as revision evidence", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push({
      ...evidenceMemory("m01", "preferred_music", "ambient"),
      selfRevisionEvidence: undefined,
      facts: ["ambient", "çok sevdi"],
      eventType: "music_experience",
    });
    expect(evaluateKairaSelfFactRevision(state, "preferred_music").status).toBe("no_evidence");
  });

  it("rejects duplicate canonical self-fact keys", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.selfFacts.push({
      id: "sf_duplicate_flower",
      domain: "preference",
      key: "FAVORITE_FLOWER",
      value: "lale",
      canonical: true,
      confidence: 0.9,
      source: "lived_revision",
    });
    expect(validateKairaCanonicalIdentity(state).map((issue) => issue.invariant))
      .toContain("canonical_identity.self_fact_key_unique");
  });

  it("keeps lived_revision out of trait and biography ownership", () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.selfFacts.push({
      id: "sf_illegal_trait_revision",
      domain: "trait",
      key: "core_patience",
      value: 80,
      canonical: true,
      confidence: 0.9,
      source: "lived_revision",
    });
    expect(validateKairaCanonicalIdentity(state).map((issue) => issue.invariant))
      .toContain("canonical_identity.lived_revision_domain");
  });
});
