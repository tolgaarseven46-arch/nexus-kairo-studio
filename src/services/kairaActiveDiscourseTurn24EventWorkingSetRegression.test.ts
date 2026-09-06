import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { reduceDiscourseState } from "./discourseStateReducer";
import {
  interpretSemanticEvent,
  type SemanticEvent,
} from "./semanticEventEngine";

function eventShare(
  message: string,
  attributeKey: string,
  value: string | boolean,
): SemanticEvent {
  return {
    ...interpretSemanticEvent("moralim bozuk"),
    raw: message,
    normalized: message,
    intent: "emotional_share",
    socialRoutine: "emotional_opening",
    target: "event",
    valence: "negative",
    worldMemory: {
      claims: [
        {
          subjectId: "current_user",
          attributeKey,
          value,
          confidence: 0.95,
        },
      ],
      query: null,
    },
  };
}

describe("Kaira Active Discourse Turn 24 event working set", () => {
  it("keeps a grounded first-party event disclosure in the bounded session working set", () => {
    const turn3 =
      "sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor";
    const state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: turn3,
      event: eventShare(turn3, "back_sunburned", true),
    });

    expect(state.openThreads).toHaveLength(1);
    expect(state.openThreads[0]).toMatchObject({
      kind: "user_event_topic",
      anchorText: turn3,
    });
  });

  it("does not promote a context-free mood opening into an event thread", () => {
    const message = "moralim bozuk";
    const state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message,
      event: interpretSemanticEvent(message),
    });

    expect(state.openThreads).toEqual([]);
  });
});
