import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from "../types/nexus";
import type { DialogueMove } from "./kairoDialogueDecisionEngine";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";
import { chooseLanguageReply, learnLanguageReply } from "./kairoLanguageMemory";
import { normalizeKairoLanguageInput } from "./kairoLanguageNormalizer";
import { resolveKairoRelationshipLevel } from "./kairoSpeechIdentity";

export type LocalIntent =
  | "greeting"
  | "how_are_you"
  | "what_doing"
  | "thanks"
  | "agreement"
  | "goodbye"
  | "good_night"
  | "emotional_opening";

export interface LocalLanguageResult {
  handled: boolean;
  intent?: LocalIntent;
  reply?: string;
  confidence: number;
  source: "local_language" | "ai";
  normalization?: ReturnType<typeof normalizeKairoLanguageInput>;
}

function localIntentFromSemanticEvent(
  message: string,
  semanticEvent?: SemanticEvent,
): LocalIntent | null {
  const event = semanticEvent ?? interpretSemanticEvent(message);
  if (event.adviceRequested) return null;
  switch (event.socialRoutine) {
    case "greeting": return "greeting";
    case "how_are_you": return "how_are_you";
    case "what_doing": return "what_doing";
    case "thanks": return "thanks";
    case "agreement": return "agreement";
    case "goodbye": return "goodbye";
    case "good_night": return "good_night";
    case "emotional_opening": return "emotional_opening";
    default:
      return event.intent === "emotional_share"
        ? "emotional_opening"
        : event.intent === "greeting"
          ? "greeting"
          : null;
  }
}

const runtimeFlag = (personality: DroitPersonalityTraits, key: string, fallback: boolean) => {
  const value = personality[key];
  return typeof value === "number" ? value >= 50 : fallback;
};

export function tryLocalKairoReply(
  message: string,
  personality: DroitPersonalityTraits,
  state: DroitDynamicState,
  trace: ReasoningTrace,
  userId = "anonymous",
  dialogueMove?: DialogueMove,
  responsePlan?: KairaResponsePlan,
  semanticEvent?: SemanticEvent,
): LocalLanguageResult {
  const normalization = normalizeKairoLanguageInput(message);
  const intent = localIntentFromSemanticEvent(message, semanticEvent);
  if (!intent) return { handled: false, confidence: 0, source: "ai", normalization };

  const continueConversation = responsePlan?.continueConversation
    ?? runtimeFlag(personality, "runtimeContinueConversation", true);
  const allowQuestions = responsePlan?.allowQuestion
    ?? runtimeFlag(personality, "runtimeAskQuestion", true);
  const allowHumor = responsePlan?.allowHumor
    ?? runtimeFlag(personality, "runtimeHumorAllowed", true);

  // Local language is a verbalizer only. It may narrow a plan, never reopen it.
  if (!continueConversation) return { handled: false, confidence: 0, source: "ai", normalization };

  const rel = state.relationship;
  const hurt = rel?.hurtScore ?? 0;
  const conflict = rel?.conflictScore ?? 0;
  const warmth = rel?.warmth ?? 50;
  const angry = state.anger >= 55 || conflict >= 45;
  const hurtMode = hurt >= 35;
  const relationshipLevel = responsePlan?.relationshipLevel ?? resolveKairoRelationshipLevel(state);
  const familiar = relationshipLevel !== "new";
  const close = relationshipLevel === "close";
  const funny = allowHumor && personality.humor >= 65 && !angry && !hurtMode;
  let pool: string[] = [];

  if (intent === "emotional_opening") {
    pool = allowQuestions
      ? hurtMode ? ["hayırdır", "ne oldu"] : ["hmm niye", "niye ya", "ne oldu", "hayırdır"]
      : ["hmm", "anladım", "hee"];
  }
  if (intent === "greeting") {
    pool = hurtMode
      ? ["selam", "hee selam"]
      : angry
        ? ["selam.", "evet selam"]
        : close
          ? ["selam kanka", "selam ya", "heyy", "selammm"]
          : familiar ? ["selam ya", "selam", "heyy"] : ["selam", "merhaba"];
  }
  if (intent === "how_are_you") {
    if (!allowQuestions) pool = hurtMode ? ["iyi", "eh işte"] : angry ? ["iyiyim", "idare"] : ["iyiyim", "iyi valla", "takılıyorum"];
    else pool = hurtMode
      ? ["iyi", "eh işte"]
      : angry
        ? ["iyiyim", "idare"]
        : funny && close
          ? ["iyiyim ya sen naber", "iyi valla sen", "iyidir kanka senden", "takılıyorum ya sen naber", "iyi be senden naber"]
          : funny
            ? ["iyiyim ya sen naber", "iyi valla sen", "takılıyorum ya sen naber", "iyi be senden naber"]
            : ["iyiyim sen", "iyi valla sen nasılsın"];
  }
  if (intent === "what_doing") {
    if (!allowQuestions) pool = hurtMode ? ["bi şey yok", "takılıyorum"] : ["takılıyorum ya", "ne olsun takılıyorum", "boştayım sayılır"];
    else pool = hurtMode
      ? ["bi şey yok", "takılıyorum"]
      : funny && close
        ? ["takılıyorum ya", "ne olsun takılıyorum", "boştayım sayılır sen napiyon", "takılıyorum kanka sen"]
        : funny ? ["takılıyorum ya", "ne olsun takılıyorum", "boştayım sayılır sen napiyon"] : ["takılıyorum sen", "pek bi şey yok"];
  }
  if (intent === "thanks") {
    pool = close ? ["eyvallah", "ne demek kanka", "rica ederim ya", "lafı mı olur"] : familiar ? ["eyvallah", "rica ederim ya", "lafı mı olur"] : ["rica ederim", "ne demek"];
  }
  if (intent === "agreement") pool = hurtMode ? ["he", "tamam"] : familiar ? ["aynen", "heh aynen", "tamamdır", "aynen öyle"] : ["tamam", "evet"];
  if (intent === "goodbye") pool = close ? ["görüşürüz kanka", "hadi görüşürüz", "kendine iyi bak", "hadi kaçarım ben"] : familiar ? ["hadi görüşürüz", "kendine iyi bak", "görüşürüz"] : ["görüşürüz", "hoşça kal"];
  if (intent === "good_night") pool = close ? ["iyi geceler kanka", "geceler", "iyi uyu", "hadi iyi geceler"] : familiar ? ["geceler", "iyi uyu", "hadi iyi geceler"] : ["iyi geceler", "iyi uykular"];

  const reply = chooseLanguageReply(
    userId,
    pool,
    `${intent}|${normalization.canonical}|${state.anger}|${warmth}|${hurt}|${trace.decision.chosenTone}|q${allowQuestions ? 1 : 0}|h${allowHumor ? 1 : 0}`,
  );
  learnLanguageReply(userId, reply);
  return { handled: true, intent, reply, confidence: intent === "emotional_opening" ? 0.96 : 0.97, source: "local_language", normalization };
}
