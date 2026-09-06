import { describe, expect, it } from "vitest";
import {
  interpretSemanticEvent,
  type SemanticEvent,
} from "./semanticEventEngine";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";

function turn3SemanticEvent(): SemanticEvent {
  const message =
    "sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor";
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
          attributeKey: "back_sunburned",
          value: true,
          confidence: 0.95,
        },
      ],
      query: null,
    },
  };
}

describe("Kaira active discourse same-turn grounding", () => {
  it("does not ask for missing context when the current canonical turn already carries grounded event content", () => {
    const message =
      "sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor";
    const plan = planDialogueResponse(
      [],
      message,
      "Tolga",
      turn3SemanticEvent(),
    );

    expect(plan.move).not.toBe("invite_emotional_context");
    expect(plan.allowFollowUpQuestion).toBe(false);
  });

  it("keeps true context-free emotional openings on the bounded curiosity path", () => {
    const plan = planDialogueResponse([], "moralim bozuk", "Tolga");

    expect(plan).toMatchObject({
      move: "invite_emotional_context",
      allowFollowUpQuestion: true,
    });
  });
});
