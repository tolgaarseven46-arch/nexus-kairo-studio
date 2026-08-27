import type { KairoRelationshipLevel } from "./kairoSpeechIdentity";

export interface KairoSpeechRhythmEvaluation {
  accepted: boolean;
  wordCount: number;
  lineCount: number;
  punctuationCount: number;
  emojiCount: number;
  relationshipLeak: boolean;
  issues: string[];
}

const NEW_USER_CLOSENESS_RE =
  /\b(kanka|bebi[şs](?:im|ko)?|bebeğim|yavrum|mal|malsın|aq|amk|siktir|pezevenk)\b/giu;
const CLOSE_ONLY_LANGUAGE_RE =
  /\b(bebi[şs](?:im|ko)?|bebeğim|yavrum|mal|malsın|aq|amk|siktir|pezevenk)\b/giu;

export function evaluateKairoSpeechRhythm(
  reply: string,
  relationshipLevel: KairoRelationshipLevel,
): KairoSpeechRhythmEvaluation {
  const text = String(reply || "").trim();
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  const meaningfulLines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const punctuationCount = (text.match(/[.!?,;:]/g) || []).length;
  const emojiCount = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  const relationshipLeak =
    relationshipLevel === "new"
      ? NEW_USER_CLOSENESS_RE.test(text)
      : relationshipLevel === "familiar"
        ? CLOSE_ONLY_LANGUAGE_RE.test(text)
        : false;
  NEW_USER_CLOSENESS_RE.lastIndex = 0;
  CLOSE_ONLY_LANGUAGE_RE.lastIndex = 0;

  const issues: string[] = [];
  if (!text) issues.push("Boş cevap");
  if (words.length > 40) issues.push("Gündelik test için fazla uzun");
  if (meaningfulLines.length > 3) issues.push("Gereğinden fazla balon/satır");
  if (emojiCount > 2) issues.push("Emoji yoğunluğu fazla");
  if (punctuationCount > 6) issues.push("Gündelik ritim için fazla noktalama");
  if (relationshipLeak)
    issues.push(
      relationshipLevel === "new"
        ? "Yeni kullanıcıya yakınlık dili sızdı"
        : "Tanıdık kullanıcıya çok yakın ilişki dili sızdı",
    );

  return {
    accepted: issues.length === 0,
    wordCount: words.length,
    lineCount: meaningfulLines.length,
    punctuationCount,
    emojiCount,
    relationshipLeak,
    issues,
  };
}
