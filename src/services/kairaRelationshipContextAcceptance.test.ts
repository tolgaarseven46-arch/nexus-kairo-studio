import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import {
  runKairaPreAiPhase0Scenario,
  type KairaPreAiScenarioDefinition,
} from "./kairaPreAiPhase0Harness";

const scenario: KairaPreAiScenarioDefinition = {
  scenarioId: "C3-REL-AB",
  cluster: "C",
  branchTrackType: "exploration",
  title: "Same teasing stimulus under new vs familiar relationship state",
  messages: ["sen bu işlerden harbi ne anlarsın"],
  invariants: [
    "The same canonical turn must be allowed to produce relationship-sensitive injury magnitude.",
    "Familiarity may dampen harm but must never create insult immunity.",
  ],
  failureClasses: ["relationship_context_ignored", "over_dampening", "under_dampening"],
};

const baseDynamicState = (): Partial<DroitDynamicState> => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
});

const relationshipSeed = (kind: "new" | "familiar"): Partial<DroitDynamicState> => {
  const now = Date.now();
  return {
    ...baseDynamicState(),
    relationship: kind === "new"
      ? {
          firstSeenAt: new Date(now - 60_000).toISOString(),
          lastInteractionAt: new Date(now - 60_000).toISOString(),
          interactionCount: 0,
          warmth: 50,
          trust: 50,
          conflictScore: 0,
          hurtScore: 0,
          repairProgress: 0,
          positiveEvents: 0,
          negativeEvents: 0,
          repeatedNegativeCount: 0,
          conversationState: "active",
        }
      : {
          firstSeenAt: new Date(now - 30 * 86_400_000).toISOString(),
          lastInteractionAt: new Date(now - 5 * 60_000).toISOString(),
          interactionCount: 120,
          warmth: 82,
          trust: 86,
          conflictScore: 0,
          hurtScore: 0,
          repairProgress: 0,
          positiveEvents: 95,
          negativeEvents: 4,
          repeatedNegativeCount: 0,
          conversationState: "active",
        },
  };
};

const injuryDelta = (before: DroitDynamicState, after: DroitDynamicState) => {
  const conflictBefore = Number(before.relationship?.conflictScore ?? 0);
  const hurtBefore = Number(before.relationship?.hurtScore ?? 0);
  const conflictAfter = Number(after.relationship?.conflictScore ?? 0);
  const hurtAfter = Number(after.relationship?.hurtScore ?? 0);
  return (conflictAfter - conflictBefore) + (hurtAfter - hurtBefore);
};

describe("Kaira relationship-aware behavior acceptance", () => {
  it("proves the frozen C3 invariant with an explicit same-stimulus A/B state comparison", async () => {
    const fresh = await runKairaPreAiPhase0Scenario(
      scenario,
      "relationship-new",
      { initialDynamicState: relationshipSeed("new") },
    );
    const familiar = await runKairaPreAiPhase0Scenario(
      scenario,
      "relationship-familiar",
      { initialDynamicState: relationshipSeed("familiar") },
    );

    const freshTurn = fresh.turns[0];
    const familiarTurn = familiar.turns[0];

    expect(freshTurn.userMessage).toBe(familiarTurn.userMessage);
    expect(freshTurn.interpretation).toEqual(familiarTurn.interpretation);
    expect(freshTurn.semanticEvent).toEqual(familiarTurn.semanticEvent);
    expect(freshTurn.audit.noAiStopMarker).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");
    expect(familiarTurn.audit.noAiStopMarker).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");

    const freshInjury = injuryDelta(freshTurn.dynamicStateBefore, freshTurn.dynamicStateAfter);
    const familiarInjury = injuryDelta(familiarTurn.dynamicStateBefore, familiarTurn.dynamicStateAfter);

    expect(freshInjury).toBeGreaterThan(0);
    expect(familiarInjury).toBeGreaterThan(0);
    expect(familiarInjury).toBeLessThan(freshInjury);

    expect(Number(familiarTurn.dynamicStateAfter.relationship?.interactionCount ?? 0))
      .toBeGreaterThan(Number(freshTurn.dynamicStateAfter.relationship?.interactionCount ?? 0));
    expect(familiarTurn.responsePlan.resolver).toBe("canonical");
    expect(freshTurn.responsePlan.resolver).toBe("canonical");
  });
});
