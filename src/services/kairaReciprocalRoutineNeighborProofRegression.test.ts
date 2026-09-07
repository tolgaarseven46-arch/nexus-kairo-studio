import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";

function projectedRoutine(raw: string, activity: string) {
  const base = interpretationFromRegexFloor(raw);
  return projectSemanticEvent({
    ...base,
    target: "unknown",
    discourseFacets: { ...base.discourseFacets, socialRoutine: "what_doing" },
    worldMemory: {
      claims: [
        {
          subjectId: "current_user",
          attributeKey: "current_activity",
          value: activity,
          confidence: 0.95,
        },
      ],
      query: null,
    },
  } as any).socialRoutine;
}

describe("reciprocal-routine bug-class neighbor proof", () => {
  it("reported: suppresses unknown-target reciprocal routine for captured tea state-share", () => {
    expect(projectedRoutine("iyi beya çay içiyom", "drinking_tea")).toBe("none");
  });

  it("neighbor-1: suppresses the same stale routine for a coffee state-share", () => {
    expect(projectedRoutine("iyi ya kahve içiyorum", "drinking_coffee")).toBe("none");
  });

  it("neighbor-2: suppresses the same stale routine for an at-home activity state-share", () => {
    expect(projectedRoutine("evde oturuyorum ya", "resting_at_home")).toBe("none");
  });

  it("counterexample: preserves a genuinely unresolved unknown-target reciprocal greeting", () => {
    const base = interpretationFromRegexFloor("naber şimdi");
    const projected = projectSemanticEvent({
      ...base,
      target: "unknown",
      discourseFacets: { ...base.discourseFacets, socialRoutine: "how_are_you" },
    });
    expect(projected.socialRoutine).toBe("how_are_you");
  });
});
