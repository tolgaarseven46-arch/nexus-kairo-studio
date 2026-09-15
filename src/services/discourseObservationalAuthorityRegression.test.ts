import { describe, expect, it } from "vitest";
import { buildDiscourseObservationalInstruction } from "./discourseStateReducer";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";

describe("discourse observational authority regression", () => {
  it("keeps ambiguous thread evidence observational instead of authorizing clarification", () => {
    const instruction = buildDiscourseObservationalInstruction({
      ...EMPTY_DISCOURSE_STATE,
      ambiguousThreadResumption: true,
      openThreads: [
        {
          id: "third-party-thread-1",
          kind: "third_party_topic",
          anchorText: "Mert bugün sinirliydi",
          openedAtTurn: 1,
          lastRelevantTurn: 1,
        },
        {
          id: "third-party-thread-2",
          kind: "third_party_topic",
          anchorText: "Ali bana kaba davrandı",
          openedAtTurn: 2,
          lastRelevantTurn: 2,
        },
      ],
    });

    expect(instruction).toContain("gözlemsel olarak belirsiz");
    expect(instruction).toContain("davranış kararı içermez");
    expect(instruction).not.toMatch(/(?:soru sor\b|sorabilirsin|clarify|netleştir)/iu);
  });
});
