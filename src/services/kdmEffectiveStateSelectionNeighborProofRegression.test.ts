import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import { selectEffectiveKdmDynamicState } from "./kdmEffectiveStateSelector";

function state(lastInteractionAt: string, interactionCount: number, marker: string): DroitDynamicState {
  return {
    calmness: marker === "persisted" ? 61 : 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    lastStatus: marker,
    relationship: {
      firstSeenAt: "2026-08-01T00:00:00.000Z",
      lastInteractionAt,
      interactionCount,
      warmth: marker === "persisted" ? 77 : 55,
      trust: marker === "persisted" ? 79 : 55,
      conflictScore: 0,
      hurtScore: 0,
      repairProgress: 0,
      positiveEvents: 0,
      negativeEvents: 0,
      repeatedNegativeCount: 0,
      conversationState: "active",
    },
  };
}

function select(requestState: DroitDynamicState, persistedState: DroitDynamicState) {
  return selectEffectiveKdmDynamicState({
    requestState,
    persistedState,
    requestHasRelationship: true,
  });
}

describe("KDM persisted/request effective-state arbitration neighbor proof", () => {
  it("reported: newer persisted relationship defeats a stale request relationship", () => {
    const request = state("2026-09-10T10:00:00.000Z", 20, "request");
    const persisted = state("2026-09-10T10:05:00.000Z", 25, "persisted");

    expect(select(request, persisted)).toBe(persisted);
  });

  it("neighbor-1: higher persisted interaction count wins when timestamps tie", () => {
    const request = state("2026-09-10T10:05:00.000Z", 20, "request");
    const persisted = state("2026-09-10T10:05:00.000Z", 21, "persisted");

    expect(select(request, persisted)).toBe(persisted);
  });

  it("neighbor-2: valid durable chronology defeats an invalid stale request timestamp", () => {
    const request = state("not-a-date", 20, "request");
    const persisted = state("2026-09-10T10:05:00.000Z", 21, "persisted");

    expect(select(request, persisted)).toBe(persisted);
  });

  it("counterexample: genuinely newer request relationship remains authoritative", () => {
    const request = state("2026-09-10T10:06:00.000Z", 26, "request");
    const persisted = state("2026-09-10T10:05:00.000Z", 25, "persisted");

    expect(select(request, persisted)).toBe(request);
  });
});
