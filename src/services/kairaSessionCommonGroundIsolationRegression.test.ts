import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { reduceDiscourseState } from "./discourseStateReducer";
import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";

function userEvent(message: string, value: string | boolean): SemanticEvent {
  return {
    ...interpretSemanticEvent(message),
    raw: message,
    normalized: message,
    intent: "emotional_share",
    target: "event",
    worldMemory: {
      claims: [{ subjectId: "current_user", attributeKey: "session_event", value, confidence: 0.95 }],
      query: null,
    },
  };
}

function ongoingRecall(message: string): SemanticEvent {
  return {
    ...interpretSemanticEvent(message),
    raw: message,
    normalized: message,
    intent: "question",
    target: "event",
    worldMemory: {
      claims: [{ subjectId: "current_user", attributeKey: "session_event", value: "ongoing", confidence: 0.95 }],
      query: null,
    },
  };
}

describe("within-session common-ground isolation", () => {
  it("resumes a five-turn-old session event without persistent relationship/autobiography input", () => {
    const anchor = "sabah havuza gittim sırtım güneşte yandı";
    let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: anchor,
      event: userEvent(anchor, true),
    });
    const threadId = state.openThreads[0]?.id;
    expect(threadId).toBeTruthy();

    for (const message of ["neyse", "çay içiyorum", "müzik açtım", "rap", "iyi gidiyor"]) {
      state = reduceDiscourseState(state, {
        actor: "user",
        message,
        event: interpretSemanticEvent(message),
      });
    }

    const recall = "sırtım hâlâ yanıyor ya";
    state = reduceDiscourseState(state, {
      actor: "user",
      message: recall,
      event: ongoingRecall(recall),
    });

    expect(state.resumedThreadId).toBe(threadId);
    expect(state.activeThreadId).toBe(threadId);
    expect(state.openThreads.find((thread) => thread.id === threadId)?.anchorText).toContain(anchor);
    expect(state.openThreads.find((thread) => thread.id === threadId)?.anchorText).toContain(recall);
  });
});
