import type { ConversationTurn } from "./kairoConversationGrounding";
import { buildDialogueClaimLedger } from "./kairoDialogueChaosEngine";
import { effectivelySupportedClaims, type DialogueClaim } from "./claimProvenance";
import {
  interpretSemanticEvent,
  type SemanticEvent,
  type SemanticRepairSignal,
  type SemanticSocialRoutine,
} from "./semanticEventEngine";
import { projectSemanticEventToDialogueAnalysis } from "./kairaDialogueTurnProjection";
import type { DialogueTurnAnalysis } from "./kairoDialogueChaosEngine";
import type { DiscourseSocialAct, DiscourseState } from "../types/discourseState";
import { classifyKairaReplyAct } from "./discourseSocialAct";

export type DialogueMove =
  | "grounded_recall"
  | "invite_emotional_context"
  | "repair_or_rephrase"
  | "follow_previous_answer"
  | "answer_or_clarify"
  | "acknowledge_correction"
  | "join_banter"
  | "follow_topic_shift"
  | "complete_social_routine"
  | "natural_reaction";

export type DialogueObligationResolution =
  | "fulfill_now"
  | "clarify"
  | "decline_explicit"
  | "defer_explicit";

export interface DialogueObligation {
  type: "answer_or_clarify";
  satisfactionCriteria: {
    forbiddenResponseClasses: Array<"acknowledgement_only">;
    allowedResolutions: DialogueObligationResolution[];
  };
}

export interface DialogueDecisionPlan {
  move: DialogueMove;
  target?: string;
  socialRoutine?: SemanticSocialRoutine;
  repairSignal?: SemanticRepairSignal;
  /** Observed Kaira social act that must not be emitted again on this turn. */
  repeatGuard?: { act: DiscourseSocialAct; count: number };
  /**
   * DialogueDecision-owned fulfillment contract. Downstream validators may only
   * consume these criteria; they must not invent independent obligation rules.
   */
  obligation?: DialogueObligation;
  allowFollowUpQuestion: boolean;
  allowSpeculation: boolean;
  maxSentences: number;
  maxWords?: number;
  hasSupportedTargetClaim: boolean;
  reason: string;
}

export interface DialogueOutputStyle {
  emojiLevel?: number;
  emojiBudget?: number;
  userMessage?: string;
  allowQuestion?: boolean;
  maxSentences?: number;
  maxWords?: number;
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
const ASSISTANT_MENU_RE =
  /\b(istersen (?:yardımcı olabilirim|birlikte|şöyle yapabiliriz)|yardımcı olabilirim|başka bir konuda yardımcı|nasıl yardımcı olabilirim|şöyle yapalım|istersen anlat)\b/i;
const ARTIFICIAL_PERSONA_RE =
  /\b(cpu|işlemci|log(?:lar|larım)?|veri merkezi|sunucu(?:lar|larım)?|algoritma(?:m)?|kod(?:lar|larım)?|ram)\b/i;
const SOCIAL_ONLY_MOVES = new Set<DialogueDecisionPlan["move"]>([
  "natural_reaction",
  "join_banter",
  "follow_previous_answer",
  "invite_emotional_context",
  "acknowledge_correction",
  "repair_or_rephrase",
  "follow_topic_shift",
  "complete_social_routine",
]);
const PROCRASTINATION_BANTER_RE =
  /\b(son dakikaya bırak\w*|ertele\w*|geciktir\w*|üşen\w*|yapmayıp bekle\w*)\b/i;
const SHORT_CONTEXTUAL_ANSWER_RE =
  /^(?:hiç\s*biri|hiçbiri|ikisi\s+de|hepsi|hiçbiri\s+değil|yok|hayır|evet|aynen|tamam|tamamdır|peki|olur|olmadı|bilmiyorum|fark\s+etmez|sen\s+seç|öbürü|diğeri|ilki|ikincisi)(?:\s+(?:ya|işte|kanka))?[.!?…]*$/i;
const KAIRA_SHORT_ACK_RE = /^(?:tamam|tamamdır|peki|olur|evet|aynen|hmm|he|hee|anladım)[.!?…]*$/i;
const PREVIOUS_CONTEXT_INVITE_RE =
  /[?？]|\b(?:hangisi|hangisini|seç|mı|mi|mu|mü|ne dersin|sence|istersen|ister misin|ister miydin)\b/i;

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
  claims: DialogueClaim[] = [],
): string | undefined {
  const candidates = Array.from(
    new Set([
      ...dialogueParticipants(history, userName),
      ...claims.map((claim) => claim.subject),
    ]),
  );
  return candidates.find((name) => containsName(userMessage, name));
}

function supportedClaimsFor(
  claims: DialogueClaim[],
  target?: string,
): DialogueClaim[] {
  if (!target) return [];
  return effectivelySupportedClaims(claims).filter((claim) => claim.subject === target);
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

function isReciprocalSocialRoutine(event: SemanticEvent): boolean {
  return (
    event.socialRoutine === "how_are_you" ||
    event.socialRoutine === "what_doing"
  );
}

function hasImmediateKairaTurn(history: ConversationTurn[]): boolean {
  return history.at(-1)?.sender === "droit";
}

function isShortAnswerToPreviousKairaTurn(
  history: ConversationTurn[],
  userMessage: string,
): boolean {
  if (!SHORT_CONTEXTUAL_ANSWER_RE.test(userMessage.trim())) return false;
  const previous = history.at(-1);
  if (!previous || previous.sender !== "droit") return false;
  const previousText = String(previous.text || "");
  if (PREVIOUS_CONTEXT_INVITE_RE.test(previousText)) return true;

  // Keep a bounded acknowledgement chain attached to the last explicit prompt/offer.
  // Example: Kaira offers more recommendations -> user "tamam" -> Kaira "evet"
  // -> user "evet". The final "evet" must not become a fresh topic or inferred feeling.
  if (!KAIRA_SHORT_ACK_RE.test(previousText.trim())) return false;
  const previousUser = history.at(-2);
  const priorKaira = history.at(-3);
  return Boolean(
    previousUser?.sender === "user" &&
    SHORT_CONTEXTUAL_ANSWER_RE.test(String(previousUser.text || "").trim()) &&
    priorKaira?.sender === "droit" &&
    PREVIOUS_CONTEXT_INVITE_RE.test(String(priorKaira.text || ""))
  );
}

function planDialogueResponseBase(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
  semanticEvent?: SemanticEvent,
  currentAnalysis?: DialogueTurnAnalysis,
  discourse?: DiscourseState,
): DialogueDecisionPlan {
  const event = semanticEvent ?? interpretSemanticEvent(userMessage);
  const dialogueAnalysis = currentAnalysis ?? projectSemanticEventToDialogueAnalysis(event);
  const claims = buildDialogueClaimLedger(history, userMessage, userName, dialogueAnalysis);
  const target = recallTarget(history, userMessage, userName, claims);
  const supportedClaims = supportedClaimsFor(claims, target);

  if (
    discourse?.previousTurnDependency &&
    event.discourseAct !== "recall_request" &&
    event.intent !== "information_request" &&
    !event.adviceRequested
  ) {
    const dep = discourse.previousTurnDependency;
    if (dep.responseKind === "correction") {
      return {
        move: "acknowledge_correction",
        allowFollowUpQuestion: false,
        allowSpeculation: false,
        maxSentences: 1,
        maxWords: 8,
        hasSupportedTargetClaim: false,
        reason:
          "Kullanıcı Kaira'nın önceki turunu düzeltiyor. Düzeltmeyi kabul et; selamlama, yeni konu, savunma veya soru ekleme.",
      };
    }
    if (
      dep.responseKind === "clarification" &&
      (event.repairSignal ?? "none") !== "none"
    ) {
      return {
        move: "repair_or_rephrase",
        repairSignal: event.repairSignal ?? "none",
        allowFollowUpQuestion: false,
        allowSpeculation: false,
        maxSentences: 1,
        maxWords: 8,
        hasSupportedTargetClaim: false,
        reason:
          "Kullanıcı Kaira'nın önceki turunu anlamadı veya itiraz etti. Aynı fikri kısa ve net yeniden söyle; selamlama, yeni konu veya soru ekleme.",
      };
    }
    return {
      move: "follow_previous_answer",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 10,
      hasSupportedTargetClaim: false,
      reason:
        dep.responseKind === "answer_with_friction"
          ? "Kullanıcı Kaira'nın önceki sorusuna zaten cevap verdiğini söylüyor (hafif sitem). Bunu bir SELAMLAMA veya yeni konu sanma; kısaca durumu kabul et, gerekirse özür/şaka ile yumuşat, tekrar aynı soruyu sorma."
          : "Bu kısa mesaj Kaira'nın yakın önceki sorusuna/sözüne verilmiş cevaptır. Selamlama veya yeni konu açma; yalnızca doğrulanan şeyi bağla, yeni soru sorma.",
    };
  }

  if (event.socialRoutine === "greeting" && (discourse?.routines.greeting.count ?? 0) >= 2) {
    return {
      move: "natural_reaction",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 10,
      hasSupportedTargetClaim: false,
      reason:
        "Selamlaşma bu sohbette zaten yapıldı. Yeni bir 'selam/merhaba' verme; kullanıcının bunu dile getirdiğini fark et ve sohbeti ilerletecek kısa doğal bir şey söyle.",
    };
  }
  if (
    isReciprocalSocialRoutine(event) &&
    ((event.socialRoutine === "how_are_you" && (discourse?.routines.howAreYou.count ?? 0) >= 2) ||
      (event.socialRoutine === "what_doing" && (discourse?.routines.whatDoing.count ?? 0) >= 2))
  ) {
    return {
      move: "natural_reaction",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 10,
      hasSupportedTargetClaim: false,
      reason:
        "Bu karşılıklı rutin (nasılsın/napıyorsun) bu sohbette zaten yapıldı. Kısa cevap ver ama tekrar 'sen nasılsın / sen napıyorsun' diye SORMA.",
    };
  }

  if ((event.repairSignal ?? "none") !== "none" && hasImmediateKairaTurn(history)) {
    const repairSignal = event.repairSignal ?? "none";
    const reason =
      repairSignal === "clarification_request"
        ? "Kullanıcı Kaira'nın hemen önceki mesajını anlamadı. Aynı fikri daha açık, kısa ve doğal biçimde yeniden söyle; yeni iddia, yeni konu veya soru ekleme."
        : repairSignal === "relevance_challenge"
          ? "Kullanıcı Kaira'nın hemen önceki mesajının alakasına veya doğrultusuna itiraz etti. Gereksiz bağlantıyı geri çek veya yalnızca ilgili kısmı düzelt; kendini savunma, yeni konu açma ve soru sorma."
          : "Kullanıcı Kaira'nın hemen önceki mesajı için onarım başlattı. Önceki fikri kısa ve doğal biçimde düzelt veya yeniden söyle; kendini savunma, yeni konu açma ve soru sorma.";
    return {
      move: "repair_or_rephrase",
      repairSignal,
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 8,
      hasSupportedTargetClaim: false,
      reason,
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
        "Bu kısa mesaj bağımsız bir konu değil, Kaira'nın yakın önceki sorusuna, teklifine veya seçeneklerine verilen cevaptır. Yalnızca açıkça doğrulanan şeyi bağla; beğeni, duygu, sebep, tercih veya yeni konu uydurma ve yeni soru açma.",
    };
  }

  if (isReciprocalSocialRoutine(event)) {
    return {
      move: "natural_reaction",
      allowFollowUpQuestion: true,
      allowSpeculation: false,
      maxSentences: 2,
      maxWords: 10,
      hasSupportedTargetClaim: false,
      reason:
        "Kullanıcı Kaira'nın halini veya ne yaptığını doğrudan soruyor. Kısa cevap ver; doğal karşılıklılık için en fazla bir kısa 'sen?' / 'senden naber?' sorusu sorabilirsin.",
    };
  }

  if (
    event.socialRoutine === "greeting" ||
    event.socialRoutine === "thanks" ||
    event.socialRoutine === "agreement" ||
    event.socialRoutine === "goodbye" ||
    event.socialRoutine === "good_night"
  ) {
    return {
      move: "complete_social_routine",
      socialRoutine: event.socialRoutine,
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 8,
      hasSupportedTargetClaim: false,
      reason:
        "Kanonik sosyal rutini aynı sosyal işlevle kısa biçimde tamamla. Yeni konu, açıklama, tahmin veya otomatik soru açma.",
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
  // A typed advice request is a user-facing conversational obligation. A
// simultaneous topic-shift facet describes the transition, but cannot erase
// the request. Keep recall/correction/repair authorities above this seam;
// otherwise advice owns the move and receives the normal answer obligation.
if (event.adviceRequested) {
  return {
    move: "answer_or_clarify",
    allowFollowUpQuestion: true,
    allowSpeculation: false,
    maxSentences: 3,
    hasSupportedTargetClaim: false,
    reason:
      "Kullanıcı açıkça görüş/tavsiye istiyor. Konu değişimi sinyali bu cevap yükümlülüğünü silemez; önce isteği yanıtla, yalnız gerçekten gerekli ise tek netleştirme sorusu sor.",
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

function applyRepetitionPolicy(
  plan: DialogueDecisionPlan,
  discourse?: DiscourseState,
): DialogueDecisionPlan {
  const repeated = discourse?.selfRepeat;
  if (!repeated || repeated.act === "farewell") return plan;
  return {
    ...plan,
    repeatGuard: { act: repeated.act, count: repeated.count },
    reason:
      `${plan.reason} Kaira son turlarda "${repeated.act}" sosyal işini ${repeated.count} kez yaptı; bu tur aynı sosyal işi tekrar üretme. Mevcut semantik hareketi koru, yalnız tekrar eden yüzeyi değiştir.`,
  };
}

function attachDecisionOwnedObligation(plan: DialogueDecisionPlan): DialogueDecisionPlan {
  if (plan.move !== "answer_or_clarify") return plan;
  return {
    ...plan,
    obligation: {
      type: "answer_or_clarify",
      satisfactionCriteria: {
        forbiddenResponseClasses: ["acknowledgement_only"],
        allowedResolutions: [
          "fulfill_now",
          "clarify",
          "decline_explicit",
          "defer_explicit",
        ],
      },
    },
  };
}

export function planDialogueResponse(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
  semanticEvent?: SemanticEvent,
  currentAnalysis?: DialogueTurnAnalysis,
  discourse?: DiscourseState,
): DialogueDecisionPlan {
  const event = semanticEvent ?? interpretSemanticEvent(userMessage);
  const basePlan = planDialogueResponseBase(
    history,
    userMessage,
    userName,
    event,
    currentAnalysis,
    discourse,
  );
  return applyRepetitionPolicy(attachDecisionOwnedObligation(basePlan), discourse);
}

export function buildDialogueDecisionInstruction(
  plan: DialogueDecisionPlan,
  effectiveAllowQuestion = plan.allowFollowUpQuestion,
  effectiveMaxSentences = plan.maxSentences,
  effectiveMaxWords = plan.maxWords,
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
- Uzunluk bütçesi: en fazla ${effectiveMaxSentences} kısa cümle
- Kelime bütçesi: ${effectiveMaxWords ? `en fazla ${effectiveMaxWords} kelime` : "özel sınır yok"}
- Tekrar koruması: ${plan.repeatGuard ? `"${plan.repeatGuard.act}" sosyal işini yeniden üretme` : "yok"}
- Obligation: ${plan.obligation ? `${plan.obligation.type}; yalnız acknowledgement ile kapanamaz` : "yok"}
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
  const emojiBudget = style?.emojiBudget ?? (
    plan.move === "join_banter"
      ? 0
      : style?.emojiLevel === undefined
        ? 1
        : style.emojiLevel >= 15
          ? 1
          : 0
  );
  const effectiveMaxSentences = style?.maxSentences ?? plan.maxSentences;
  const effectiveMaxWords = style?.maxWords ?? plan.maxWords;
  if (
    plan.obligation?.satisfactionCriteria.forbiddenResponseClasses.includes("acknowledgement_only") &&
    KAIRA_SHORT_ACK_RE.test(reply.trim())
  ) {
    issues.push(
      "DialogueDecision obligation karşılanmadı: answer_or_clarify yalnız acknowledgement ile kapatılamaz",
    );
  }
  if (plan.repeatGuard && classifyKairaReplyAct(reply) === plan.repeatGuard.act) {
    issues.push(`Kaira son turlarda tekrarladığı "${plan.repeatGuard.act}" sosyal işini yeniden üretti`);
  }
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
  if (SOCIAL_ONLY_MOVES.has(plan.move) && ASSISTANT_MENU_RE.test(reply)) {
    issues.push("Sosyal sohbet hamlesi robotik yardımcı/menü kalıbına döndü");
  }
  if (
    SOCIAL_ONLY_MOVES.has(plan.move) &&
    ARTIFICIAL_PERSONA_RE.test(reply) &&
    !ARTIFICIAL_PERSONA_RE.test(style?.userMessage || "")
  ) {
    issues.push("Kullanıcının açmadığı yapay persona/altyapı gösterisi eklendi");
  }
  if (responseUnitCount(reply) > effectiveMaxSentences) {
    issues.push(
      `Diyalog kararı ${effectiveMaxSentences} kısa cümle sınırını aştı`,
    );
  }
  if (effectiveMaxWords && wordCount > effectiveMaxWords) {
    issues.push(`Diyalog kararı ${effectiveMaxWords} kelime sınırını aştı`);
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
  if (plan.move === "repair_or_rephrase") {
    if (plan.repairSignal === "clarification_request") return "biraz karışık anlattım";
    if (plan.repairSignal === "relevance_challenge") return "he alakasız oldu";
    return "biraz saçmaladım galiba";
  }
  if (plan.move === "complete_social_routine") {
    if (plan.socialRoutine === "greeting")
      return plan.repeatGuard?.act === "greeting" ? "burdayım" : "selam";
    if (plan.socialRoutine === "thanks") return "rica ederim";
    if (plan.socialRoutine === "agreement")
      return plan.repeatGuard?.act === "agreement_ack" ? "devam edelim" : "aynen";
    if (plan.socialRoutine === "goodbye") return "görüşürüz";
    if (plan.socialRoutine === "good_night") return "iyi geceler";
    return "tamam";
  }
  if (plan.move === "follow_previous_answer") return "he tamam o zaman";
  if (plan.move === "acknowledge_correction") return "he doğru";
  if (plan.move === "natural_reaction")
    return plan.repeatGuard?.act === "agreement_ack" ? "devam edelim" : "he anladım";
  if (plan.move === "follow_topic_shift") return "he tamam";
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
      ? `${plan.target} hakkında “${supported.proposition}” denmişti ama bu kesin bir plan değildi.`
      : `${plan.target} hakkında elimizdeki kayıt şu: “${supported.proposition}”`;
  }

  const denied = [...claims]
    .reverse()
    .find(
      (claim) => claim.subject === plan.target && claim.status === "denial",
    );
  const deniedTopic = denied
    ? CLAIM_TOPICS.find((topic) => topic.pattern.test(denied.proposition))?.label
    : undefined;
  return deniedTopic
    ? `${plan.target} için yarına dair net bir plan yok. ${deniedTopic[0].toLocaleUpperCase("tr-TR")}${deniedTopic.slice(1)} iddiasını reddetti.`
    : `${plan.target} için yarına dair doğrulanmış bir plan yok.`;
}
