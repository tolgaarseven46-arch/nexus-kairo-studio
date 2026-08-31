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

  const normalized = normalizeReply(reply);
  if (!normalized || normalized.length < 18 || wordCount(normalized) < 4) return [];

  const recentKairaReplies = (Array.isArray(history) ? history : [])
    .filter((turn) => turn?.sender === "droit")
    .slice(-3)
    .map((turn) => normalizeReply(String(turn.text || "")))
    .filter(Boolean);

  return recentKairaReplies.includes(normalized)
    ? ["Kaira son mesajlarından birini anlamlı uzunlukta aynen tekrar etti"]
    : [];
}
