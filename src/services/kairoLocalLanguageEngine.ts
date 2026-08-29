import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from "../types/nexus";
import type { DialogueMove } from "./kairoDialogueDecisionEngine";
import { classifyLocalEmotionalIntent } from "./kairoEmotionalLanguage";
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

function detectIntent(text: string, dialogueMove?: DialogueMove): LocalIntent | null {
  if (dialogueMove === "invite_emotional_context" && classifyLocalEmotionalIntent(text)) return "emotional_opening";
  const t = normalizeKairoLanguageInput(text).canonical;
  if (/^(selam|merhaba|hey|heyy)$/.test(t)) return "greeting";
  if (/^(naber|nasılsın)$/.test(t)) return "how_are_you";
  if (t === "ne yapıyorsun") return "what_doing";
  if (/^(sağol|teşekkürler|eyvallah|thx)$/.test(t)) return "thanks";
  if (/^(aynen|evet|he|hıhı|tamam|ok|okey)$/.test(t)) return "agreement";
  if (/^(görüşürüz|bb|bay bay|hoşça kal)$/.test(t)) return "goodbye";
  if (/^(iyi geceler|ig)$/.test(t)) return "good_night";
  return null;
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
): LocalLanguageResult {
  const normalization = normalizeKairoLanguageInput(message);
  const intent = detectIntent(message, dialogueMove);
  if (!intent) return { handled: false, confidence: 0, source: "ai", normalization };

  const continueConversation = runtimeFlag(personality, "runtimeContinueConversation", true);
  const allowQuestions = runtimeFlag(personality, "runtimeAskQuestion", true);
  const allowHumor = runtimeFlag(personality, "runtimeHumorAllowed", true);

  // A local shortcut must never reopen a turn the central engine explicitly closed.
  if (!continueConversation) return { handled: false, confidence: 0, source: "ai", normalization };

  const rel = state.relationship;
  const hurt = rel?.hurtScore ?? 0;
  const conflict = rel?.conflictScore ?? 0;
  const warmth = rel?.warmth ?? 50;
  const angry = state.anger >= 55 || conflict >= 45;
  const hurtMode = hurt >= 35;
  const relationshipLevel = resolveKairoRelationshipLevel(state);
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

  const reply = chooseLanguageReply(userId, pool, `${intent}|${normalization.canonical}|${state.anger}|${warmth}|${hurt}|${trace.decision.chosenTone}|q${allowQuestions ? 1 : 0}`);
  learnLanguageReply(userId, reply);
  return { handled: true, intent, reply, confidence: intent === "emotional_opening" ? 0.96 : 0.97, source: "local_language", normalization };
}
