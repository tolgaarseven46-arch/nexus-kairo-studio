import { describe, expect, it } from "vitest";
import {
  applyBoundaries,
  boundariesFromFineTune,
  inferBoundarySituation,
} from "./boundaryEngine";
import type { DroitPersonalityTraits } from "../types/nexus";

const basePersonality = {
  authority: 50,
  patience: 50,
  seriousness: 50,
  empathy: 50,
} as DroitPersonalityTraits;

describe("boundary engine", () => {
  it("reads the CharacterTab boundaries.violation keys", () => {
    const profile = boundariesFromFineTune({
      "boundaries.violation.disrespect": 82,
      "boundaries.violation.manipulation": 67,
      "boundaries.violation.privacy": 73,
    });

    expect(profile.disrespect).toBe(82);
    expect(profile.manipulation).toBe(67);
    expect(profile.privacy).toBe(73);
  });

  it("treats configured red-line insults as absolute hard stops", () => {
    const situation = inferBoundarySituation("sus lan orospu");
    expect(situation.hardStop).toBe(true);

    const result = applyBoundaries(
      basePersonality,
      {
        "boundaries.violation.disrespect": 5,
        "boundaries.enforcement.assertiveness": 5,
        "boundaries.enforcement.escalation": 5,
        "boundaries.enforcement.forgiveness": 100,
      },
      "sus lan orospu",
    ).response;

    expect(result.hardStop).toBe(true);
    expect(result.violationPressure).toBe(1);
    expect(result.behaviorSignals.disengagementPressure).toBe(1);
    expect(result.behaviorSignals.repairOpenness).toBe(0);
  });

  it("recognizes the common test typo as the same hard stop", () => {
    expect(inferBoundarySituation("sus lan oropu").hardStop).toBe(true);
  });
});
