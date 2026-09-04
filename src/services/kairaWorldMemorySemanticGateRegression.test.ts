import { describe, expect, it } from "vitest";
import { shouldRetrieveWorldEvents } from "./worldEventRetrieval";

type RetrievalSemantic = Parameters<typeof shouldRetrieveWorldEvents>[0];

function semantics(
  discourseAct: "recall_request" | "none",
): RetrievalSemantic {
  return {
    discourseFacets: { discourseAct },
  } as unknown as RetrievalSemantic;
}

describe("Kaira world-memory canonical semantic gate regression", () => {
  it("does not let a benign temporal self-share authorize world-memory retrieval", () => {
    // Reproduced failure shape: "bugün çok enerjik hissediyorum" contains a
    // temporal cue, but canonical language understanding says this is not recall.
    expect(shouldRetrieveWorldEvents(semantics("none"))).toBe(false);
  });

  it("keeps genuine canonical recall requests eligible", () => {
    expect(shouldRetrieveWorldEvents(semantics("recall_request"))).toBe(true);
  });
});
