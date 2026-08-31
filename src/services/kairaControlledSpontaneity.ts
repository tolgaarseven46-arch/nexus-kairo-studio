import type { DroitDynamicState } from '../types/nexus';
import type { ConversationTurn } from './kairoConversationGrounding';
import type { KairaResponsePlan } from './kairaResponsePlan';
import { interpretSemanticEvent } from './semanticEventEngine';

export type KairaSpontaneityMode = 'none' | 'recent_topic_nudge';

export interface KairaSpontaneityDecision {
  mode: KairaSpontaneityMode;
  eligible: boolean;
  probability: number;
  roll: number;
  sourceText?: string;
  sourceParticipant?: string;
  reason: string;
}

export interface KairaSpontaneityInput {
  responsePlan: KairaResponsePlan;
  dynamicState: DroitDynamicState;
  history: ConversationTurn[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const TOPIC_STOP_WORDS = new Set([
  'bugün', 'dün', 'yarın', 'biraz', 'baya', 'şey', 'işte', 'yani', 'falan', 'filan', 'ama', 'çok', 'daha', 'sonra',
]);

function topicTokens(text: string): string[] {
  return Array.from(new Set(
    String(text || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-zçğıöşü0-9\s]/giu, ' ')
      .split(/\s+/u)
      .filter((token) => token.length >= 4 && !TOPIC_STOP_WORDS.has(token)),
  ));
}

function topicWasRecentlyEchoed(text: string, recentKairaReplies: string[]): boolean {
  const candidate = topicTokens(text);
  if (!candidate.length) return false;
  return recentKairaReplies.some((reply) => {
    const replyTokens = new Set(topicTokens(reply));
    const overlap = candidate.filter((token) => replyTokens.has(token)).length;
    return overlap >= 2 && overlap / candidate.length >= 0.4;
  });
}

function safeTopicCandidate(history: ConversationTurn[]): ConversationTurn | undefined {
  const turns = Array.isArray(history) ? history : [];
  const recentKairaReplies = turns
    .filter((turn) => turn?.sender === 'droit')
    .slice(-3)
    .map((turn) => String(turn.text || ''));

  return [...turns]
    .reverse()
    .find((turn) => {
      if (turn?.sender !== 'user') return false;
      const text = String(turn.text || '').trim();
      if (text.length < 8 || text.includes('?')) return false;
      if (topicWasRecentlyEchoed(text, recentKairaReplies)) return false;
      const event = interpretSemanticEvent(text);
      return (
        event.intent === 'general_chat' ||
        event.intent === 'banter' ||
        event.intent === 'compliment'
      ) && !event.insult && !event.apology && !event.repairAttempt && !event.redLine && event.emotionalLoad <= 0;
    });
}

export function decideKairaControlledSpontaneity(
  input: KairaSpontaneityInput,
  random: () => number = Math.random,
): KairaSpontaneityDecision {
  const { responsePlan: plan, dynamicState: state, history } = input;
  const roll = clamp01(Number(random()));
  const reactionMode = state.reactionMode ?? 'neutral';

  if (!plan.continueConversation || plan.stance !== 'open') {
    return { mode: 'none', eligible: false, probability: 0, roll, reason: 'conversation_not_open' };
  }
  if (plan.move !== 'natural_reaction') {
    return { mode: 'none', eligible: false, probability: 0, roll, reason: 'dialogue_move_not_eligible' };
  }
  if (reactionMode !== 'neutral') {
    return { mode: 'none', eligible: false, probability: 0, roll, reason: 'qualitative_reaction_active' };
  }
  if (plan.maxSentences < 2 || plan.maxWords < 8) {
    return { mode: 'none', eligible: false, probability: 0, roll, reason: 'response_budget_too_small' };
  }

  const source = safeTopicCandidate(history);
  if (!source) {
    return { mode: 'none', eligible: false, probability: 0, roll, reason: 'no_safe_prior_topic' };
  }

  const probability = plan.relationshipLevel === 'close'
    ? 0.12
    : plan.relationshipLevel === 'familiar'
      ? 0.07
      : 0.03;

  if (roll >= probability) {
    return { mode: 'none', eligible: true, probability, roll, reason: 'roll_not_selected' };
  }

  return {
    mode: 'recent_topic_nudge',
    eligible: true,
    probability,
    roll,
    sourceText: String(source.text || '').trim().slice(0, 180),
    sourceParticipant: source.participantName,
    reason: 'safe_recent_topic_selected',
  };
}

export function kairaControlledSpontaneityInstruction(
  decision: KairaSpontaneityDecision,
  plan: KairaResponsePlan,
): string {
  if (decision.mode === 'none') {
    return 'KONTROLLÜ SPONTANELİK: bu tur spontane davranış seçilmedi.';
  }

  const questionRule = plan.allowQuestion
    ? 'ResponsePlan izin veriyorsa en fazla bir doğal soru olabilir.'
    : 'Soru sorma; bu nudge soru izni vermez.';

  return [
    'KONTROLLÜ SPONTANELİK (ALT DAVRANIŞ SEÇİMİ — İZİN OTORİTESİ DEĞİL):',
    `mode=${decision.mode}`,
    `kaynak=${decision.sourceParticipant || 'kullanıcı'}: ${decision.sourceText || ''}`,
    'Ana doğal tepkiyi bozmayacak şekilde, yalnızca gerçekten konuşulmuş bu eski konuya tek kısa bir yan not/nudge ekleyebilirsin.',
    'Yeni olay, anı, plan veya dış dünya gerçeği uydurma. Kaynakta olmayan ayrıntı ekleme.',
    questionRule,
    `ResponsePlan bütçelerini aşma: maxSentences=${plan.maxSentences}, maxWords=${plan.maxWords}.`,
    'ResponsePlan/BehaviorContract ile en ufak çelişkide spontane nudge tamamen iptal edilir.',
  ].join('\n');
}
