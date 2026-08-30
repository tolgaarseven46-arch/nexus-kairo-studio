import type { DialogueTurnAnalysis } from "./kairoDialogueChaosEngine";
import type { SemanticEvent } from "./semanticEventEngine";

const UNCERTAINTY_RE = /\b(herhalde|galiba|sanırım|belki|muhtemelen|olabilir|emin değilim|düşünüyorum|düşünüyor|düşünüyordu|gibi)\b/i;
const NOISE_RE = /^(?:\s|[.!?])+$/i;
const KEYBOARD_MASH_RE = /^(?:asd|sdf|dfg|qwe|jkl|x+d|h+a+h+a+)[a-zğüşöçı]*$/i;
const ABSURD_RE = /(?<![\p{L}])(uzaylı|marslı|ejderha|zombi|müdür aslında robot|dünyayı ele geçir)(?![\p{L}])/iu;
const DURABLE_RE = /\b(benim adım|adım|ismim|yaşım|yaşındayım|mesleğim|işim|şehirde yaşıyorum|seviyorum|sevmiyorum|favorim|hedefim|amacım|üzerinde çalışıyorum|geliştiriyorum)\b/i;

const TOPIC_STOP_WORDS = new Set([
  "ama", "artık", "ben", "beni", "benim", "bir", "bize", "bizim", "bugün",
  "bunu", "dedi", "dedim", "değil", "diye", "evet", "falan", "gibi", "hayır",
  "için", "kanka", "lan", "mı", "mi", "mu", "mü", "nasıl", "neyse", "olan",
  "onu", "öyle", "sana", "sen", "şey", "yarın", "yok",
]);

function topicTokens(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLocaleLowerCase("tr-TR")
        .replace(/[^a-zçğıöşü0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !TOPIC_STOP_WORDS.has(token)),
    ),
  ).slice(0, 5);
}

/**
 * Canonical current-turn dialogue projection.
 *
 * Intent/discourse meaning comes only from SemanticEvent. The small text checks
 * below are non-competing epistemic/storage hints (uncertainty, noise,
 * absurdity, durable-memory candidacy and topic tokens). Historical turns may
 * still use the legacy analyzer until stored projections exist for them.
 */
export function projectSemanticEventToDialogueAnalysis(
  event: SemanticEvent,
): DialogueTurnAnalysis {
  const raw = String(event.raw || event.normalized || "").trim();
  const acts: DialogueTurnAnalysis["acts"] = [];
  const noise = !raw || NOISE_RE.test(raw) || KEYBOARD_MASH_RE.test(raw);
  const uncertain = UNCERTAINTY_RE.test(raw);
  const absurd = ABSURD_RE.test(raw);
  const durable = DURABLE_RE.test(raw) && !absurd && !noise;

  if (noise) acts.push("noise");
  if (event.discourseAct === "confusion_or_challenge") acts.push("confusion_or_challenge");
  if (event.discourseAct === "correction") acts.push("correction");
  if (event.discourseAct === "topic_shift") acts.push("topic_shift");
  if (uncertain) acts.push("uncertain");
  if (
    event.intent === "question" ||
    event.intent === "information_request" ||
    event.discourseAct === "recall_request"
  ) acts.push("question");
  if (event.intent === "banter" || absurd) acts.push("banter");
  if (!noise && !acts.includes("question")) acts.push("statement");

  let factConfidence = 0.72;
  if (durable) factConfidence = 0.9;
  if (event.discourseAct === "correction") factConfidence = Math.min(factConfidence, 0.76);
  if (uncertain) factConfidence = Math.min(factConfidence, 0.45);
  if (acts.includes("question")) factConfidence = Math.min(factConfidence, 0.3);
  if (acts.includes("banter")) factConfidence = Math.min(factConfidence, 0.38);
  if (absurd) factConfidence = 0.12;
  if (noise) factConfidence = 0.05;

  return {
    acts: Array.from(new Set(acts)),
    factConfidence,
    memoryScope: noise || absurd ? "session" : durable ? "durable_candidate" : "episodic",
    isLikelyAbsurd: absurd,
    topicTokens: topicTokens(raw),
  };
}
