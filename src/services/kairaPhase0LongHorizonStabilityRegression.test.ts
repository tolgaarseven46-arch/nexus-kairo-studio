import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import type { DroitDynamicState } from "../types/nexus";

const initialState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};

const cycle = [
  "naber",
  "bugün biraz yoruldum",
  "sen bazen çok bilmiş konuşuyon 😄",
  "şaka yapıyom alınma",
  "iyi ki varsın",
  "neyse başka konu",
  "bugün keyfim iyi",
  "tamam görüşürüz",
];

describe("Phase 0 100+ turn bounded-stability falsification", () => {
  it("keeps mood and relationship state bounded without runaway poisoning or false repair", async () => {
    const personality = normalizeDroitPersonality(null);
    let state: DroitDynamicState = { ...initialState };
    let maxHurt = 0;
    let maxConflict = 0;
    let maxRepairProgress = 0;

    for (let turn = 0; turn < 120; turn += 1) {
      const message = cycle[turn % cycle.length];
      const language = await understandTurkishMessage(message);
      const result = analyzeKdmInteractionCanonicalTurn(
        message,
        personality,
        state,
        language.interpretation,
        language.event,
        null,
        null,
      );
      state = result.nextDynamicState;

      for (const value of [state.calmness, state.anger, state.stress, state.happiness, state.confidence, state.surprise]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      maxHurt = Math.max(maxHurt, Number(state.relationship?.hurtScore ?? 0));
      maxConflict = Math.max(maxConflict, Number(state.relationship?.conflictScore ?? 0));
      maxRepairProgress = Math.max(maxRepairProgress, Number(state.relationship?.repairProgress ?? 0));
      expect(Number(state.relationship?.hurtScore ?? 0)).toBeLessThanOrEqual(100);
      expect(Number(state.relationship?.conflictScore ?? 0)).toBeLessThanOrEqual(100);
      expect(Number(state.relationship?.repairProgress ?? 0)).toBeLessThanOrEqual(100);
    }

    // Mild/ambiguous teasing repeated over a long horizon must not become a
    // permanent hard-conflict state simply through accumulation.
    expect(state.relationship?.conversationState).not.toBe("disengaged");
    expect(maxHurt).toBeLessThan(85);
    expect(maxConflict).toBeLessThan(85);

    // No explicit apology/repair exists in this corpus; passive time or positive
    // chatter must not manufacture full repair semantics.
    expect(maxRepairProgress).toBeLessThan(100);
  }, 30_000);
});
