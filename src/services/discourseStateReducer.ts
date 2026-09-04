/**
 * DiscourseState reducer (ADR-0006 foundation repair).
 *
 * Pure. Deterministic. NOT a decision authority — it only produces context for
 * the dialogue decision, the ResponsePlan prompt, and the local renderer.
 * It never touches relationship / mood scores.
 */

import type { SemanticEvent } from "./semanticEventEngine";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import {
  classifyKairaReplyAct,
  classifyUserSocialAct,
  kairaActIsQuestion,
  userSignalsAlreadyAnswered,
  userSignalsAnswerFriction,
  userSignalsStateAnswer,
} from "./discourseSocialAct";
import {
  EMPTY_DISCOURSE_STATE,
  type DiscourseOpenThread,
  type DiscoursePendingQuestion,
  type DiscoursePreviousTurnDependency,
  type DiscourseSocialAct,
  type DiscourseState,
  type RoutineCounter,
} from "../types/discourseState";

const REPEAT_WINDOW = 2; // consecutive-window for routine saturation
const SELF_REPEAT_WINDOW = 6; // turnIndex span for Kaira self-repetition
const MAX_OPEN_THREADS = 3;
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
    ((event.socialRoutine ?? "none") === "none" &&
      event.discourseAct === "none" &&
      !isShortIntent(event))
  );
}

function isShortIntent(event: SemanticEvent): boolean {
  return (
    event.intent === "greeting" ||
    event.intent === "general_chat" ||
    (event.socialRoutine ?? "none") !== "none"
  );
}

function opensThirdPartyThread(event: SemanticEvent): boolean {
  if (event.target !== "third_party") return false;
  if (event.discourseAct === "recall_request") return false;
  return (
    event.intent === "emotional_share" ||
    event.intent === "complaint" ||
    event.intent === "general_chat" ||
    event.insult ||
    event.frustration >= 0.2 ||
    event.emotionalLoad >= 0.25 ||
    event.valence !== "neutral"
  );
}

function requestsThreadResumption(event: SemanticEvent): boolean {
  if (event.target === "kaira") return false;
  return Boolean(event.adviceRequested || event.discourseAct === "recall_request");
}

function appendAnchorEvidence(existing: string, next: string): string {
  const current = existing.trim();
  const incoming = next.trim();
  if (!incoming || current === incoming) return current;
  const combined = current ? `${current} | ${incoming}` : incoming;
  return combined.length <= 420 ? combined : combined.slice(combined.length - 420);
}

function updateThreadState(
  prev: DiscourseState,
  event: SemanticEvent,
  message: string,
  turnIndex: number,
): Pick<
  DiscourseState,
  "openThreads" | "activeThreadId" | "resumedThreadId" | "ambiguousThreadResumption"
> {
  let openThreads = prev.openThreads;
  let activeThreadId: string | null = null;
  let resumedThreadId: string | null = null;
  let ambiguousThreadResumption = false;

  // A typed resumption signal must bind to already-open discourse context
  // before the same compound turn is considered a fresh third-party opening.
  // Otherwise `target=third_party + adviceRequested=true` creates a duplicate
  // thread and destroys the very continuity this state is meant to observe.
  if (requestsThreadResumption(event) && openThreads.length > 0) {
    if (openThreads.length === 1) {
      const resumed = openThreads[0];
      resumedThreadId = resumed.id;
      activeThreadId = resumed.id;
      openThreads = openThreads.map((thread) =>
        thread.id === resumed.id ? { ...thread, lastRelevantTurn: turnIndex } : thread,
      );
    } else {
      ambiguousThreadResumption = true;
    }
    return { openThreads, activeThreadId, resumedThreadId, ambiguousThreadResumption };
  }

  if (opensThirdPartyThread(event)) {
    const active = prev.activeThreadId
      ? openThreads.find((thread) => thread.id === prev.activeThreadId)
      : null;
    if (active && event.discourseAct !== "topic_shift") {
      openThreads = openThreads.map((thread) =>
        thread.id === active.id
          ? {
              ...thread,
              anchorText: appendAnchorEvidence(thread.anchorText, message),
              lastRelevantTurn: turnIndex,
            }
          : thread,
      );
      activeThreadId = active.id;
      return { openThreads, activeThreadId, resumedThreadId, ambiguousThreadResumption };
    }

    const created: DiscourseOpenThread = {
      id: `third-party-thread-${turnIndex}`,
      kind: "third_party_topic",
      anchorText: message.trim(),
      openedAtTurn: turnIndex,
      lastRelevantTurn: turnIndex,
    };
    openThreads = [...openThreads, created].slice(-MAX_OPEN_THREADS);
    activeThreadId = created.id;
    return { openThreads, activeThreadId, resumedThreadId, ambiguousThreadResumption };
  }

  // With no existing thread, a resumption request has nothing to bind to.
  // Fail closed instead of manufacturing context.
  if (requestsThreadResumption(event)) {
    return { openThreads, activeThreadId, resumedThreadId, ambiguousThreadResumption };
  }

  // Unrelated user turns suspend the active topic without deleting unresolved
  // thread evidence. A later typed resumption may make it active again.
  return { openThreads, activeThreadId, resumedThreadId, ambiguousThreadResumption };
}

/**
 * Contextual answer recognition is based on the pending conversational role,
 * not on one magic phrase. The per-message semantic label can legitimately be
 * `banter`/`general_chat` while the turn is still an answer to Kaira's question.
 * This is deliberately coarse: it only establishes dependency, never sentiment
 * or relationship meaning.
 */
function answersPendingQuestion(
  pending: DiscoursePendingQuestion,
  message: string,
  act: DiscourseSocialAct,
): boolean {
  const text = message.trim().toLocaleLowerCase("tr-TR");
  if (!text) return false;
  if (act === "answer" || act === "agreement_ack" || act === "correction") return true;

  if (pending.kind === "how_are_you") return userSignalsStateAnswer(message);
  if (pending.kind === "what_doing") {
    return /^(?:tak[ıi]l|çalış|çal[ıi][şs]|otur|evde|işte|okulda|dışarı|boş|hiçbir|bi\s+şey|bir\s+şey)/iu.test(text);
  }

  return isShort(message) && act !== "greeting" && act !== "farewell";
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
      act === "greeting" || act === "farewell" || act === "thanks";
    const contextualAnswer =
      kairaPending !== null && answersPendingQuestion(kairaPending, turn.message, act);
    const answerFriction =
      userSignalsAlreadyAnswered(turn.message) || userSignalsAnswerFriction(turn.message);
    const explicitRepair = (turn.event.repairSignal ?? "none") !== "none";
    const explicitDependency =
      answerFriction ||
      act === "correction" ||
      explicitRepair;
    const responseEvidence = contextualAnswer || (!isOwnRoutine && explicitDependency);
    // A canonical semantic label such as complaint/general_chat must not erase a
    // stronger turn-taking fact: a state-shaped answer to Kaira's still-pending
    // question remains dependent on that question. Only treat it as a new topic
    // when there is no contextual/explicit response evidence.
    const unambiguousNewTopic = startsNewTopic(turn.event) && !responseEvidence;
    const respondsToKaira =
      prev.lastKairaAct !== null &&
      !unambiguousNewTopic &&
      responseEvidence;

    if (respondsToKaira) {
      const friction =
        answerFriction ||
        explicitRepair ||
        turn.event.discourseAct === "correction" ||
        turn.event.frustration >= 0.25;
      previousTurnDependency = {
        on: kairaPending ? "kaira_question" : "kaira_statement",
        responseKind:
          act === "correction"
            ? "correction"
            : explicitRepair
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

    const threadState = updateThreadState(prev, turn.event, turn.message, turnIndex);

    return {
      ...prev,
      turnIndex,
      routines,
      pendingQuestion,
      previousTurnDependency,
      ...threadState,
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
    resumedThreadId: null,
    ambiguousThreadResumption: false,
    lastKairaAct: act,
  };
}

/**
 * Fold the reducer over canonical request history, then (optionally) over the current
 * user message. Historical user turns MUST carry their ingestion-time SemanticInterpretation@2;
 * raw historical text is never reparsed. History already contains Kaira's last delivered
 * reply, so delivered Kaira turns still feed self-observation directly.
 */
export function deriveDiscourseState(
  history: Array<{ sender?: string; text?: string; semanticInterpretation?: SemanticInterpretation }>,
  current?: { message: string; event: SemanticEvent },
): DiscourseState {
  let state = EMPTY_DISCOURSE_STATE;
  for (const raw of history) {
    const text = String(raw?.text ?? "");
    if (!text.trim()) continue;
    if (raw?.sender === "user") {
      // Canonical authority rule: historical text is evidence, not a new parse request.
      // Old turns without a persisted semantic snapshot fail closed instead of silently
      // creating a second semantic truth with the regex parser.
      if (!raw.semanticInterpretation) continue;
      state = reduceDiscourseState(state, {
        actor: "user",
        message: text,
        event: projectSemanticEvent(raw.semanticInterpretation),
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
          ? "cevap + hafif sitem (kullanıcı daha önce cevap verdiğini belirtiyor)"
          : d.responseKind === "correction"
            ? "düzeltme"
            : d.responseKind === "clarification"
              ? "anlamama/itiraz"
              : "cevap"
      }. Bunu selamlama veya yeni konu sanma.`,
    );
  }
  if (state.resumedThreadId) {
    const thread = state.openThreads.find((item) => item.id === state.resumedThreadId);
    if (thread) {
      lines.push(
        `- Kullanıcı daha önce açık bırakılmış bir üçüncü-kişi konusuna geri dönüyor. Önceki konuşma kanıtı: "${thread.anchorText}". Bu metni yalnız bağlam/evidence olarak kullan; burada yazmayan yeni olay, kimlik veya kesinlik uydurma.`,
      );
    }
  } else if (state.ambiguousThreadResumption) {
    lines.push(
      `- Kullanıcının dönüş yapabileceği birden fazla açık üçüncü-kişi konusu var. Hangisini kastettiğini UYDURMA; gerekiyorsa kısa netleştirme iste.`,
    );
  }
  if (state.selfRepeat) {
    lines.push(
      `- Kaira son turlarda "${state.selfRepeat.act}" sosyal işini ${state.selfRepeat.count} kez tekrarladı. Kullanıcı bunu fark ederse kabul et / kısa özür / düzelt; kör "anladım/tamam" ile geçiştirme.`,
    );
  }
  if (lines.length === 1) lines.push("- Belirgin rutin doygunluğu, bağımlılık, thread dönüşü veya tekrar yok.");
  return lines.join("\n");
}
