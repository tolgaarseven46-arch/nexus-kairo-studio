export type LocalEmotionalIntent = "low_mood_opening";

const EXPLICIT_SUPPORT_REQUEST_RE =
  /\b(ne yapmalıyım|ne yapayım|yardım et|yardımcı ol|tavsiye|öneri|akıl ver)\b/i;

const LOW_MOOD_PATTERNS = [
  /\bmoral(?:im)?(?:\s+\S+){0,2}\s+(?:bozuk|kötü|yok)\b/i,
  /\b(?:hiç\s+)?havamda değilim\b/i,
  /\b(?:mod|mood)(?:um)?\s+(?:yok|düşük|bozuk)\b/i,
  /\bkafam\s+(?:bozuk|dağınık|çok dolu)\b/i,
  /\bcanım\s+sıkkın\b/i,
  /\bkeyfim\s+(?:yok|kaçık|yerinde değil)\b/i,
  /\b(?:iyi|pek iyi)\s+hissetmiyorum\b/i,
  /\b(?:üzgünüm|bunaldım|daraldım|çok stresliyim|ağlayacak gibiyim)\b/i,
  /\biçim\s+(?:daraldı|sıkılıyor)\b/i,
  /\bcanım\s+hiçbir\s+şey\s+istemiyor\b/i,
];

function normalizeEmotionalInput(message: string): string {
  return message
    .toLocaleLowerCase("tr-TR")
    .replace(/[’']/g, "")
    .replace(/\byo\b/g, "yok")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyLocalEmotionalIntent(
  message: string,
): LocalEmotionalIntent | null {
  const normalized = normalizeEmotionalInput(message);
  if (EXPLICIT_SUPPORT_REQUEST_RE.test(normalized)) return null;
  return LOW_MOOD_PATTERNS.some((pattern) => pattern.test(normalized))
    ? "low_mood_opening"
    : null;
}

export function isLocalEmotionalOpening(message: string): boolean {
  return classifyLocalEmotionalIntent(message) === "low_mood_opening";
}
