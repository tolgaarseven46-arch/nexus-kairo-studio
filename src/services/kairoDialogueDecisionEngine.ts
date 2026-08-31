import type { ConversationTurn } from "./kairoConversationGrounding";
import {
  buildDialogueClaimLedger,
  type DialogueClaim,
} from "./kairoDialogueChaosEngine";
import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";
import { projectSemanticEventToDialogueAnalysis } from "./kairaDialogueTurnProjection";
import type { DialogueTurnAnalysis } from "./kairoDialogueChaosEngine";

export type DialogueMove =
  | "grounded_recall"
  | "invite_emotional_context"
  | "repair_or_rephrase"
  | "follow_previous_answer"
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

export interface DialogueOutputStyle {
  emojiLevel?: number;
  userMessage?: string;
  allowQuestion?: boolean;
}

const SPECULATION_RE =
  /\b(büyük ihtimalle|muhtemelen|belki|herhalde|kafamdan|tahminim)\b/i;
const EMOTIONAL_OVERCARE_RE =
  /\b(canım|bebeğim|bebiş|yavrum|geçmiş olsun|üzülme|yanındayım|buradayım|sarıl\w*|anlatmak ister misin|bugünlük salma hakkın)\b/i;
const UNSOLICITED_ADVICE_RE =
  /\b(bence|yapmalısın|denemelisin|iyi gelir|hakkın var)\b/i;
const MINIMAL_EMOTIONAL_CURIOSITY_RE =
  /^(?:(?:hmm|off)\s+)?(?:niye|neden|ne oldu|noldu|hayırdır)(?:\s+ya)?[?…]*$/i;
const MINIMAL_EMOTIONAL_ACK_RE = /^(?:hmm|anladım|hee)[.!…]*$/i;
const CANNED_BANTER_RE =
  /\b(speedrun|full kaos|plot twist|achievement|level atla\w*|npc|boss fight|main character|challenge accepted)\b/i;
const PROCRASTINATION_BANTER_RE =
  /\b(son dakikaya bırak\w*|ertele\w*|geciktir\w*|üşen\w*|yapmayıp bekle\w*)\b/i;
const SHORT_CONTEXTUAL_ANSWER_RE =
  /^(?:hiç\s*biri|hiçbiri|ikisi\s+de|hepsi|hiçbiri\s+değil|yok|hayır|evet|aynen|olmadı|bilmiyorum|fark\s+etmez|sen\s+seç|öbürü|diğeri|ilki|ikincisi)(?:\s+(?:ya|işte|kanka))?[.!?…]*$/i;
const PREVIOUS_PROMPT_RE =
  /[?？]|\b(?:hangisi|hangisini|seç|mı|mi|mu|mü|ne dersin|sence)\b/i;

function responseUnitCount(reply: string): number {
  return reply
    .trim()
    .split(/\n+|(?<=[.!?…])\s+/u)
    .filter((part) => part.trim()).length;
}

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
  event: SemanticEvent,
): boolean {
  const currentIsOpening = event.socialRoutine === "emotional_opening" || event.intent === "emotional_share";
  if (!currentIsOpening) return false;
  return !history
    .filter((turn) => turn.sender === "user")
    .slice(-4)
    .some((turn) => {
      const previous = interpretSemanticEvent(String(turn.text || ""));
      return previous.socialRoutine === "emotional_opening" || previous.intent === "emotional_share";
    });
}

function isShortAnswerToPreviousKairaTurn(
  history: ConversationTurn[],
  userMessage: string,
): boolean {
  const previous = history.at(-1);
  if (!previous || previous.sender !== "droit") return false;
  const previousText = String(previous.text || "");
  return (
    PREVIOUS_PROMPT_RE.test(previousText) &&
    SHORT_CONTEXTUAL_ANSWER_RE.test(userMessage.trim())
  );
}

export function planDialogueResponse(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
  semanticEvent?: SemanticEvent,
  currentAnalysis?: DialogueTurnAnalysis,
): DialogueDecisionPlan {
  const event = semanticEvent ?? interpretSemanticEvent(userMessage);
  const dialogueAnalysis = currentAnalysis ?? projectSemanticEventToDialogueAnalysis(event);
  const target = recallTarget(history, userMessage, userName);
  const claims = buildDialogueClaimLedger(history, userMessage, userName, dialogueAnalysis);
  const supportedClaims = supportedClaimsFor(claims, target);

  if (event.discourseAct === "confusion_or_challenge") {
    return {
      move: "repair_or_rephrase",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 8,
      hasSupportedTargetClaim: false,
      reason:
        "Kullanıcı Kaira'nın önceki mesajını anlamadı veya ona itiraz etti. Önceki fikri kısa ve daha doğal biçimde yeniden söyle ya da gereksiz kısmı geri çek; kendini savunma, yeni konu açma ve soru sorma.",
    };
  }
  if (isShortAnswerToPreviousKairaTurn(history, userMessage)) {
    return {
      move: "follow_previous_answer",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 8,
      hasSupportedTargetClaim: false,
      reason:
        "Bu kısa mesaj bağımsız bir konu değil, Kaira'nın hemen önceki sorusuna veya seçeneklerine verilen cevaptır. Yalnızca o cevaba bağlan; yeni duygu, sebep veya konu uydurma.",
    };
  }

  if (event.discourseAct === "recall_request") {
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
  if (isFirstEmotionalOpening(history, event) && !event.adviceRequested) {
    return {
      move: "invite_emotional_context",
      allowFollowUpQuestion: true,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 4,
      hasSupportedTargetClaim: false,
      reason:
        "İlk duygusal açılışta yalnızca tek kısa merak tepkisi üret: hmm niye, ne oldu, niye ya veya hayırdır ritmi. İkinci açıklama, metafor ya da yeniden ifade ekleme. Sebep anlatılmadan teselli, tavsiye, lakap, espri veya fiziksel yakınlık üretme; ilişki seviyesini bu turda zorla sergileme.",
    };
  }
  if (event.discourseAct === "correction") {
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
  if (event.discourseAct === "topic_shift") {
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
  if (event.intent === "banter") {
    return {
      move: "join_banter",
      allowFollowUpQuestion: false,
      allowSpeculation: true,
      maxSentences: 1,
      maxWords: 7,
      hasSupportedTargetClaim: false,
      reason:
        "Kullanıcının kendi şakasına yalnızca tek kısa gündelik tepkiyle katıl. Yeni internet esprisi, oyun metaforu, seçenek sorusu veya emoji ekleme; şakayı kalıcı gerçek ya da plan yapma.",
    };
  }
  if (event.intent === "question" || event.intent === "information_request") {
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
  effectiveAllowQuestion = plan.allowFollowUpQuestion,
): string {
  const effectiveReason =
    plan.move === "invite_emotional_context" && !effectiveAllowQuestion
      ? "İlk duygusal açılışta soru sorma; yalnızca tek kısa kabul tepkisi üret: hmm, anladım veya hee. Teselli, tavsiye, lakap, espri, fiziksel yakınlık veya yeni sosyal anlam ekleme."
      : plan.reason;
  return `DİYALOG KARARI:
- Bu turdaki tek ana hareket: ${plan.move}
- Hedef kişi: ${plan.target || "aktif konuşan/genel sohbet"}
- Takip sorusu: ${effectiveAllowQuestion ? "gerekiyorsa en fazla bir tane" : "yasak"}
- Desteksiz tahmin: ${plan.allowSpeculation ? "yalnızca açık şaka bağlamında" : "yasak"}
- Uzunluk bütçesi: en fazla ${plan.maxSentences} kısa cümle
- Kelime bütçesi: ${plan.maxWords ? `en fazla ${plan.maxWords} kelime` : "özel sınır yok"}
- Gerekçe: ${effectiveReason}
Doğru cevabı verdikten sonra ikinci bir tahmin, seçenek listesi, yeni şaka veya otomatik soru ekleyerek cevabın mantığını BOZMA.`;
}

export function findDialogueDecisionIssues(
  reply: string,
  plan: DialogueDecisionPlan,
  style?: DialogueOutputStyle,
): string[] {
  const issues: string[] = [];
  const wordCount = (reply.match(/[\p{L}\p{N}]+/gu) || []).length;
  const emojiCount = (reply.match(/\p{Extended_Pictographic}/gu) || []).length;
  const effectiveAllowQuestion = style?.allowQuestion ?? plan.allowFollowUpQuestion;
  const emojiBudget =
    plan.move === "join_banter"
      ? 0
      : style?.emojiLevel === undefined
        ? 1
        : style.emojiLevel >= 15
          ? 1
          : 0;
  if (emojiCount > emojiBudget) {
    issues.push(
      `Konuşma kimliği bu turda en fazla ${emojiBudget} emojiye izin veriyor`,
    );
  }
  if (
    CANNED_BANTER_RE.test(reply) &&
    !CANNED_BANTER_RE.test(style?.userMessage || "")
  ) {
    issues.push(
      "Kullanıcının başlatmadığı hazır internet esprisi veya oyun metaforu eklendi",
    );
  }
  if (responseUnitCount(reply) > plan.maxSentences) {
    issues.push(
      `Diyalog kararı ${plan.maxSentences} kısa cümle sınırını aştı`,
    );
  }
  if (plan.maxWords && wordCount > plan.maxWords) {
    issues.push(`Diyalog kararı ${plan.maxWords} kelime sınırını aştı`);
  }
  if (!effectiveAllowQuestion && /[?？]/.test(reply)) {
    issues.push("Diyalog kararı takip sorusunu yasakladığı halde soru eklendi");
  }
  if (!plan.allowSpeculation && SPECULATION_RE.test(reply)) {
    issues.push(
      "Diyalog kararı desteksiz tahmini yasakladığı halde tahmin eklendi",
    );
  }
  if (plan.move === "invite_emotional_context") {
    const matchesExpectedOpening = effectiveAllowQuestion
      ? MINIMAL_EMOTIONAL_CURIOSITY_RE.test(reply.trim())
      : MINIMAL_EMOTIONAL_ACK_RE.test(reply.trim());
    if (!matchesExpectedOpening) {
      issues.push(
        effectiveAllowQuestion
          ? "İlk duygusal açılış tek kısa merak tepkisinin dışına çıktı"
          : "İlk duygusal açılış soru kapalıyken tek kısa kabul tepkisinin dışına çıktı",
      );
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
  currentAnalysis?: DialogueTurnAnalysis,
  effectiveAllowQuestion = plan.allowFollowUpQuestion,
): string | null {
  if (plan.move === "invite_emotional_context") {
    return effectiveAllowQuestion ? "hmm niye" : "hmm";
  }
  if (plan.move === "repair_or_rephrase") return "biraz saçmaladım galiba";
  if (plan.move === "follow_previous_answer") return "he tamam o zaman";
  if (plan.move === "join_banter") {
    return PROCRASTINATION_BANTER_RE.test(userMessage)
      ? "yine şaşırtmadın hahah"
      : "hahah iyiymiş";
  }
  if (plan.move !== "grounded_recall" || !plan.target) return null;
  const claims = buildDialogueClaimLedger(history, userMessage, userName, currentAnalysis);
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
