/**
 * Minimal session-scoped DiscourseState (ADR-0006 foundation repair).
 *
 * This is CONTEXT, not a decision authority. It records routine saturation,
 * pending conversational obligations, Kaira self-repetition, previous-turn
 * dependency and bounded unresolved conversation threads.
 *
 * It is recomputed each turn by folding `reduceDiscourseState` over request
 * history, so it needs no separate persistence and never mutates relationship
 * or mood state.
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

/**
 * Session-scoped unresolved conversation topic. `anchorText` is quoted evidence
 * from the ingestion-time canonical turn, not a downstream reparse request.
 */
export interface DiscourseOpenThread {
  id: string;
  kind: "third_party_topic";
  anchorText: string;
  openedAtTurn: number;
  lastRelevantTurn: number;
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
  /** Bounded unresolved session topics. Memory does not own this ledger. */
  openThreads: DiscourseOpenThread[];
  /** Thread currently being discussed; null while conversation is elsewhere. */
  activeThreadId: string | null;
  /** Thread explicitly resumed by the current user turn, when unambiguous. */
  resumedThreadId: string | null;
  /** Current turn is compatible with multiple unresolved threads. */
  ambiguousThreadResumption: boolean;
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
  openThreads: [],
  activeThreadId: null,
  resumedThreadId: null,
  ambiguousThreadResumption: false,
  lastUserAct: null,
  lastKairaAct: null,
};

/** A routine is "saturated" once repeated within a short consecutive window. */
export function isRoutineSaturated(counter: RoutineCounter): boolean {
  return counter.count >= 2;
}