import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import type { KairaPlanProjections, KairaPlanUncertainty } from "../types/kairaBehaviorPlan";
import { deriveHardConstraints } from "./kairaHardConstraints";
import { deriveSoftTendencies } from "./kairaSoftTendencies";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";

export interface KairaResponsePlan {
  move: DialogueDecisionPlan["move"];
  stance: BehaviorContract["stance"];
  register: KairoSpeechIdentity["register"];
  relationshipLevel: KairoSpeechIdentity["relationshipLevel"];
  continueConversation: boolean;
  allowQuestion: boolean;
  allowHumor: boolean;
  allowAffection: boolean;
  allowForgiveness: boolean;
  allowReopeningCloseness: boolean;
  maxSentences: number;
  maxWords: number;
  emojiBudget: number;
  reasons: string[];
  /** Canonical resolver marker. Optional only for old persisted/test projections. */
  resolver?: "canonical";
  flirtationAllowed?: boolean;
  counterFlirtAllowed?: boolean;
  opennessAxis?: number;
  warmthAxis?: number;
  guardedness?: number;
  intimacyCeiling?: number;
  requiredContent?: string[];
  hardReasons?: string[];
  uncertainty?: KairaPlanUncertainty;
  projections?: KairaPlanProjections;
}

const countEmoji = (text: string) =>
  Array.from(text.matchAll(/\p{Extended_Pictographic}/gu)).length;

const responseUnitCount = (reply: string) =>
  reply
    .trim()
    .split(/\n+|(?<=[.!?…])\s+/u)
    .filter((part) => part.trim()).length;

const wordCount = (reply: string) =>
  reply.trim().split(/\s+/u).filter(Boolean).length;

const QUESTION_PUNCTUATION_RE = /[?？]/u;
const DIRECT_INTERROGATIVE_START_RE =
  /^\s*(?:neden|niye|kim|kime|kimi|hangi|hangisi|nerede|neresi|nereye|nereden|kaç)(?![\p{L}\p{N}_])/iu;
const EMBEDDED_DIRECT_INTERROGATIVE_RE =
  /(?:[,.!…;:]\s*|(?<![\p{L}\p{N}_])(?:peki|tamam|güzel|iyi|ee|e|hmm|hımm|ya)\s+)(?:neden|niye|kim|kime|kimi|hangi|hangisi|nerede|neresi|nereye|nereden|kaç)(?![\p{L}\p{N}_])/iu;
const DIRECT_SOCIAL_QUESTION_RE =
  /(?<![\p{L}\p{N}_])(?:nas[ıi]ls[ıi]n|senden\s+naber|sen\s+naber|ne\s+yap[ıi]yorsun|nap[ıi]yorsun|nap[ıi]yon|iyi\s+misin)(?![\p{L}\p{N}_])/iu;
const QUESTION_CLITIC_RE =
  /(?<![\p{L}\p{N}_])(?:m[ıiuü]|misin|m[ıi]s[ıi]n|musun|m[üu]s[üu]n|m[ıi]y[ıi]m|muyum|m[üu]y[üu]m|m[ıi]yd[ıi]|m[ıi]yd[ıi]n|m[ıi]yd[ıi]k|m[ıi]yd[ıi]lar)(?![\p{L}\p{N}_])/iu;
const REPORTED_QUESTION_RE =
  /\b(?:nas[ıi]ls[ıi]n|ne\s+yap[ıi]yorsun|nap[ıi]yorsun|iyi\s+misin)\b.{0,40}\b(?:diye\s+(?:sordu|dedi)|sorduğunu|dediğini)\b/iu;

export function looksLikeKairaQuestionAct(text: string): boolean {
  if (QUESTION_PUNCTUATION_RE.test(text)) return true;
  if (REPORTED_QUESTION_RE.test(text)) return false;
  return (
    DIRECT_INTERROGATIVE_START_RE.test(text) ||
    EMBEDDED_DIRECT_INTERROGATIVE_RE.test(text) ||
    DIRECT_SOCIAL_QUESTION_RE.test(text) ||
    QUESTION_CLITIC_RE.test(text)
  );
}

const HUMOR_RE = /(hahaha|hehe|şaka|takılıyorum|dalga|😂|🤣|😏)/iu;
const AFFECTION_RE = /(öp|öpüc|sarıl|kucağ|dudak|bebeğim|aşkım|tatlım|sevgilim)/iu;
const FORGIVENESS_RE = /(geçti gitti|sorun yok|affettim|tamamen geçti|kapandı gitti)/iu;
const COUNTER_FLIRT_RE =
  /(seninle çık(ar|mak|alım)|benimle çık|randevu(ya çıkalım| ver, teklifini kabul)?|ben de senden hoşlan|ben de sana (aşığ|âşığ|vurgun)|senden hoşlanıyorum|sana aşık oldum|sana âşık oldum|beni öp|öpüşelim|öpelim mi|seni de öpmek|sevgilim ol|sende bende|flört edelim|flort edelim|ben de flört|seni arzuluyorum|seni istiyorum canım|kalbimi çaldın|😘|😍|🥰|😗|😙|😚|💋|❤️‍🔥)/iu;
const REOPEN_RE = /(hadi\s+(?:konuş|devam)|konuşalım|devam edelim|eski halimize|normale dön|barıştık|kaldığımız yerden)/iu;

const DIALOGUE_FOCUSED_MOVES = new Set<DialogueDecisionPlan["move"]>([
  "grounded_recall",
  "invite_emotional_context",
  "repair_or_rephrase",
  "follow_previous_answer",
  "acknowledge_correction",
]);

/**
 * ADR-0006 PR5: PlanResolver is the sole behavior-plan authority.
 * Legacy field names remain as the public projection consumed downstream, but
 * their values are always populated from the resolved canonical snapshot.
 */
export function buildKairaResponsePlan(
  contract: BehaviorContract,
  dialogue: DialogueDecisionPlan,
  speech: KairoSpeechIdentity,
): KairaResponsePlan {
  const continueConversation = contract.continueConversation;
  const allowQuestion =
    continueConversation &&
    contract.questions === "allowed" &&
    dialogue.allowFollowUpQuestion;
  const dialogueFocused = DIALOGUE_FOCUSED_MOVES.has(dialogue.move);
  const allowHumor =
    continueConversation &&
    contract.playfulness === "allowed" &&
    !dialogueFocused;
  const allowAffection =
    continueConversation &&
    contract.affection === "allowed" &&
    !dialogueFocused;
  const allowForgiveness = contract.forgivenessGranted && !dialogueFocused;
  const allowReopeningCloseness =
    continueConversation &&
    contract.reopeningCloseness === "allowed" &&
    !dialogueFocused;
  const contractSentenceBudget = contract.maxResponseLength === "short" ? 1 : 2;
  const maxSentences = Math.max(1, Math.min(dialogue.maxSentences, contractSentenceBudget));
  const maxWords = Math.max(
    1,
    Math.min(
      dialogue.maxWords ?? (contract.maxResponseLength === "short" ? 14 : 32),
      contract.maxResponseLength === "short" ? 14 : 32,
    ),
  );
  const dialogueEmojiBlocked = dialogueFocused || dialogue.move === "join_banter";
  const emojiBudget =
    continueConversation &&
    !dialogueEmojiBlocked &&
    speech.emojiLevel > 0 &&
    contract.stance === "open"
      ? 1
      : 0;

  const basePlan: KairaResponsePlan = {
    move: dialogue.move,
    stance: contract.stance,
    register: speech.register,
    relationshipLevel: speech.relationshipLevel,
    continueConversation,
    allowQuestion,
    allowHumor,
    allowAffection,
    allowForgiveness,
    allowReopeningCloseness,
    maxSentences,
    maxWords,
    emojiBudget,
    reasons: [
      ...contract.reasons,
      dialogue.reason,
      `speech=${speech.register}/${speech.relationshipLevel}`,
    ],
  };

  const hard = deriveHardConstraints(contract, dialogue);
  const soft = deriveSoftTendencies(contract, speech, dialogue);
  const resolved = resolveKairaResponsePlan({ hard, soft, dialogue, speech, contract });

  return {
    ...basePlan,
    continueConversation: resolved.continueConversation,
    allowQuestion: resolved.allowQuestion,
    allowHumor: resolved.allowHumor,
    allowAffection: resolved.allowAffection,
    allowForgiveness: resolved.allowForgiveness,
    allowReopeningCloseness: resolved.allowReopeningCloseness,
    maxSentences: resolved.maxSentences,
    maxWords: resolved.maxWords,
    emojiBudget: resolved.emojiBudget,
    reasons: [...basePlan.reasons, ...resolved.resolverRationale.map((r) => `resolver:${r}`)],
    resolver: "canonical",
    flirtationAllowed: resolved.flirtationAllowed,
    counterFlirtAllowed: resolved.counterFlirtAllowed,
    opennessAxis: resolved.opennessAxis,
    warmthAxis: resolved.warmthAxis,
    guardedness: resolved.guardedness,
    intimacyCeiling: resolved.intimacyCeiling,
    requiredContent: resolved.requiredContent,
    hardReasons: resolved.hardReasons,
    uncertainty: resolved.uncertainty,
    projections: resolved.projections,
  };
}

export function kairaResponsePlanInstruction(plan: KairaResponsePlan): string {
  return [
    "KAIRA CEVAP PLANI (TEK DAVRANIŞ OTORİTESİ):",
    `move=${plan.move}`,
    `stance=${plan.stance}`,
    `register=${plan.register}`,
    `relationshipLevel=${plan.relationshipLevel}`,
    `continueConversation=${plan.continueConversation}`,
    `allowQuestion=${plan.allowQuestion}`,
    `allowHumor=${plan.allowHumor}`,
    `allowAffection=${plan.allowAffection}`,
    `allowForgiveness=${plan.allowForgiveness}`,
    `allowReopeningCloseness=${plan.allowReopeningCloseness}`,
    `counterFlirt=${plan.counterFlirtAllowed === true ? "allowed" : "forbidden"}`,
    `maxSentences=${plan.maxSentences}`,
    `maxWords=${plan.maxWords}`,
    `emojiBudget=${plan.emojiBudget}`,
    plan.counterFlirtAllowed === true
      ? ""
      : "Karşı-flört YASAK: kullanıcı flört etse/teklif etse bile Kaira flörte karşılık vermez, romantik/cinsel ima başlatmaz. Sıcak veya esprili olabilir; flörtü nazikçe geçiştirir. Bu sınır güven/yakınlık/geçmiş ilişki/tona bakılmaksızın mutlaktır.",
    "Bu plan WHAT/WHETHER kararlarında bağlayıcıdır. Konuşma kimliği yalnızca HOW üretir; planı genişletemez veya tersine çeviremez.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function findKairaResponsePlanIssues(
  reply: string,
  plan: KairaResponsePlan,
): string[] {
  const text = String(reply ?? "").trim();
  if (!text) return ["response_plan_empty_reply"];
  const issues: string[] = [];

  if (!plan.allowQuestion && looksLikeKairaQuestionAct(text)) issues.push("response_plan_question_blocked");
  if (!plan.allowHumor && HUMOR_RE.test(text)) issues.push("response_plan_humor_blocked");
  if (!plan.allowAffection && AFFECTION_RE.test(text)) issues.push("response_plan_affection_blocked");
  if (plan.counterFlirtAllowed === false && COUNTER_FLIRT_RE.test(text))
    issues.push("response_plan_counter_flirt_blocked");
  if (!plan.allowForgiveness && FORGIVENESS_RE.test(text)) issues.push("response_plan_forgiveness_blocked");
  if (!plan.allowReopeningCloseness && REOPEN_RE.test(text)) issues.push("response_plan_reopening_blocked");
  if (responseUnitCount(text) > plan.maxSentences) issues.push("response_plan_sentence_budget_exceeded");
  if (wordCount(text) > plan.maxWords) issues.push("response_plan_word_budget_exceeded");
  if (countEmoji(text) > plan.emojiBudget) issues.push("response_plan_emoji_budget_exceeded");

  return issues;
}
