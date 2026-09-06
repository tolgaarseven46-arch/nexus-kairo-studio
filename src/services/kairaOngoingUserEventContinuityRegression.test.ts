import { describe, expect, it } from "vitest";
import { reduceDiscourseState } from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import type { DiscourseState } from "../types/discourseState";
import type { SemanticEvent } from "./semanticEventEngine";

const baseState: DiscourseState = {
  turnIndex: 10,
  routines: {
    greeting: { count: 0, lastTurnIndex: -99 },
    howAreYou: { count: 0, lastTurnIndex: -99 },
    whatDoing: { count: 0, lastTurnIndex: -99 },
  },
  pendingQuestion: null,
  kairaRecentActs: [{ act: "statement", turnIndex: 10 }],
  selfRepeat: null,
  previousTurnDependency: null,
  openThreads: [
    {
      id: "user-event-thread-3",
      kind: "user_event_topic",
      anchorText:
        "sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor | çünkü güneşin altında uyuyakaldım | amk güneş yaktı çünkü",
      openedAtTurn: 3,
      lastRelevantTurn: 6,
    },
  ],
  activeThreadId: null,
  resumedThreadId: null,
  ambiguousThreadResumption: false,
  lastUserAct: "statement",
  lastKairaAct: "statement",
};

function emotionalEvent(value: string): SemanticEvent {
  return {
    raw: "off sırtım çok pis hala",
    normalized: "of sırtım çok pis hâlâ",
    intent: "emotional_share",
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    worldMemory: {
      claims: [
        {
          subjectId: "current_user",
          attributeKey: value === "ongoing" ? "back_discomfort" : "workload",
          value,
          confidence: 0.9,
        },
      ],
      query: null,
    },
    valence: "negative",
    target: "unknown",
    relationalAct: "none",
    relationalIntensity: 0.1,
    severity: 0.1,
    insult: false,
    redLine: false,
    disrespect: 0,
    coercion: 0,
    manipulation: 0,
    privacyViolation: 0,
    apology: false,
    repairAttempt: false,
    stopQuestions: false,
    stopTalking: false,
    frustration: 0,
    emotionalLoad: 0.4,
    affection: 0,
    support: 0,
    compliment: 0,
  };
}

describe("ongoing first-party event continuity", () => {
  it("resumes the one open user-event thread from typed ongoing evidence and avoids re-asking for missing context", () => {
    const event = emotionalEvent("ongoing");
    const discourse = reduceDiscourseState(baseState, {
      actor: "user",
      message: event.raw,
      event,
    });

    expect(discourse.resumedThreadId).toBe("user-event-thread-3");
    expect(discourse.activeThreadId).toBe("user-event-thread-3");

    const plan = planDialogueResponse([], event.raw, "Mert", event, undefined, discourse);
    expect(plan.move).toBe("natural_reaction");
    expect(plan.allowFollowUpQuestion).toBe(false);
    expect(plan.reason).toContain("devam eden");
  });

  it("does not attach a non-ongoing new current-user event to the old thread", () => {
    const event = emotionalEvent("busy");
    event.raw = "off bugün iş çok yoğundu";
    event.normalized = event.raw;

    const discourse = reduceDiscourseState(baseState, {
      actor: "user",
      message: event.raw,
      event,
    });

    expect(discourse.resumedThreadId).toBeNull();
    expect(discourse.activeThreadId).toBeNull();

    const plan = planDialogueResponse([], event.raw, "Mert", event, undefined, discourse);
    expect(plan.move).toBe("invite_emotional_context");
  });
});
