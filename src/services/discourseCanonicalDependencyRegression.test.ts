import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { reduceDiscourseState } from "./discourseStateReducer";

async function afterKairaStateQuestion(message: string) {
  let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
    actor: "kaira",
    reply: "nasılsın?",
  });
  const understood = await understandTurkishMessage(message);
  state = reduceDiscourseState(state, {
    actor: "user",
    message,
    event: understood.event,
  });
  return { state, understood };
}

describe("canonical discourse dependency facets — A1 regression", () => {
  it("produces already-answered/friction at ingestion and consumes it as answer_with_friction", async () => {
    const { state, understood } = await afterKairaStateQuestion("dedim ya");

    expect(understood.interpretation.discourseFacets.signalsAlreadyAnswered).toBe(true);
    expect(understood.event.signalsAlreadyAnswered).toBe(true);
    expect(state.previousTurnDependency).toEqual({
      on: "kaira_question",
      responseKind: "answer_with_friction",
    });
  });

  it("produces state-answer shape at ingestion and closes a pending how-are-you question", async () => {
    const { state, understood } = await afterKairaStateQuestion("iyi ya");

    expect(understood.interpretation.discourseFacets.stateAnswerShape).toBe(true);
    expect(understood.event.stateAnswerShape).toBe(true);
    expect(state.lastUserAct).toBe("answer");
    expect(state.pendingQuestion?.answered).toBe(true);
    expect(state.previousTurnDependency?.responseKind).toBe("answer");
  });

  it("does not synthesize friction in DiscourseState when canonical ingestion says none", async () => {
    const { state, understood } = await afterKairaStateQuestion("bugün başka bir şey konuşalım");

    expect(understood.interpretation.discourseFacets.signalsAlreadyAnswered).toBe(false);
    expect(understood.interpretation.discourseFacets.answerFriction).toBe(false);
    expect(state.previousTurnDependency).toBeNull();
  });
});
