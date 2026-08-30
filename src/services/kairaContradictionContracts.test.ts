import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent } from "./worldEventEngine";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  resolveContradictionEvidence,
  validateContradictionEvidenceContract,
} from "./worldEventContradictionResolver";

function canonical(message: string) {
  const semantic = interpretSemanticEvent(message);
  const entities = resolveMessageEntities(message, {
    userName: "Mert",
    characterName: "KAIRO",
  });
  return buildCanonicalWorldEvent(message, semantic, entities);
}

function observation(message: string, createdAt: string): WorldEventObservation {
  return {
    userId: "mert",
    sessionId: "contradiction-contract",
    speakerName: "Mert",
    kind: "reported_claim",
    status: "grounded",
    createdAt,
    event: canonical(message),
  };
}

describe("Kaira canonical v3 contradiction contracts", () => {
  it("emits bounded proposition content, polarity and temporal semantics", () => {
    const event = canonical("Ayşe dün bana salak dedi");
    expect(event.proposition?.predicate).toBe("insult");
    expect(event.proposition?.actorKey).toBe("ayşe");
    expect(event.proposition?.targetKey).toBe("current_user");
    expect(event.proposition?.contentKey).toBe("salak");
    expect(event.polarity).toBe("positive");
    expect(event.temporal?.relation).toBe("past");
    expect(event.temporal?.marker).toBe("dün");
  });

  it("gives positive and negative forms of the same content one proposition identity", () => {
    const positive = canonical("Ayşe bana salak dedi");
    const negative = canonical("Ayşe bana salak demedi");
    expect(positive.proposition?.key).toBe(negative.proposition?.key);
    expect(positive.polarity).toBe("positive");
    expect(negative.polarity).toBe("negative");
  });

  it("keeps different semantic content in separate proposition sets", () => {
    const salak = observation("Ayşe bana salak dedi", "2026-08-29T20:00:00.000Z");
    const aptal = observation("Ayşe bana aptal demedi", "2026-08-29T21:00:00.000Z");
    expect(salak.event.proposition?.key).not.toBe(aptal.event.proposition?.key);
    const sets = resolveContradictionEvidence([salak, aptal]);
    expect(sets).toHaveLength(2);
    expect(sets.every((set) => set.status === "consistent")).toBe(true);
  });

  it("marks opposite polarities as conflicting without deleting either source", () => {
    const older = observation("Ayşe bana salak dedi", "2026-08-29T20:00:00.000Z");
    const newer = observation("Ayşe bana salak demedi", "2026-08-29T21:00:00.000Z");
    const sets = resolveContradictionEvidence([older, newer]);
    expect(sets).toHaveLength(1);
    expect(sets[0]?.status).toBe("conflicting");
    expect(sets[0]?.observations).toHaveLength(2);
    expect(sets[0]?.latest?.event.raw).toBe("Ayşe bana salak demedi");
    expect(validateContradictionEvidenceContract([older, newer])).toEqual([]);
  });

  it("does not call different predicates a contradiction", () => {
    const insult = observation("Ayşe bana salak dedi", "2026-08-29T20:00:00.000Z");
    const apology = observation("Ayşe bana özür diledi", "2026-08-29T21:00:00.000Z");
    const sets = resolveContradictionEvidence([insult, apology]);
    expect(sets).toHaveLength(2);
    expect(sets.every((set) => set.status === "consistent")).toBe(true);
  });

  it("keeps latest-query semantics explicit in canonical temporal data", () => {
    const event = canonical("Ayşe en son bana ne demişti?");
    expect(event.temporal?.asksLatest).toBe(true);
  });
});
