/**
 * Coarse social-act classification for the DiscourseState reducer
 * (ADR-0006 foundation repair).
 *
 * User turns are classified from the SHARED canonical SemanticEvent (never a
 * fresh independent parse). Kaira turns are classified from her own delivered
 * reply text with a small deterministic regex set — this is a self-observation
 * for repetition tracking, not a decision.
 */

import type { SemanticEvent } from "./semanticEventEngine";
import type { SemanticDiscourseProjection } from "../types/semanticInterpretation";
import type { DiscourseSocialAct } from "../types/discourseState";

type CanonicalDiscourseEvent = SemanticEvent & SemanticDiscourseProjection;

/**
 * Classify a user message strictly from the shared canonical event.
 *
 * `message` remains in the compatibility signature while callers migrate, but
 * it is intentionally ignored: downstream discourse code must never recreate
 * user semantics from raw text.
 */
export function classifyUserSocialAct(
  event: Pick<
    CanonicalDiscourseEvent,
    | "socialRoutine"
    | "discourseAct"
    | "intent"
    | "repairSignal"
    | "stateAnswerShape"
  >,
  _message: string,
): DiscourseSocialAct {
  switch (event.socialRoutine) {
    case "greeting":
      return "greeting";
    case "how_are_you":
      return "how_are_you";
    case "what_doing":
      return "what_doing";
    case "thanks":
      return "thanks";
    case "goodbye":
    case "good_night":
      return "farewell";
    case "agreement":
      return "agreement_ack";
    case "emotional_opening":
      return "emotional_share";
    default:
      break;
  }

  if (event.discourseAct === "correction") return "correction";
  if (event.discourseAct === "confusion_or_challenge") return "complaint";
  if (event.discourseAct === "recall_request") return "question";

  switch (event.intent) {
    case "insult":
      return "insult";
    case "apology":
    case "repair":
      return "apology";
    case "complaint":
      return "complaint";
    case "banter":
      return "banter";
    case "emotional_share":
      return "emotional_share";
    case "question":
    case "information_request":
      return "question";
    default:
      break;
  }

  if (event.stateAnswerShape) return "answer";
  return "statement";
}

const KAIRA_GREETING_RE = /^\s*(?:selam+|merhaba+|hey+|he?yy?|s(?:a|.a\.))\b/iu;
const KAIRA_FAREWELL_RE =
  /\b(g[öo]r[üu][şs][üu]r[üu]z|kendine iyi bak|iyi geceler|iyi uykular|ho[şs][çc]a kal|ka[çc]t[ıi]m|ka[çc]ar[ıi]m)\b/iu;
const KAIRA_APOLOGY_RE = /\b([öo]z[üu]r|kusura bakma|hakl[ıi]s[ıi]n|pardon|yan[ıi]lm[ıi][şs][ıi]m)\b/iu;
const KAIRA_ASK_STATE_RE =
  /\bnas[ıi]ls[ıi]n\b|\bsen\s*\?|senden\s+naber|sen\s+naber|sen\s+napt[ıi]n|sende\s+naber/iu;
const KAIRA_ASK_DOING_RE = /\bnap[ıi]yo(?:rsun|n)?\b|ne\s+yap[ıi]yorsun\b|napt[ıi]n\b/iu;
const KAIRA_STATE_ANSWER_RE = /^\s*(?:iyi(?:yim|dir)?|takıl[ıi]yorum|idare|eh\s*işte|bo[şs]tay[ıi]m)\b/iu;
const KAIRA_SHORT_ACK_RE = /^\s*(?:he|hee|tamam(?:d[ıi]r)?|anlad[ıi]m|aynen|evet|peki|olur|hmm)\b[.!?…]*$/iu;

/** Classify Kaira's delivered reply into a coarse social act (self-observation). */
export function classifyKairaReplyAct(reply: string): DiscourseSocialAct {
  const text = String(reply ?? "").trim();
  if (!text) return "other";
  if (KAIRA_APOLOGY_RE.test(text)) return "apology";
  if (KAIRA_FAREWELL_RE.test(text)) return "farewell";
  if (KAIRA_GREETING_RE.test(text)) return "greeting";
  if (KAIRA_ASK_STATE_RE.test(text)) return "how_are_you";
  if (KAIRA_ASK_DOING_RE.test(text)) return "what_doing";
  if (KAIRA_STATE_ANSWER_RE.test(text)) return "answer";
  if (KAIRA_SHORT_ACK_RE.test(text)) return "agreement_ack";
  if (/[?？]/u.test(text)) return "question";
  return "statement";
}

/** Whether a Kaira act counts as "asking the user something back". */
export function kairaActIsQuestion(act: DiscourseSocialAct): boolean {
  return act === "question" || act === "how_are_you" || act === "what_doing";
}
