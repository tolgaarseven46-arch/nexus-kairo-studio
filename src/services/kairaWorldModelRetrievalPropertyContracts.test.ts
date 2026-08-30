import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent } from "./worldEventEngine";
import {
  classifyWorldEventObservation,
  type WorldEventObservation,
} from "./worldModelEventStore";
import {
  rankWorldEventObservations,
  shouldRetrieveWorldEvents,
} from "./worldEventRetrieval";
import { validateRetrievalContract } from "./kairaArchitectureContracts";

const NAMES = [
  "Ayşe", "Merve", "Selin", "Burak", "Deniz", "Cem", "Ece", "Kerem",
  "Zeynep", "Emre", "Derya", "Can", "Elif", "Onur", "Seda", "Baran",
] as const;

const CLAIMS = [
  { text: "salak dedi", eventType: "insult" },
  { text: "aptal dedi", eventType: "insult" },
  { text: "iyi adamsın dedi", eventType: "general" },
  { text: "özür diledi", eventType: "apology" },
] as const;

function lcg(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function canonical(message: string) {
  const semantic = interpretSemanticEvent(message);
  const entities = resolveMessageEntities(message, {
    userName: "Mert",
    characterName: "KAIRO",
  });
  return {
    entities,
    event: buildCanonicalWorldEvent(message, semantic, entities),
  };
}

function observation(input: {
  raw: string;
  actor: string;
  createdAt: string;
  eventType?: string;
  status?: "grounded" | "ambiguous";
}): WorldEventObservation {
  return {
    userId: "mert",
    sessionId: "property-session",
    speakerName: "Mert",
    kind: "reported_claim",
    status: input.status ?? "grounded",
    createdAt: input.createdAt,
    event: {
      raw: input.raw,
      eventType: input.eventType ?? (input.raw.includes("salak") || input.raw.includes("aptal") ? "insult" : "general"),
      actor: { name: input.actor, source: "explicit_name", confidence: 0.95 },
      target: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
      reportedSpeech: true,
      certainty: 0.95,
      ambiguities: [],
      evidence: [`actor:${input.actor}`, "target:bana"],
    },
  };
}

const iso = (n: number) => new Date(Date.UTC(2026, 7, 30, 2, 0, n)).toISOString();

describe("Kaira world-model/retrieval property contracts", () => {
  it("never persists generated recall questions as world observations", () => {
    for (const name of NAMES) {
      for (const query of [
        `${name} bana ne demişti?`,
        `${name} bana ne dedi?`,
        `${name} hakkında ne biliyorsun?`,
      ]) {
        const { event } = canonical(query);
        expect(classifyWorldEventObservation(event).persist, query).toBe(false);
        expect(shouldRetrieveWorldEvents(query), query).toBe(true);
      }
    }
  });

  it("keeps generated reported facts persistable and participant-grounded", () => {
    for (const name of NAMES) {
      for (const claim of CLAIMS) {
        const message = `${name} bana ${claim.text}`;
        const { event } = canonical(message);
        const classification = classifyWorldEventObservation(event);

        expect(classification.persist, message).toBe(true);
        expect(classification.kind, message).toBe("reported_claim");
        expect(event.actor?.name, message).toBe(name);
        expect(event.target?.name, message).toBe("Mert");
        expect(event.certainty, message).toBeGreaterThanOrEqual(0.45);
      }
    }
  });

  it("preserves named recall evidence across 100 deterministic generated histories", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const random = lcg(seed);
      const focus = NAMES[Math.floor(random() * NAMES.length)]!;
      const observations: WorldEventObservation[] = [];

      for (let index = 0; index < 24; index += 1) {
        const actor = NAMES[Math.floor(random() * NAMES.length)]!;
        const claim = CLAIMS[Math.floor(random() * CLAIMS.length)]!;
        observations.push(observation({
          raw: `${actor} bana ${claim.text}`,
          actor,
          eventType: claim.eventType,
          createdAt: iso(index),
        }));
      }

      // Ensure the focus person always has at least one grounded fact.
      observations.push(observation({
        raw: `${focus} bana salak dedi`,
        actor: focus,
        eventType: "insult",
        createdAt: iso(40),
      }));

      // Add legacy polluted query rows; retrieval must never return them.
      observations.push(observation({
        raw: `${focus} bana ne demişti?`,
        actor: focus,
        createdAt: iso(41),
      }));

      const query = `${focus} bana ne demişti?`;
      const entities = resolveMessageEntities(query, { userName: "Mert", characterName: "KAIRO" });
      const retrieved = rankWorldEventObservations(query, observations, 5);
      const report = validateRetrievalContract(query, entities, retrieved);

      expect(report.issues, `seed=${seed} focus=${focus}: ${JSON.stringify(report.issues)}`).toEqual([]);
      expect(retrieved.length, `seed=${seed}`).toBeGreaterThan(0);
      expect(
        retrieved.some((item) => item.observation.event.actor?.name === focus),
        `seed=${seed} focus=${focus}`,
      ).toBe(true);
      expect(
        retrieved.some((item) => item.observation.event.raw.endsWith("?")),
        `seed=${seed} query pollution`,
      ).toBe(false);
    }
  });

  it("prevents duplicate crowding from removing either person in generated comparisons", () => {
    for (let seed = 1; seed <= 80; seed += 1) {
      const random = lcg(seed * 17);
      const firstIndex = Math.floor(random() * NAMES.length);
      let secondIndex = Math.floor(random() * NAMES.length);
      if (secondIndex === firstIndex) secondIndex = (secondIndex + 1) % NAMES.length;
      const first = NAMES[firstIndex]!;
      const second = NAMES[secondIndex]!;

      const rows: WorldEventObservation[] = [];
      for (let i = 0; i < 12; i += 1) {
        rows.push(observation({
          raw: `${first} bana salak dedi`,
          actor: first,
          eventType: "insult",
          createdAt: iso(i),
        }));
      }
      rows.push(observation({
        raw: `${second} bana iyi adamsın dedi`,
        actor: second,
        eventType: "general",
        createdAt: iso(30),
      }));

      const query = `${first} mi ${second} mi bana salak demişti?`;
      const entities = resolveMessageEntities(query, { userName: "Mert", characterName: "KAIRO" });
      const retrieved = rankWorldEventObservations(query, rows, 5);
      const report = validateRetrievalContract(query, entities, retrieved);
      const actors = new Set(retrieved.map((item) => item.observation.event.actor?.name));

      expect(report.issues, `seed=${seed} ${first}/${second}: ${JSON.stringify(report.issues)}`).toEqual([]);
      expect(actors.has(first), `seed=${seed} missing ${first}`).toBe(true);
      expect(actors.has(second), `seed=${seed} missing ${second}`).toBe(true);
    }
  });

  it("does not collapse contradictory claims into one synthetic truth", () => {
    for (const name of NAMES.slice(0, 8)) {
      const rows = [
        observation({ raw: `${name} bana salak dedi`, actor: name, eventType: "insult", createdAt: iso(1) }),
        observation({ raw: `${name} bana iyi adamsın dedi`, actor: name, eventType: "general", createdAt: iso(2) }),
      ];
      const query = `${name} bana ne demişti?`;
      const retrieved = rankWorldEventObservations(query, rows, 5);
      const raws = new Set(retrieved.map((item) => item.observation.event.raw));

      expect(raws.has(`${name} bana salak dedi`), name).toBe(true);
      expect(raws.has(`${name} bana iyi adamsın dedi`), name).toBe(true);
    }
  });
});
