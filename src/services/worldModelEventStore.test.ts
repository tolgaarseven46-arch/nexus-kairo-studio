import { describe, expect, it } from "vitest";
import { classifyWorldEventObservation } from "./worldModelEventStore";
import type { CanonicalWorldEvent } from "./worldEventEngine";

const makeEvent = (overrides: Partial<CanonicalWorldEvent> = {}): CanonicalWorldEvent => ({
  raw: "Sen salaksın",
  eventType: "insult",
  actor: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
  target: { id: "kaira", name: "Kaira", source: "semantic_target", confidence: 0.98 },
  reportedSpeech: false,
  certainty: 0.95,
  ambiguities: [],
  evidence: ["actor:current_speaker", "target:kaira"],
  ...overrides,
});

describe("classifyWorldEventObservation", () => {
  it("stores direct interaction as grounded when evidence is strong", () => {
    expect(classifyWorldEventObservation(makeEvent())).toEqual({
      persist: true,
      kind: "direct_interaction",
      status: "grounded",
    });
  });

  it("classifies grounded reported speech as a claim without persisting world truth", () => {
    expect(
      classifyWorldEventObservation(
        makeEvent({ reportedSpeech: true, certainty: 0.9 }),
      ),
    ).toEqual({
      persist: false,
      kind: "reported_claim",
      status: "grounded",
    });
  });

  it("keeps ambiguous reported claims marked ambiguous without persisting world truth", () => {
    expect(
      classifyWorldEventObservation(
        makeEvent({
          reportedSpeech: true,
          certainty: 0.58,
          actor: undefined,
          ambiguities: ["actor unresolved"],
        }),
      ),
    ).toEqual({
      persist: false,
      kind: "reported_claim",
      status: "ambiguous",
    });
  });

  it("drops low-confidence generic chatter", () => {
    expect(
      classifyWorldEventObservation(
        makeEvent({
          eventType: "general",
          actor: undefined,
          target: undefined,
          certainty: 0.3,
        }),
      ),
    ).toEqual({
      persist: false,
      kind: "direct_interaction",
      status: "ambiguous",
    });
  });
});
