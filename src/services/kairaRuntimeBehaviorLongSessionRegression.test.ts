import { describe, expect, it } from "vitest";
import { deriveDiscourseState } from "./discourseStateReducer";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { interpretationFromLegacyEvent } from "./semanticInterpretationLegacyProjection";
import { findKairaResponsePlanIssues, type KairaResponsePlan } from "./kairaResponsePlan";
import type { ConversationTurn } from "./kairoConversationGrounding";

const noQuestionPlan: KairaResponsePlan = {
  move: "follow_previous_answer",
  stance: "open",
  register: "balanced",
  relationshipLevel: "familiar",
  continueConversation: true,
  allowQuestion: false,
  allowHumor: false,
  allowAffection: false,
  allowForgiveness: false,
  allowReopeningCloseness: false,
  maxSentences: 1,
  maxWords: 14,
  emojiBudget: 0,
  reasons: ["long-session-regression"],
};

function ingestionHistory(history: Array<{ sender: string; text: string }>): ConversationTurn[] {
  return history.map((turn) => turn.sender === "user"
    ? ({ ...turn, sender: "user", semanticInterpretation: interpretationFromLegacyEvent(interpretSemanticEvent(turn.text), turn.text) } as ConversationTurn)
    : ({ ...turn, sender: "droit" } as ConversationTurn));
}

describe("Kaira runtime behavior long-session regression", () => {
  it("keeps turn dependency and social-repeat state coherent across a mixed 12-turn conversation", () => {
    const history = [
      { sender: "user", text: "selam" },
      { sender: "droit", text: "selam" },
      { sender: "user", text: "naber" },
      { sender: "droit", text: "iyiyim, sen nasılsın" },
      { sender: "user", text: "iyiyim be" },
      { sender: "droit", text: "iyi o zaman" },
      { sender: "user", text: "bugün biraz yoruldum" },
      { sender: "droit", text: "yoğun geçti demek" },
      { sender: "user", text: "aynen" },
      { sender: "droit", text: "dinlen biraz" },
      { sender: "user", text: "bu arada senden naber" },
      { sender: "droit", text: "iyiyim, takılıyorum" },
    ];

    const state = deriveDiscourseState(ingestionHistory(history));
    expect(state.turnIndex).toBe(12);
    expect(state.routines.greeting.count).toBe(1);
    expect(state.routines.howAreYou.count).toBeGreaterThanOrEqual(1);
    expect(state.lastKairaAct).toBe("answer");

    const current = "iyi dedim ya amk";
    const withCurrent = deriveDiscourseState(
      [...ingestionHistory(history), { sender: "droit", text: "sen nasılsın peki" } as ConversationTurn],
      { message: current, event: interpretSemanticEvent(current) },
    );
    expect(withCurrent.previousTurnDependency?.on).toBe("kaira_question");
    expect(withCurrent.previousTurnDependency?.responseKind).toBe("answer_with_friction");
  });

  it.each([
    "nasılsın sen bugün",
    "sen bugün nasılsın",
    "iyi misin bugün",
    "ne yapıyorsun şimdi",
    "neden öyle yaptın",
    "geliyor musun",
  ])("keeps final no-question contract invariant under punctuation-free paraphrase: %s", (reply) => {
    expect(findKairaResponsePlanIssues(reply, noQuestionPlan)).toContain("response_plan_question_blocked");
  });

  it.each([
    "Mert bana nasılsın diye sordu",
    "Mert iyi misin diye sordu",
  ])("does not mistake reported question content for Kaira asking a new question: %s", (reply) => {
    expect(findKairaResponsePlanIssues(reply, noQuestionPlan)).not.toContain("response_plan_question_blocked");
  });

  it.each([
    "iyi dedim ya amk",
    "iyiyim, az önce söyledim",
    "fena değil dedim sana",
    "normal işte, daha demin cevap verdim",
    "iyiyim be kaç kere söyleyeyim",
  ])("keeps semantic-equivalent prior-answer turns attached to the pending Kaira question: %s", (message) => {
    const history = [
      { sender: "user", text: "naber" },
      { sender: "droit", text: "iyiyim, sen nasılsın" },
    ];
    const state = deriveDiscourseState(ingestionHistory(history), { message, event: interpretSemanticEvent(message) });
    expect(state.previousTurnDependency?.on).toBe("kaira_question");
    expect(["answer", "answer_with_friction", "correction"]).toContain(
      state.previousTurnDependency?.responseKind,
    );
  });

  it.each([
    "iyi dedim ya amk",
    "iyiyim, az önce söyledim",
    "normal işte, daha demin cevap verdim",
    "iyiyim be kaç kere söyleyeyim",
  ])("marks explicit prior-answer frustration compositionally rather than by exact sentence: %s", (message) => {
    const history = [
      { sender: "user", text: "naber" },
      { sender: "droit", text: "iyiyim, sen nasılsın" },
    ];
    const state = deriveDiscourseState(ingestionHistory(history), { message, event: interpretSemanticEvent(message) });
    expect(state.previousTurnDependency).toMatchObject({
      on: "kaira_question",
      responseKind: "answer_with_friction",
    });
  });
});