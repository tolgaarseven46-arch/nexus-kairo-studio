import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent } from "./worldEventEngine";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  resolveContradictionEvidence,
  validateContradictionEvidenceContract,
} from "./worldEventContradictionResolver";

const NAMES = [
  "Ayşe", "Merve", "Selin", "Burak", "Deniz", "Cem", "Ece", "Kerem",
  "Zeynep", "Emre", "Derya", "Can", "Elif", "Onur", "Seda", "Baran",
] as const;

function canonical(message: string) {
  const semantic = interpretSemanticEvent(message);
  const entities = resolveMessageEntities(message, {
    userName: "Mert",
    characterName: "KAIRO",
  });
  return buildCanonicalWorldEvent(message, semantic, entities);
}

function observation(raw: string, createdAt: string): WorldEventObservation {
  return {
    userId: "mert",
    sessionId: "contradiction-property",
    speakerName: "Mert",
    kind: "reported_claim",
    status: "grounded",
    createdAt,
    event: canonical(raw),
  };
}

const iso = (seconds: number) =>
  new Date(Date.UTC(2026, 7, 30, 3, 0, seconds)).toISOString();

describe("Kaira contradiction property contracts", () => {
  it("maps generated positive/negative reports to one proposition with opposite polarity", () => {
    for (const name of NAMES) {
      const positive = canonical(`${name} bana salak dedi`);
      const negative = canonical(`${name} bana salak demedi`);

      expect(positive.proposition?.key, name).toBe(negative.proposition?.key);
      expect(positive.polarity, name).toBe("positive");
      expect(negative.polarity, name).toBe("negative");
      expect(positive.proposition?.predicate, name).toBe("insult");
      expect(negative.proposition?.predicate, name).toBe("insult");
    }
  });

  it("marks both temporal directions conflicting and keeps newest evidence authoritative", () => {
    for (let seed = 1; seed <= 120; seed += 1) {
      const name = NAMES[seed % NAMES.length]!;
      const positiveFirst = seed % 2 === 0;
      const olderRaw = positiveFirst
        ? `${name} bana salak dedi`
        : `${name} bana salak demedi`;
      const newerRaw = positiveFirst
        ? `${name} bana salak demedi`
        : `${name} bana salak dedi`;

      const rows = [
        observation(olderRaw, iso(seed)),
        observation(newerRaw, iso(seed + 200)),
      ];
      const sets = resolveContradictionEvidence(rows);

      expect(validateContradictionEvidenceContract(rows), `seed=${seed}`).toEqual([]);
      expect(sets, `seed=${seed}`).toHaveLength(1);
      expect(sets[0]?.status, `seed=${seed}`).toBe("conflicting");
      expect(sets[0]?.observations, `seed=${seed}`).toHaveLength(2);
      expect(sets[0]?.latest?.event.raw, `seed=${seed}`).toBe(newerRaw);
      expect(new Set(sets[0]?.polarities), `seed=${seed}`).toEqual(
        new Set(["positive", "negative"]),
      );
    }
  });

  it("never merges different people or different predicates into one contradiction", () => {
    for (let seed = 0; seed < 80; seed += 1) {
      const first = NAMES[seed % NAMES.length]!;
      const second = NAMES[(seed + 1) % NAMES.length]!;
      const rows = [
        observation(`${first} bana salak dedi`, iso(seed)),
        observation(`${second} bana salak demedi`, iso(seed + 100)),
        observation(`${first} bana özür diledi`, iso(seed + 200)),
      ];
      const sets = resolveContradictionEvidence(rows);

      expect(sets, `seed=${seed}`).toHaveLength(3);
      expect(sets.every((set) => set.status !== "conflicting"), `seed=${seed}`).toBe(true);
    }
  });

  it("preserves unknown legacy polarity without inventing a contradiction", () => {
    const row = observation("Ayşe bana salak dedi", iso(1));
    const legacy: WorldEventObservation = {
      ...row,
      createdAt: iso(2),
      event: {
        ...row.event,
        polarity: undefined,
      },
    };
    const sets = resolveContradictionEvidence([row, legacy]);

    expect(sets).toHaveLength(1);
    expect(sets[0]?.status).toBe("consistent");
    expect(sets[0]?.observations).toHaveLength(2);
  });
});
