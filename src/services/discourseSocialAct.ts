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
import type { DiscourseSocialAct } from "../types/discourseState";

const ALREADY_ANSWERED_RE =
  /\b(dedim\s*ya|söyledim\s*ya|zaten\s+(?:dedim|söyledim|s[öo]yl[üu]yorum)|dedim\s+sana|geçen\s+de\s+dedim)\b/iu;

// Contextual friction is intentionally phrased as composable discourse cues,
// not a list of whole magic sentences. These cues only say "this likely refers
// back to an earlier answer"; they do not decide sentiment or relationship.
const PRIOR_ANSWER_FRICTION_RE =
  /\b(?:az\s+önce|daha\s+demin|demin|zaten|kaç\s+kere)\b.{0,48}\b(?:dedim|söyledim|s[öo]yledim|cevap\s+verdim|söyleyeyim|s[öo]yleyeyim)\b|\b(?:dedim|söyledim|s[öo]yledim|cevap\s+verdim)\b.{0,32}\b(?:az\s+önce|daha\s+demin|demin|zaten|sana)\b|\bkaç\s+kere\b/iu;

const SHORT_STATE_ANSWER_RE =
  /^(?:iyi(?:yim)?|eh(?:\s*işte)?|idare(?:\s*eder)?|fena\s*değil|k[öo]t[üu](?:y[üu]m)?|takıl[ıi]yorum|bo[şs]tay[ıi]m|normal|ayn[ıi])(?:\s+(?:valla|ya|işte|kanka|be))?[.!?…]*$/iu;

const STATE_ANSWER_PREFIX_RE =
  /^(?:iyi(?:yim|dir)?|k[öo]t[üu](?:y[üu]m)?|fena\s+değil|eh\b|idare\b|normal\b|ayn[ıi]\b|moral(?:im)?\b|mod(?:um)?\b)/iu;

/** Classify a user message from the shared semantic event. */
export function classifyUserSocialAct(
  event: Pick<
    SemanticEvent,
    | "socialRoutine"
    | "discourseAct"
    | "intent"
    | "repairSignal"
  >,
  message: string,
): DiscourseSocialAct {
  const text = message.trim().toLocaleLowerCase("tr-TR");

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

  if (SHORT_STATE_ANSWER_RE.test(text)) return "answer";
  if (/^(?:he|hee|hı?hı|evet|aynen|tamam(?:d[ıi]r)?|peki|olur|yok|hayır)\b[.!?…]*$/iu.test(text))
    return "agreement_ack";
  return "statement";
}

/** True when the user message signals "I already answered that". */
export function userSignalsAlreadyAnswered(message: string): boolean {
  return ALREADY_ANSWERED_RE.test(message);
}

/** Broader compositional cue for an answer that explicitly refers back in frustration. */
export function userSignalsAnswerFriction(message: string): boolean {
  return PRIOR_ANSWER_FRICTION_RE.test(message);
}

/** Context-only shape check: can this message begin as an answer to a state question? */
export function userSignalsStateAnswer(message: string): boolean {
  return STATE_ANSWER_PREFIX_RE.test(message.trim().toLocaleLowerCase("tr-TR"));
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
