/**
 * Minimal session-scoped DiscourseState (ADR-0006 foundation repair).
 *
 * This is CONTEXT, not a decision authority. It records only what the first real
 * 8-turn conversation proved is missing: routine saturation, a pending-question
 * ledger, Kaira's own recent social acts + self-repetition, and whether the
 * current user turn depends on Kaira's previous turn.
 *
 * It is recomputed each turn by folding `reduceDiscourseState` over the request
 * history (the delivered reply is already part of history next turn), so it
 * needs no separate persistence. It never mutates relationship / mood.
 */

export type DiscourseSocialAct =
  | "greeting"
  | "how_are_you"
  | "what_doing"
  | "farewell"
  | "thanks"
  | "agreement_ack"
  | "question"
  | "answer"
  | "correction"
  | "complaint"
  | "emotional_share"
  | "banter"
  | "insult"
  | "apology"
  | "statement"
  | "other";

export interface RoutineCounter {
  /** Consecutive-window repeat count for this routine. */
  count: number;
  /** turnIndex at which this routine last occurred. */
  lastTurnIndex: number;
}

export interface DiscoursePendingQuestion {
  asker: "user" | "kaira";
  kind: DiscourseSocialAct;
  askedAtTurn: number;
  answered: boolean;
}

export interface DiscoursePreviousTurnDependency {
  /** What the current user turn is responding to. */
  on: "kaira_question" | "kaira_statement";
  responseKind: "answer" | "answer_with_friction" | "clarification" | "correction";
}

export interface DiscourseState {
  /** Number of turns folded in (user + kaira). */
  turnIndex: number;
  routines: {
    greeting: RoutineCounter;
    howAreYou: RoutineCounter;
    whatDoing: RoutineCounter;
  };
  pendingQuestion: DiscoursePendingQuestion | null;
  /** Last few Kaira social acts, most recent last. */
  kairaRecentActs: Array<{ act: DiscourseSocialAct; turnIndex: number }>;
  /** Set when Kaira repeated the same social act in a short window. */
  selfRepeat: { act: DiscourseSocialAct; count: number } | null;
  /** Set when the current user turn is a response to Kaira's previous turn. */
  previousTurnDependency: DiscoursePreviousTurnDependency | null;
  lastUserAct: DiscourseSocialAct | null;
  lastKairaAct: DiscourseSocialAct | null;
}

export const EMPTY_DISCOURSE_STATE: DiscourseState = {
  turnIndex: 0,
  routines: {
    greeting: { count: 0, lastTurnIndex: -99 },
    howAreYou: { count: 0, lastTurnIndex: -99 },
    whatDoing: { count: 0, lastTurnIndex: -99 },
  },
  pendingQuestion: null,
  kairaRecentActs: [],
  selfRepeat: null,
  previousTurnDependency: null,
  lastUserAct: null,
  lastKairaAct: null,
};

/** A routine is "saturated" once repeated within a short consecutive window. */
export function isRoutineSaturated(counter: RoutineCounter): boolean {
  return counter.count >= 2;
}
