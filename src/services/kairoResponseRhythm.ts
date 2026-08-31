import type { ConversationTurn } from "./kairoConversationGrounding";
import type { DialogueMove } from "./kairoDialogueDecisionEngine";

const RHYTHM_SENSITIVE_MOVES = new Set<DialogueMove>([
  "natural_reaction",
  "join_banter",
  "follow_previous_answer",
  "invite_emotional_context",
  "acknowledge_correction",
  "repair_or_rephrase",
  "follow_topic_shift",
]);

const GENERIC_ASSISTANT_DRIFT_RE = /\b(?:elbette|memnuniyetle|size yardımcı|yardımcı olmaktan memnun|nasıl yardımcı olabilirim|başka bir konuda yardımcı|bu konuda size|dilerseniz|arzu ederseniz|özetlemek gerekirse|sonuç olarak|bu bağlamda)\b/iu;
const SOCIAL_LIST_DRIFT_RE = /(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+/u;

function normalizeReply(text: string): string {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğıöşü0-9\s]/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  return normalizeReply(text).split(/\s+/u).filter(Boolean).length;
}

export function findKairoResponseRhythmIssues(
  reply: string,
  history: ConversationTurn[],
  move?: DialogueMove,
): string[] {
  if (move && !RHYTHM_SENSITIVE_MOVES.has(move)) return [];

  const issues: string[] = [];
  const raw = String(reply || "").trim();
  const normalized = normalizeReply(raw);

  if (GENERIC_ASSISTANT_DRIFT_RE.test(raw)) {
    issues.push("Kaira sosyal cevapta generic/formal asistan diline kaydı");
  }
  GENERIC_ASSISTANT_DRIFT_RE.lastIndex = 0;

  if (SOCIAL_LIST_DRIFT_RE.test(raw)) {
    issues.push("Kaira doğal sosyal tepkiyi liste/rapor formatına çevirdi");
  }
  SOCIAL_LIST_DRIFT_RE.lastIndex = 0;

  if (!normalized || normalized.length < 18 || wordCount(normalized) < 4) return issues;

  const recentKairaReplies = (Array.isArray(history) ? history : [])
    .filter((turn) => turn?.sender === "droit")
    .slice(-3)
    .map((turn) => normalizeReply(String(turn.text || "")))
    .filter(Boolean);

  if (recentKairaReplies.includes(normalized)) {
    issues.push("Kaira son mesajlarından birini anlamlı uzunlukta aynen tekrar etti");
  }

  return issues;
}
