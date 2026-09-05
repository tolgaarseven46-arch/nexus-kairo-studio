import { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from '../types/droit';
import { chooseKairoPhrase } from './kairoDialogueChaosEngine';
import { loadKairaLanguageStyleProfile, rememberKairaReply, type KairaLanguageStyleProfile } from './kairaLanguageMemory';
import { normalizeKairoLanguageInput } from './kairoLanguageNormalization';
import { resolveKairoRelationshipLevel } from './kairoSpeechIdentity';
import type { DialogueMove } from './kairoDialogueDecisionEngine';
import type { KairaResponsePlan } from './kairaResponsePlan';
import type { SemanticEvent } from './semanticEventEngine';
import type { DiscourseState } from './discourseStateReducer';

export interface LocalLanguageResult {
  handled: boolean;
  reply?: string;
  intent?: string;
  confidence: number;
  source: 'local_language' | 'ai';
  normalization: ReturnType<typeof normalizeKairoLanguageInput>;
}

type LocalRenderIntent =
  | 'greeting'
  | 'how_are_you'
  | 'what_doing'
  | 'thanks'
  | 'agreement'
  | 'goodbye'
  | 'good_night'
  | 'emotional_opening';

const TRIVIAL_RENDER_MOVES = new Set<DialogueMove>([
  'complete_social_routine',
  'natural_reaction',
  'invite_emotional_context',
]);

function trivialRenderIntent(
  dialogueMove: DialogueMove | undefined,
  event: SemanticEvent | undefined,
  discourse?: DiscourseState,
): LocalRenderIntent | null {
  if (!event) return null;
  // Hard semantic richness/safety gates: the local engine may verbalize only an
  // already-decided trivial social routine. It must never swallow a turn that
  // carries a typed non-routine obligation.
  if (
    event.redLine ||
    event.insult ||
    event.apology ||
    event.repairAttempt ||
    event.stopTalking ||
    event.coercion > 0 ||
    event.manipulation > 0 ||
    event.privacyViolation > 0 ||
    (event.discourseAct ?? 'none') === 'recall_request' ||
    (event.discourseAct ?? 'none') === 'confusion_or_challenge'
  ) {
    return null;
  }
  // Fast local rendering is only for semantically trivial routines. Surface
  // interrogative form alone is not richness: "nasıl gidiyor" and
  // "keyifler nasıl" are still local how-are-you routines. Typed knowledge,
  // causal/relational content, or emotionally loaded third-party turns stay on
  // the full generation path.
  if (
    event.intent === 'information_request' ||
    event.knowledgeQuery ||
    event.relationalAct !== 'none' ||
    (event.target === 'third_party' && event.emotionalLoad >= 0.35)
  ) return null;

  // The dialogue decision must have chosen a trivial move (or be absent for a
  // direct/legacy call). The local engine never overrides a non-trivial move.
  if (dialogueMove !== undefined && !TRIVIAL_RENDER_MOVES.has(dialogueMove)) return null;
  // A pending previous-turn dependency means the current turn is a reply to
  // Kaira, not a fresh routine — hand it to the pipeline.
  if (discourse?.previousTurnDependency) return null;

  // Intent comes ONLY from the shared SemanticEvent's routine — never a re-parse.
  const routine = event.socialRoutine ?? 'none';
  switch (routine) {
    case 'greeting':
      return (discourse?.routines.greeting.count ?? 0) >= 2 ? null : 'greeting';
    case 'how_are_you':
      return (discourse?.routines.howAreYou.count ?? 0) >= 2 ? null : 'how_are_you';
    case 'what_doing':
      return (discourse?.routines.whatDoing.count ?? 0) >= 2 ? null : 'what_doing';
    case 'thanks':
      return 'thanks';
    case 'agreement':
      return 'agreement';
    case 'goodbye':
      return 'goodbye';
    case 'good_night':
      return 'good_night';
    case 'emotional_opening':
      return 'emotional_opening';
    default:
      return null;
  }
}

const runtimeFlag = (personality: DroitPersonalityTraits, key: string, fallback: boolean) => {
  const value = personality[key];
  return typeof value === 'number' ? value >= 50 : fallback;
};

export function tryLocalKairoReply(
  message: string,
  personality: DroitPersonalityTraits,
  state: DroitDynamicState,
  trace: ReasoningTrace,
  userId = 'anonymous',
  dialogueMove?: DialogueMove,
  responsePlan?: KairaResponsePlan,
  semanticEvent?: SemanticEvent,
  useLearnedMemory = true,
  discourse?: DiscourseState,
): LocalLanguageResult {
  const normalization = normalizeKairoLanguageInput(message);
  const intent = trivialRenderIntent(dialogueMove, semanticEvent, discourse);
  if (!intent) return { handled: false, confidence: 0, source: 'ai', normalization };

  const continueConversation = responsePlan?.continueConversation
    ?? runtimeFlag(personality, 'runtimeContinueConversation', true);
  const allowQuestions = responsePlan?.allowQuestion
    ?? runtimeFlag(personality, 'runtimeAskQuestion', true);
  const allowHumor = responsePlan?.allowHumor
    ?? runtimeFlag(personality, 'runtimeHumorAllowed', true);

  // Local language is a verbalizer only. It may narrow a plan, never reopen it.
  if (!continueConversation) return { handled: false, confidence: 0, source: 'ai', normalization };

  const rel = state.relationship;
  const hurt = rel?.hurtScore ?? 0;
  const conflict = rel?.conflictScore ?? 0;
  const warmth = rel?.warmth ?? 50;
  const reactionMode = state.reactionMode ?? 'neutral';
  const angry = reactionMode === 'irritated' || state.anger >= 55 || conflict >= 45;
  const hurtMode = reactionMode === 'hurt' || reactionMode === 'withdrawn' || hurt >= 35;
  const repairingMode = reactionMode === 'repairing';
  const cautiousMode = hurtMode || repairingMode;
  const relationshipLevel = responsePlan?.relationshipLevel ?? resolveKairoRelationshipLevel(state);
  const familiar = relationshipLevel !== 'new';
  const close = relationshipLevel === 'close';
  const funny = allowHumor && personality.humor >= 65 && !angry && !cautiousMode;
  let pool: string[] = [];

  if (intent === 'emotional_opening') {
    pool = allowQuestions
      ? hurtMode ? ['hayırdır', 'ne oldu'] : ['hmm niye', 'niye ya', 'ne oldu', 'hayırdır']
      : ['hmm', 'anladım', 'hee'];
  }
  if (intent === 'greeting') {
    pool = hurtMode
      ? ['selam', 'hee selam']
      : repairingMode
        ? ['selam', 'selam ya']
        : angry
          ? ['selam.', 'evet selam']
          : close
            ? ['selam ya', 'hee selam', 'naber']
            : familiar
              ? ['selam', 'hee selam', 'naber']
              : ['selam', 'selam ya', 'hee selam'];
  }
  if (intent === 'how_are_you') {
    pool = hurtMode
      ? ['idare', 'iyiyim']
      : repairingMode
        ? ['iyiyim', 'idare']
        : angry
          ? ['iyiyim.', 'idare.']
          : funny
            ? ['iyi ya sen', 'iyi valla sen', 'idare ya sen']
            : ['iyi ya sen', 'iyiyim sen', 'idare ya sen'];
  }
  if (intent === 'what_doing') {
    pool = hurtMode
      ? ['takılıyorum']
      : repairingMode
        ? ['takılıyorum', 'öyle duruyorum']
        : angry
          ? ['takılıyorum.', 'bir şey yok.']
          : funny
            ? ['takılıyorum ya', 'öyle boş boş', 'bir şey yok sen']
            : ['takılıyorum', 'öyle duruyorum', 'bir şey yok sen'];
  }
  if (intent === 'thanks') {
    pool = hurtMode ? ['tamam'] : ['ne demek', 'eyvallah', 'rica ederim'];
  }
  if (intent === 'agreement') {
    pool = hurtMode ? ['tamam'] : ['tamamdır', 'olur', 'aynen'];
  }
  if (intent === 'goodbye') {
    pool = hurtMode ? ['görüşürüz'] : ['görüşürüz', 'hadi görüşürüz', 'kendine iyi bak'];
  }
  if (intent === 'good_night') {
    pool = hurtMode ? ['iyi geceler'] : ['iyi geceler', 'iyi uykular', 'geceler'];
  }

  if (!pool.length) return { handled: false, confidence: 0, source: 'ai', normalization };

  const profile: KairaLanguageStyleProfile | null = useLearnedMemory
    ? loadKairaLanguageStyleProfile(userId)
    : null;
  const reply = chooseKairoPhrase(pool, {
    seed: `${userId}|${normalization.normalized}|${trace.relationship?.interactionCount ?? 0}`,
    profile,
  });
  if (useLearnedMemory) rememberKairaReply(userId, reply);
  return {
    handled: true,
    reply,
    intent,
    confidence: 0.98,
    source: 'local_language',
    normalization,
  };
}
