/**
 * DiscourseState reducer — foundation-repair unit contracts (ADR-0006).
 * The reducer is context only: it never touches relationship / mood and is not
 * a decision authority.
 */

import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { deriveDiscourseState, reduceDiscourseState } from "./discourseStateReducer";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";

const u = (message: string) =>
  ({ actor: "user" as const, message, event: interpretSemanticEvent(message) });
const k = (reply: string) => ({ actor: "kaira" as const, reply });

function fold(...turns: Array<ReturnType<typeof u> | ReturnType<typeof k>>) {
  return turns.reduce(reduceDiscourseState, EMPTY_DISCOURSE_STATE);
}

describe("routine saturation", () => {
  it("marks greeting saturated after a back-to-back exchange", () => {
    const s = fold(u("selam"), k("selam"), u("selam"));
    expect(s.routines.greeting.count).toBeGreaterThanOrEqual(2);
  });

  it("does NOT saturate a greeting that returns after a gap (3-hours-later selam stays legitimate)", () => {
    const s = fold(
      u("selam"),
      k("selam kanka"),
      u("naber"),
      k("iyi valla sen"),
      u("ne yapıyorsun"),
      k("takılıyorum"),
      u("iyi be"),
      k("he anladım"),
      u("selam"), // a fresh greeting many turns later
    );
    expect(s.routines.greeting.count).toBe(1);
  });

  it("counts repeated how_are_you", () => {
    const s = fold(u("naber"), k("iyi valla sen nasılsın"), u("nasılsın"));
    expect(s.routines.howAreYou.count).toBeGreaterThanOrEqual(2);
  });
});

describe("pending question ledger", () => {
  it("Kaira asking 'nasılsın' back opens a pending question; the user's next turn answers it", () => {
    const asked = fold(u("naber"), k("iyi valla sen nasılsın"));
    expect(asked.pendingQuestion).toMatchObject({ asker: "kaira", answered: false });
    const answered = reduceDiscourseState(asked, u("iyi dedim ya"));
    expect(answered.pendingQuestion?.answered).toBe(true);
  });
});

describe("previous-turn dependency", () => {
  it("'iyi dedim ya' after Kaira's 'nasılsın' is a friction answer, NOT a greeting/new topic", () => {
    const s = fold(u("naber"), k("iyi valla sen nasılsın"), u("iyi dedim ya"));
    expect(s.previousTurnDependency).toEqual({
      on: "kaira_question",
      responseKind: "answer_with_friction",
    });
  });

  it("a fresh greeting is NOT a previous-turn dependency", () => {
    const s = fold(u("naber"), k("iyi valla sen"), u("merhaba kanka"));
    expect(s.previousTurnDependency).toBeNull();
  });

  it("a correction after Kaira's turn is flagged as a correction", () => {
    const s = fold(u("nasılsın"), k("iyi, sen mühendissin di mi"), u("yok değilim"));
    expect(s.previousTurnDependency?.responseKind).toBe("correction");
  });
});

describe("Kaira self-repetition", () => {
  it("flags a repeated social act in a short window", () => {
    const s = fold(
      u("selam"),
      k("selam"),
      u("merhaba"),
      k("merhaba"),
      u("selam"),
      k("selam ya"),
    );
    expect(s.selfRepeat).toMatchObject({ act: "greeting" });
    expect(s.selfRepeat!.count).toBeGreaterThanOrEqual(2);
  });

  it("selfRepeat tracks the social ACT, not exact strings ('merhaba' and 'selam' both count as greeting)", () => {
    const s = fold(u("selam"), k("selam"), u("selam"), k("merhaba"), u("hey"), k("heyy"));
    expect(s.selfRepeat?.act).toBe("greeting");
  });

  it("no self-repeat when Kaira varies the social function", () => {
    const s = fold(u("selam"), k("selam"), u("naber"), k("iyi valla"), u("ne yapıyorsun"), k("takılıyorum"));
    expect(s.selfRepeat).toBeNull();
  });
});

describe("deriveDiscourseState folds history + current turn", () => {
  it("replays the request history and the current user message with no persistence", () => {
    const history = [
      { sender: "user", text: "naber", semanticEvent: interpretSemanticEvent("naber") },
      { sender: "droit", text: "iyi valla sen nasılsın" },
    ];
    const s = deriveDiscourseState(history, { message: "iyi dedim ya", event: interpretSemanticEvent("iyi dedim ya") });
    expect(s.previousTurnDependency?.on).toBe("kaira_question");
    expect(s.turnIndex).toBe(3);
  });
});
