import { describe, expect, it } from "vitest";
import type { SemanticEvent } from "./semanticEventEngine";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";

const event = (overrides: Partial<SemanticEvent> = {}): SemanticEvent => ({
  raw: "",
  normalized: "",
  intent: "general_chat",
  socialRoutine: "none",
  discourseAct: "none",
  repairSignal: "none",
  adviceRequested: false,
  knowledgeQuery: null,
  valence: "neutral",
  target: "unknown",
  relationalAct: "none",
  relationalIntensity: 0,
  severity: 0,
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
  emotionalLoad: 0,
  affection: 0,
  support: 0,
  compliment: 0,
  ...overrides,
});

describe("DialogueDecision compound advice/topic-shift authority", () => {
  it("preserves an explicit typed advice obligation when the same turn is also a topic shift", () => {
    const semantic = event({
      raw: "neyse ben o çocukla ne yapcam şimdi?",
      normalized: "neyse ben o çocukla ne yapacağım şimdi?",
      intent: "emotional_share",
      discourseAct: "topic_shift",
      adviceRequested: true,
      target: "event",
      valence: "negative",
      emotionalLoad: 0.5,
    });

    const plan = planDialogueResponse([], semantic.raw, "Mert", semantic);

    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.obligation?.type).toBe("answer_or_clarify");
    expect(plan.obligation?.satisfactionCriteria.forbiddenResponseClasses)
      .toContain("acknowledgement_only");
  });

  it("keeps a pure topic shift as follow_topic_shift when no advice obligation exists", () => {
    const semantic = event({
      raw: "neyse bugün kahve aldım",
      normalized: "neyse bugün kahve aldım",
      discourseAct: "topic_shift",
      adviceRequested: false,
    });

    const plan = planDialogueResponse([], semantic.raw, "Mert", semantic);

    expect(plan.move).toBe("follow_topic_shift");
    expect(plan.obligation).toBeUndefined();
  });
});
