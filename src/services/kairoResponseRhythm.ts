import type { ConversationTurn } from "./kairoConversationGrounding";

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
): string[] {
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
