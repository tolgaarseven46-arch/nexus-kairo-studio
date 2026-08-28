import type { ConversationTurn } from "./kairoConversationGrounding";
import {
  analyzeDialogueTurn,
  buildDialogueClaimLedger,
  type DialogueClaim,
} from "./kairoDialogueChaosEngine";

export type DialogueMove =
  | "grounded_recall"
  | "invite_emotional_context"
  | "answer_or_clarify"
  | "acknowledge_correction"
  | "join_banter"
  | "follow_topic_shift"
  | "natural_reaction";

export interface DialogueDecisionPlan {
  move: DialogueMove;
  target?: string;
  allowFollowUpQuestion: boolean;
  allowSpeculation: boolean;
  maxSentences: number;
  maxWords?: number;
  hasSupportedTargetClaim: boolean;
  reason: string;
}

const RECALL_RE =
  /(ne yapacaktı|ne yapmayı düşünüyordu|az önce ne dedi|ne demişti|ne söylemişti|hatırlıyor musun|kim söylemişti)/i;
const SPECULATION_RE =
  /\b(büyük ihtimalle|muhtemelen|belki|herhalde|kafamdan|tahminim)\b/i;
const EMOTIONAL_OPENING_RE =
  /\b(moralim(?:\s+\S+){0,2}\s+(?:bozuk|kötü)|canım sıkkın|keyfim yok|üzgünüm|kötü hissediyorum|iyi hissetmiyorum|bunaldım|daraldım|çok stresliyim|ağlayacak gibiyim)\b/i;
const EXPLICIT_SUPPORT_REQUEST_RE =
  /\b(ne yapmalıyım|ne yapayım|yardım et|yardımcı ol|tavsiye|öneri|akıl ver)\b/i;
const EMOTIONAL_OVERCARE_RE =
  /\b(canım|bebeğim|bebiş|yavrum|geçmiş olsun|üzülme|yanındayım|buradayım|sarıl\w*|anlatmak ister misin|bugünlük salma hakkın)\b/i;
const UNSOLICITED_ADVICE_RE =
  /\b(bence|yapmalısın|denemelisin|iyi gelir|hakkın var)\b/i;

function containsName(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, "iu").test(text);
}

function dialogueParticipants(
  history: ConversationTurn[],
  userName: string,
): string[] {
  return Array.from(
    new Set([
      ...history.map((turn) => turn.participantName).filter(Boolean),
      userName,
    ]),
  ) as string[];
}

function recallTarget(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
): string | undefined {
  return dialogueParticipants(history, userName).find((name) =>
    containsName(userMessage, name),
  );
}

function supportedClaimsFor(
  claims: DialogueClaim[],
  target?: string,
): DialogueClaim[] {
  if (!target) return [];
  return claims.filter(
    (claim) =>
      claim.subject === target &&
      claim.status !== "denied" &&
      claim.status !== "absurd",
  );
}

function isFirstEmotionalOpening(
  history: ConversationTurn[],
  userMessage: string,
): boolean {
  if (
    !EMOTIONAL_OPENING_RE.test(userMessage) ||
    EXPLICIT_SUPPORT_REQUEST_RE.test(userMessage)
  ) {
    return false;
  }
  return !history
    .filter((turn) => turn.sender === "user")
    .slice(-4)
    .some((turn) => EMOTIONAL_OPENING_RE.test(String(turn.text || "")));
}

export function planDialogueResponse(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
): DialogueDecisionPlan {
  const analysis = analyzeDialogueTurn(userMessage);
  const target = recallTarget(history, userMessage, userName);
  const claims = buildDialogueClaimLedger(history, userMessage, userName);
  const supportedClaims = supportedClaimsFor(claims, target);

  if (RECALL_RE.test(userMessage)) {
    return {
      move: "grounded_recall",
      target,
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 2,
      hasSupportedTargetClaim: supportedClaims.length > 0,
      reason: supportedClaims.length
        ? "Sorulan kişi için kaynaklı bir kayıt var; yalnızca onu aktar."
        : "Sorulan kişi için etkin kayıt yok; reddedilmiş iddiayı canlandırmadan bilinmediğini söyle.",
    };
  }
  if (isFirstEmotionalOpening(history, userMessage)) {
    return {
      move: "invite_emotional_context",
      allowFollowUpQuestion: true,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 6,
      hasSupportedTargetClaim: false,
      reason:
        "İlk duygusal açılışta yalnızca kısa doğal merak göster. Sebep anlatılmadan teselli, tavsiye, lakap, espri veya fiziksel yakınlık üretme; ilişki seviyesini bu turda zorla sergileme.",
    };
  }
  if (analysis.acts.includes("correction")) {
    return {
      move: "acknowledge_correction",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 2,
      hasSupportedTargetClaim: false,
      reason:
        "Düzeltmeyi kabul et; eski iddiayı savunma veya yeni ayrıntı ekleme.",
    };
  }
  if (analysis.acts.includes("topic_shift")) {
    return {
      move: "follow_topic_shift",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 2,
      hasSupportedTargetClaim: false,
      reason:
        "Yeni konuya doğal biçimde geç; kapanan konuyu zorla geri getirme.",
    };
  }
  if (analysis.acts.includes("banter")) {
    return {
      move: "join_banter",
      allowFollowUpQuestion: false,
      allowSpeculation: true,
      maxSentences: 2,
      hasSupportedTargetClaim: false,
      reason: "Şakaya katılabilirsin; şakayı kalıcı gerçek veya plan yapma.",
    };
  }
  if (analysis.acts.includes("question")) {
    return {
      move: "answer_or_clarify",
      allowFollowUpQuestion: true,
      allowSpeculation: false,
      maxSentences: 3,
      hasSupportedTargetClaim: false,
      reason:
        "Önce soruya cevap ver; yalnızca gerçekten gerekli ise tek netleştirme sorusu sor.",
    };
  }
  return {
    move: "natural_reaction",
    allowFollowUpQuestion: false,
    allowSpeculation: false,
    maxSentences: 2,
    hasSupportedTargetClaim: false,
    reason:
      "Tek bir doğal sosyal tepki seç; yardımcı menüsü veya otomatik soru ekleme.",
  };
}

export function buildDialogueDecisionInstruction(
  plan: DialogueDecisionPlan,
): string {
  return `DİYALOG KARARI:
- Bu turdaki tek ana hareket: ${plan.move}
- Hedef kişi: ${plan.target || "aktif konuşan/genel sohbet"}
- Takip sorusu: ${plan.allowFollowUpQuestion ? "gerekiyorsa en fazla bir tane" : "yasak"}
- Desteksiz tahmin: ${plan.allowSpeculation ? "yalnızca açık şaka bağlamında" : "yasak"}
- Uzunluk bütçesi: en fazla ${plan.maxSentences} kısa cümle
- Kelime bütçesi: ${plan.maxWords ? `en fazla ${plan.maxWords} kelime` : "özel sınır yok"}
- Gerekçe: ${plan.reason}
Doğru cevabı verdikten sonra ikinci bir tahmin, seçenek listesi, yeni şaka veya otomatik soru ekleyerek cevabın mantığını BOZMA.`;
}

export function findDialogueDecisionIssues(
  reply: string,
  plan: DialogueDecisionPlan,
): string[] {
  const issues: string[] = [];
  if (!plan.allowFollowUpQuestion && /[?？]/.test(reply)) {
    issues.push("Diyalog kararı takip sorusunu yasakladığı halde soru eklendi");
  }
  if (!plan.allowSpeculation && SPECULATION_RE.test(reply)) {
    issues.push(
      "Diyalog kararı desteksiz tahmini yasakladığı halde tahmin eklendi",
    );
  }
  if (plan.move === "invite_emotional_context") {
    const wordCount = (reply.match(/[\p{L}\p{N}]+/gu) || []).length;
    if (wordCount > (plan.maxWords ?? 6)) {
      issues.push("İlk duygusal açılış cevabı 6 kelimeyi aştı");
    }
    if (EMOTIONAL_OVERCARE_RE.test(reply)) {
      issues.push(
        "İlk duygusal açılışta lakap, teselli kalıbı veya fiziksel yakınlık üretildi",
      );
    }
    if (UNSOLICITED_ADVICE_RE.test(reply)) {
      issues.push("Sebep anlatılmadan tavsiye veya izin cümlesi üretildi");
    }
    if (/\bkim\b/i.test(reply)) {
      issues.push("Moral bozukluğunun sebebi bir kişiymiş gibi varsayıldı");
    }
  }
  return issues;
}

const CLAIM_TOPICS = [
  { pattern: /\b(istifa|işten ayrıl|işi bırak)/i, label: "istifa" },
  { pattern: /\b(maaş|zam|ücret)/i, label: "maaş zammı" },
  { pattern: /\b(maç|maça)/i, label: "maç" },
] as const;

export function buildGroundedDialogueFallback(
  plan: DialogueDecisionPlan,
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
): string | null {
  if (plan.move === "invite_emotional_context") return "hmm niye";
  if (plan.move !== "grounded_recall" || !plan.target) return null;
  const claims = buildDialogueClaimLedger(history, userMessage, userName);
  const supported = supportedClaimsFor(claims, plan.target).at(-1);
  if (supported) {
    return supported.status === "uncertain"
      ? `${plan.target} hakkında “${supported.text}” denmişti ama bu kesin bir plan değildi.`
      : `${plan.target} hakkında elimizdeki kayıt şu: “${supported.text}”`;
  }

  const denied = [...claims]
    .reverse()
    .find(
      (claim) => claim.subject === plan.target && claim.status === "denied",
    );
  const deniedTopic = denied
    ? CLAIM_TOPICS.find((topic) => topic.pattern.test(denied.text))?.label
    : undefined;
  return deniedTopic
    ? `${plan.target} için yarına dair net bir plan yok. ${deniedTopic[0].toLocaleUpperCase("tr-TR")}${deniedTopic.slice(1)} iddiasını reddetti.`
    : `${plan.target} için yarına dair doğrulanmış bir plan yok.`;
}
