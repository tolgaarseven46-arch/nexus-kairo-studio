import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";

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

const QUESTION_RE = /[?？]/u;
const HUMOR_RE = /(hahaha|hehe|şaka|takılıyorum|dalga|😂|🤣|😏)/iu;
const AFFECTION_RE = /(öp|öpüc|sarıl|kucağ|dudak|bebeğim|aşkım|tatlım|sevgilim)/iu;
const FORGIVENESS_RE = /(geçti gitti|sorun yok|affettim|tamamen geçti|kapandı gitti)/iu;
const REOPEN_RE = /(hadi\s+(?:konuş|devam)|konuşalım|devam edelim|eski halimize|normale dön|barıştık|kaldığımız yerden)/iu;

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
  // Speech identity is HOW-only: humorLevel shapes expression, but cannot grant
  // or veto the underlying WHAT/WHETHER permission.
  const allowHumor =
    continueConversation &&
    contract.playfulness === "allowed";
  const allowAffection =
    continueConversation && contract.affection === "allowed";
  const allowForgiveness = contract.forgivenessGranted;
  const allowReopeningCloseness =
    continueConversation && contract.reopeningCloseness === "allowed";
  const contractSentenceBudget = contract.maxResponseLength === "short" ? 1 : 2;
  const maxSentences = Math.max(
    1,
    Math.min(dialogue.maxSentences, contractSentenceBudget),
  );
  const maxWords = Math.max(
    1,
    Math.min(
      dialogue.maxWords ?? (contract.maxResponseLength === "short" ? 14 : 32),
      contract.maxResponseLength === "short" ? 14 : 32,
    ),
  );
  const emojiBudget =
    continueConversation && speech.emojiLevel > 0 && contract.stance === "open" ? 1 : 0;

  return {
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
    `maxSentences=${plan.maxSentences}`,
    `maxWords=${plan.maxWords}`,
    `emojiBudget=${plan.emojiBudget}`,
    "Bu plan WHAT/WHETHER kararlarında bağlayıcıdır. Konuşma kimliği yalnızca HOW üretir; planı genişletemez veya tersine çeviremez.",
  ].join("\n");
}

export function findKairaResponsePlanIssues(
  reply: string,
  plan: KairaResponsePlan,
): string[] {
  const text = String(reply ?? "").trim();
  if (!text) return ["response_plan_empty_reply"];
  const issues: string[] = [];

  if (!plan.allowQuestion && QUESTION_RE.test(text)) issues.push("response_plan_question_blocked");
  if (!plan.allowHumor && HUMOR_RE.test(text)) issues.push("response_plan_humor_blocked");
  if (!plan.allowAffection && AFFECTION_RE.test(text)) issues.push("response_plan_affection_blocked");
  if (!plan.allowForgiveness && FORGIVENESS_RE.test(text)) issues.push("response_plan_forgiveness_blocked");
  if (!plan.allowReopeningCloseness && REOPEN_RE.test(text)) issues.push("response_plan_reopening_blocked");
  if (responseUnitCount(text) > plan.maxSentences) issues.push("response_plan_sentence_budget_exceeded");
  if (wordCount(text) > plan.maxWords) issues.push("response_plan_word_budget_exceeded");
  if (countEmoji(text) > plan.emojiBudget) issues.push("response_plan_emoji_budget_exceeded");

  return issues;
}
