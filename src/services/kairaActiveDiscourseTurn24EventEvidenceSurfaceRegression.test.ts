import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import {
  buildDiscourseObservationalInstruction,
  reduceDiscourseState,
} from "./discourseStateReducer";
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

function neutralTurn(message: string): SemanticEvent {
  return {
    ...interpretSemanticEvent("tamam"),
    raw: message,
    normalized: message,
    intent: "general_chat",
    socialRoutine: "none",
    valence: "neutral",
    worldMemory: { claims: [], query: null },
  };
}

describe("Kaira Active Discourse Turn 24 event evidence surface", () => {
  it("keeps the earlier first-party event visible after intervening turns when a later event disclosure arrives", () => {
    const turn3 =
      "sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor";
    let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: turn3,
      event: eventShare(turn3, "back_sunburned", true),
    });

    for (const message of [
      "tamam",
      "aynen",
      "bugün yoğundu",
      "sonra bakarız",
      "neyse",
    ]) {
      state = reduceDiscourseState(state, {
        actor: "user",
        message,
        event: neutralTurn(message),
      });
    }

    const turn24 = "off sırtım çok pis hala";
    state = reduceDiscourseState(state, {
      actor: "user",
      message: turn24,
      event: eventShare(turn24, "back_discomfort", "ongoing"),
    });

    const instruction = buildDiscourseObservationalInstruction(state);
    expect(instruction).toContain(turn3);
    expect(instruction).toContain(turn24);
    expect(instruction).toContain("önceki açık kullanıcı-olay kanıtı");
  });

  it("does not invent an event-evidence block when the working set has none", () => {
    const state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "moralim bozuk",
      event: interpretSemanticEvent("moralim bozuk"),
    });

    expect(buildDiscourseObservationalInstruction(state)).not.toContain(
      "önceki açık kullanıcı-olay kanıtı",
    );
  });
});
