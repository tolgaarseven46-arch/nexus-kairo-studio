import type { SemanticInterpretation } from "../types/semanticInterpretation";
export interface ConversationTurn {
  sender?: string;
  text?: string;
  participantId?: string;
  participantName?: string;
  replyToParticipantId?: string;
  replyToParticipantName?: string;
  semanticInterpretation?: SemanticInterpretation;
  semanticSource?: string;
}

export function sanitizeKairoChatHistory<T extends ConversationTurn>(
  history: T[],
): T[] {
  if (!Array.isArray(history)) return [];
  const clean: T[] = [];
  for (const item of history) {
    const text = String(item?.text || "");
    if (item?.sender === "droit" && /^\[Hata\]:/i.test(text)) {
      if (clean.at(-1)?.sender === "user") clean.pop();
      continue;
    }
    const previous = clean.at(-1);
    if (
      item?.sender === "user" &&
      previous?.sender === "user" &&
      previous.participantId === item.participantId &&
      String(previous.text || "").trim() === text.trim()
    ) {
      clean[clean.length - 1] = item;
      continue;
    }
    clean.push(item);
  }
  return clean;
}

export function formatKairoHistoryForModel(
  history: ConversationTurn[],
  limit = 8,
) {
  return sanitizeKairoChatHistory(history)
    .slice(-limit)
    .map((turn) => ({
      role: turn.sender === "user" ? "user" : "assistant",
      content:
        turn.sender === "user"
          ? `[${turn.participantName || "Kullanıcı"}]: ${turn.text || ""}`
          : `[Kairo → ${turn.replyToParticipantName || "Kullanıcı"}]: ${turn.text || ""}`,
    }));
}

export function sanitizeKairoReplyText(reply: string): string {
  return String(reply || "")
    .replace(
      /^\s*(?:\[\s*Ka[iİıI]r[ao](?:\s*→\s*[^\]]+)?\s*\]|Ka[iİıI]r[ao](?:\s*→\s*[^:]+)?):\s*/iu,
      "",
    )
    .trim();
}

export function buildActiveParticipantInstruction(
  participantName: string,
  participantId: string,
) {
  return `AKTİF KONUŞAN: ${participantName} (${participantId}). Son mesaj bu kişiden geldi. Yanıtını ona ver; ortak sohbet geçmişindeki diğer kişilerin sözlerini bu kişiye ait sanma. "Ben/bana/benim" ifadelerini aktif konuşana bağla. Her kişinin ilişki ve kalıcı hafıza katmanı ayrıdır.`;
}

const UNCERTAINTY_RE =
  /\b(düşün(?:üyor(?:um|sun|lar)?|üyordu(?:m|n|k|lar)?|mekte|ebilir)|belki|galiba|sanırım|muhtemelen|olabilir|emin değil)\b/i;
const CERTAIN_FUTURE_RE =
  /\b[\p{L}]+(?:acak|ecek|acaktı|ecekti|acağını|eceğini)\b/iu;
const JUDGMENT_REQUEST_RE =
  /(?:^|\s)(sence|kim haklı|haklı mı|haklı mıyım|haksız mı|ne düşünüyorsun)(?:\s|[?!.]|$)/i;
const UNSOLICITED_VERDICT_RE =
  /(?:%\s*\d+[^.!?\n]{0,30}haklı(?![\p{L}])|(?<![\p{L}])(?:aşırı\s+)?haklı(?:ydın|sın|ydı|ydılar|dır)?(?![\p{L}])(?!\s+(?:dedin|dedi|demiş|diye))|(?<![\p{L}])haksız(?:dın|sın|dı|dır)?(?![\p{L}])(?!\s+(?:dedin|dedi|demiş|diye)))/iu;

function userEvidence(
  history: ConversationTurn[],
  userMessage: string,
): string[] {
  return [
    ...history
      .filter((turn) => turn?.sender === "user")
      .map((turn) => String(turn.text || "")),
    userMessage,
  ].filter(Boolean);
}

function meaningfulTokens(text: string): string[] {
  const stop = new Set([
    "bu",
    "şu",
    "bir",
    "ne",
    "neyi",
    "kim",
    "kime",
    "kimi",
    "mı",
    "mi",
    "mu",
    "mü",
    "ya",
    "dedi",
  ]);
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğıöşü0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stop.has(token));
}

function relevantUncertainEvidence(
  history: ConversationTurn[],
  userMessage: string,
): string[] {
  const queryTokens = meaningfulTokens(userMessage);
  return userEvidence(history, userMessage).filter((text) => {
    if (!UNCERTAINTY_RE.test(text)) return false;
    if (text === userMessage) return true;
    const evidenceTokens = meaningfulTokens(text);
    return queryTokens.some((token) => evidenceTokens.includes(token));
  });
}

export function buildKairoGroundingInstruction(
  history: ConversationTurn[],
  userMessage: string,
): string {
  const uncertainEvidence = relevantUncertainEvidence(
    history,
    userMessage,
  ).slice(-3);

  const evidenceBlock = uncertainEvidence.length
    ? `\nKESİNLİK KAYITLARI (ifadeyi aynen koru):\n${uncertainEvidence.map((text) => `- ${text}`).join("\n")}`
    : "";

  return `KONUŞMA GERÇEKLİĞİ KURALI:
- Kullanıcının \"düşünüyor\", \"olabilir\", \"belki\", \"galiba\" gibi belirsizliklerini kesin olaya dönüştürme. Niyet, ihtimal ve gerçekleşmiş olayı ayrı tut.
- Kullanıcı özellikle görüşünü sormadıysa ve yeterli olay bilgisi yoksa kimseyi haklı/haksız ilan etme; yüzdeyle haklılık uydurma. Kullanıcının kendi yargısını Kaira'nın yargısı gibi tekrarlama.
- \"Ben/bana\" kullanıcıyı, \"sen/sana\" Kaira'yı gösterir. Aktarılan konuşmalarda söyleyen, hedef ve üçüncü kişiyi karıştırma.${evidenceBlock}`;
}

export function findKairoGroundingIssues(
  reply: string,
  history: ConversationTurn[],
  userMessage: string,
): string[] {
  const issues: string[] = [];
  const evidence = relevantUncertainEvidence(history, userMessage).join("\n");

  if (
    UNCERTAINTY_RE.test(evidence) &&
    CERTAIN_FUTURE_RE.test(reply) &&
    !UNCERTAINTY_RE.test(reply)
  ) {
    issues.push(
      "Belirsiz/niyet bildiren bilgi kesin gelecek olayı gibi aktarıldı",
    );
  }

  if (
    !JUDGMENT_REQUEST_RE.test(userMessage) &&
    UNSOLICITED_VERDICT_RE.test(reply)
  ) {
    issues.push(
      "Yeterli kanıt veya açık görüş talebi olmadan haklı/haksız yargısı üretildi",
    );
  }

  return issues;
}
