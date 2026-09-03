/**
 * DiscourseState reducer (ADR-0006 foundation repair).
 *
 * Pure. Deterministic. NOT a decision authority — it only produces context for
 * the dialogue decision, the ResponsePlan prompt, and the local renderer.
 * It never touches relationship / mood scores.
 */

import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";
import {
  classifyKairaReplyAct,
  classifyUserSocialAct,
  kairaActIsQuestion,
  userSignalsAlreadyAnswered,
} from "./discourseSocialAct";
import {
  EMPTY_DISCOURSE_STATE,
  type DiscoursePreviousTurnDependency,
  type DiscourseSocialAct,
  type DiscourseState,
  type RoutineCounter,
} from "../types/discourseState";

const REPEAT_WINDOW = 2; // consecutive-window for routine saturation
const SELF_REPEAT_WINDOW = 6; // turnIndex span for Kaira self-repetition
const TRACKED_SELF_REPEAT_ACTS = new Set<DiscourseSocialAct>([
  "greeting",
  "how_are_you",
  "what_doing",
  "agreement_ack",
  "farewell",
]);

export interface DiscourseUserTurn {
  actor: "user";
  message: string;
  event: SemanticEvent;
}
export interface DiscourseKairaTurn {
  actor: "kaira";
  reply: string;
}
export type DiscourseTurnInput = DiscourseUserTurn | DiscourseKairaTurn;

function bumpRoutine(counter: RoutineCounter, turnIndex: number): RoutineCounter {
  const consecutive = turnIndex - counter.lastTurnIndex <= REPEAT_WINDOW;
  return {
    count: consecutive ? counter.count + 1 : 1,
    lastTurnIndex: turnIndex,
  };
}

function isShort(message: string): boolean {
  return (message.trim().match(/\S+/gu) ?? []).length <= 4;
}

function startsNewTopic(event: SemanticEvent): boolean {
  return (
    event.discourseAct === "topic_shift" ||
    event.intent === "information_request" ||
    event.intent === "emotional_share" ||
    (event.socialRoutine ?? "none") === "none" &&
      event.discourseAct === "none" &&
      !isShortIntent(event)
  );
}

function isShortIntent(event: SemanticEvent): boolean {
  return (
    event.intent === "greeting" ||
    event.intent === "general_chat" ||
    (event.socialRoutine ?? "none") !== "none"
  );
}

export function reduceDiscourseState(
  prev: DiscourseState,
  turn: DiscourseTurnInput,
): DiscourseState {
  const turnIndex = prev.turnIndex + 1;

  if (turn.actor === "user") {
    const act = classifyUserSocialAct(turn.event, turn.message);
    const routines = {
      greeting:
        act === "greeting" ? bumpRoutine(prev.routines.greeting, turnIndex) : prev.routines.greeting,
      howAreYou:
        act === "how_are_you"
          ? bumpRoutine(prev.routines.howAreYou, turnIndex)
          : prev.routines.howAreYou,
      whatDoing:
        act === "what_doing"
          ? bumpRoutine(prev.routines.whatDoing, turnIndex)
          : prev.routines.whatDoing,
    };

    // Is this user turn a response to Kaira's previous turn?
    let previousTurnDependency: DiscoursePreviousTurnDependency | null = null;
    const kairaPending =
      prev.pendingQuestion && prev.pendingQuestion.asker === "kaira" && !prev.pendingQuestion.answered
        ? prev.pendingQuestion
        : null;
    const isOwnRoutine =
      act === "greeting" || act === "farewell" || act === "thanks" || act === "banter";
    const respondsToKaira =
      prev.lastKairaAct !== null &&
      !isOwnRoutine &&
      !startsNewTopic(turn.event) &&
      (userSignalsAlreadyAnswered(turn.message) ||
        act === "correction" ||
        act === "complaint" ||
        (kairaPending !== null &&
          (isShort(turn.message) || act === "answer" || act === "agreement_ack")));

    if (respondsToKaira) {
      const friction = userSignalsAlreadyAnswered(turn.message) || act === "complaint";
      previousTurnDependency = {
        on: kairaPending ? "kaira_question" : "kaira_statement",
        responseKind:
          act === "correction"
            ? "correction"
            : act === "complaint" && !userSignalsAlreadyAnswered(turn.message)
              ? "clarification"
              : friction
                ? "answer_with_friction"
                : "answer",
      };
    }

    // pending-question ledger
    let pendingQuestion = prev.pendingQuestion;
    if (kairaPending && (respondsToKaira || act === "answer")) {
      pendingQuestion = { ...kairaPending, answered: true };
    }
    if (act === "question") {
      pendingQuestion = { asker: "user", kind: act, askedAtTurn: turnIndex, answered: false };
    }

    return {
      ...prev,
      turnIndex,
      routines,
      pendingQuestion,
      previousTurnDependency,
      lastUserAct: act,
    };
  }

  // ---- Kaira turn (self-observation) --------------------------------
  const act = classifyKairaReplyAct(turn.reply);
  const kairaRecentActs = [...prev.kairaRecentActs, { act, turnIndex }].slice(-6);

  // Any tracked social act Kaira repeated within the recent window stays flagged
  // (it does not clear just because the very last reply was something else).
  let selfRepeat: DiscourseState["selfRepeat"] = null;
  for (const tracked of TRACKED_SELF_REPEAT_ACTS) {
    const n = kairaRecentActs.filter(
      (entry) => entry.act === tracked && turnIndex - entry.turnIndex <= SELF_REPEAT_WINDOW,
    ).length;
    if (n >= 2 && (!selfRepeat || n > selfRepeat.count)) selfRepeat = { act: tracked, count: n };
  }

  let pendingQuestion = prev.pendingQuestion;
  if (kairaActIsQuestion(act)) {
    pendingQuestion = { asker: "kaira", kind: act, askedAtTurn: turnIndex, answered: false };
  } else if (prev.pendingQuestion?.asker === "user" && !prev.pendingQuestion.answered) {
    // Kaira answered the user's pending question (best-effort).
    pendingQuestion = { ...prev.pendingQuestion, answered: true };
  }

  return {
    ...prev,
    turnIndex,
    pendingQuestion,
    kairaRecentActs,
    selfRepeat,
    // Kaira's own turn does not "depend on" anything for the next user turn;
    // clear so a stale dependency never leaks forward.
    previousTurnDependency: null,
    lastKairaAct: act,
  };
}

/**
 * Fold the reducer over the request history, then (optionally) over the current
 * user message. History already contains Kaira's last delivered reply, so the
 * "delivered reply feeds the next turn" requirement needs no extra persistence.
 */
export function deriveDiscourseState(
  history: Array<{ sender?: string; text?: string }>,
  current?: { message: string; event: SemanticEvent },
): DiscourseState {
  let state = EMPTY_DISCOURSE_STATE;
  for (const raw of history) {
    const text = String(raw?.text ?? "");
    if (!text.trim()) continue;
    if (raw?.sender === "user") {
      state = reduceDiscourseState(state, {
        actor: "user",
        message: text,
        event: interpretSemanticEvent(text),
      });
    } else if (raw?.sender === "droit") {
      state = reduceDiscourseState(state, { actor: "kaira", reply: text });
    }
  }
  if (current) {
    state = reduceDiscourseState(state, {
      actor: "user",
      message: current.message,
      event: current.event,
    });
  }
  return state;
}

/** Observational prompt block. Explicitly NOT a decision surface. */
export function buildDiscourseObservationalInstruction(state: DiscourseState): string {
  const lines: string[] = ["DISCOURSE DURUMU (GÖZLEMSEL — KARAR DEĞİL):"];
  const sat: string[] = [];
  if (state.routines.greeting.count >= 2) sat.push("selamlaşma");
  if (state.routines.howAreYou.count >= 2) sat.push("nasılsın");
  if (state.routines.whatDoing.count >= 2) sat.push("ne yapıyorsun");
  if (sat.length)
    lines.push(
      `- Şu rutin(ler) bu sohbette zaten yapıldı, tekrar açma: ${sat.join(
        ", ",
      )}. Yeni bir "selam/merhaba" veya "sen nasılsın" ekleme; sohbete devam et.`,
    );
  if (state.previousTurnDependency) {
    const d = state.previousTurnDependency;
    lines.push(
      `- Kullanıcının bu mesajı yeni bir konu değil; Kaira'nın önceki ${
        d.on === "kaira_question" ? "sorusuna" : "sözüne"
      } verilmiş bir ${
        d.responseKind === "answer_with_friction"
          ? "cevap + hafif sitem (kullanıcı 'zaten söyledim' diyor)"
          : d.responseKind === "correction"
            ? "düzeltme"
            : d.responseKind === "clarification"
              ? "anlamama/itiraz"
              : "cevap"
      }. Bunu selamlama veya yeni konu sanma.`,
    );
  }
  if (state.selfRepeat) {
    lines.push(
      `- Kaira son turlarda "${state.selfRepeat.act}" sosyal işini ${state.selfRepeat.count} kez tekrarladı. Kullanıcı bunu fark ederse kabul et / kısa özür / düzelt; kör "anladım/tamam" ile geçiştirme.`,
    );
  }
  if (lines.length === 1) lines.push("- Belirgin rutin doygunluğu, bağımlılık veya tekrar yok.");
  return lines.join("\n");
}
