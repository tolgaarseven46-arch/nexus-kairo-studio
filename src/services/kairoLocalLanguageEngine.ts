import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from "../types/nexus";
import type { DialogueMove } from "./kairoDialogueDecisionEngine";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import type { SemanticEvent } from "./semanticEventEngine";
import type { DiscourseState } from "../types/discourseState";
import { chooseLanguageReply } from "./kairoLanguageMemory";
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

/**
 * Local rendering intent (ADR-0006 foundation repair).
 *
 * The local engine no longer classifies intent itself. It renders ONLY when the
 * dialogue decision has already chosen a trivial-routine move AND the shared
 * SemanticEvent's routine matches AND the DiscourseState says that routine has
 * not saturated this conversation. It never re-parses the message, never invents
 * a social intent, and never overrides the dialogue decision.
 */
/** Dialogue moves under which a trivial local render is permitted at all. */
const TRIVIAL_RENDER_MOVES = new Set<DialogueMove>([
  "complete_social_routine",
  "natural_reaction",
  "invite_emotional_context",
]);

function trivialRenderIntent(
  dialogueMove: DialogueMove | undefined,
  event: SemanticEvent | undefined,
  discourse: DiscourseState | undefined,
): LocalIntent | null {
  if (!event || event.adviceRequested) return null;
  // Hard content -> the main pipeline must handle it, never a canned pool.
  if (
    event.insult ||
    event.redLine ||
    event.apology ||
    event.repairAttempt ||
    event.stopTalking ||
    event.coercion > 0 ||
    event.manipulation > 0 ||
    event.privacyViolation > 0 ||
    (event.discourseAct ?? "none") === "recall_request" ||
    (event.discourseAct ?? "none") === "confusion_or_challenge"
  ) {
    return null;
  }
  // Fast local rendering is only for semantically trivial routines. A current
  // turn that asks for knowledge/causality, carries a typed relational act, or
  // describes a third-party emotional event must stay on the full generation path.
  if (
    event.intent === "question" ||
    event.intent === "information_request" ||
    event.knowledgeQuery ||
    event.relationalAct !== "none" ||
    (event.target === "third_party" && event.emotionalLoad >= 0.35)
  ) return null;

  // The dialogue decision must have chosen a trivial move (or be absent for a
  // direct/legacy call). The local engine never overrides a non-trivial move.
  if (dialogueMove !== undefined && !TRIVIAL_RENDER_MOVES.has(dialogueMove)) return null;
  // A pending previous-turn dependency means the current turn is a reply to
  // Kaira, not a fresh routine — hand it to the pipeline.
  if (discourse?.previousTurnDependency) return null;

  // Intent comes ONLY from the shared SemanticEvent's routine — never a re-parse.
  const routine = event.socialRoutine ?? "none";
  switch (routine) {
    case "greeting":
      return (discourse?.routines.greeting.count ?? 0) >= 2 ? null : "greeting";
    case "how_are_you":
      return (discourse?.routines.howAreYou.count ?? 0) >= 2 ? null : "how_are_you";
    case "what_doing":
      return (discourse?.routines.whatDoing.count ?? 0) >= 2 ? null : "what_doing";
    case "thanks":
      return "thanks";
    case "agreement":
      return "agreement";
    case "goodbye":
      return "goodbye";
    case "good_night":
      return "good_night";
    case "emotional_opening":
      return "emotional_opening";
    default:
      return null;
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
  useLearnedMemory = true,
  discourse?: DiscourseState,
): LocalLanguageResult {
  const normalization = normalizeKairoLanguageInput(message);
  const intent = trivialRenderIntent(dialogueMove, semanticEvent, discourse);
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
  const reactionMode = state.reactionMode ?? "neutral";
  const angry = reactionMode === "irritated" || state.anger >= 55 || conflict >= 45;
  const hurtMode = reactionMode === "hurt" || reactionMode === "withdrawn" || hurt >= 35;
  const repairingMode = reactionMode === "repairing";
  const cautiousMode = hurtMode || repairingMode;
  const relationshipLevel = responsePlan?.relationshipLevel ?? resolveKairoRelationshipLevel(state);
  const familiar = relationshipLevel !== "new";
  const close = relationshipLevel === "close";
  const funny = allowHumor && personality.humor >= 65 && !angry && !cautiousMode;
  let pool: string[] = [];

  if (intent === "emotional_opening") {
    pool = allowQuestions
      ? hurtMode ? ["hayırdır", "ne oldu"] : ["hmm niye", "niye ya", "ne oldu", "hayırdır"]
      : ["hmm", "anladım", "hee"];
  }
  if (intent === "greeting") {
    pool = hurtMode
      ? ["selam", "hee selam"]
      : repairingMode
        ? ["selam", "selam ya"]
        : angry
          ? ["selam.", "evet selam"]
          : close
            ? ["selam kanka", "selam ya", "heyy", "selammm"]
            : familiar ? ["selam ya", "selam", "heyy"] : ["selam", "merhaba"];
  }
  if (intent === "how_are_you") {
    if (!allowQuestions) pool = hurtMode
      ? ["iyi", "eh işte"]
      : angry
        ? ["iyiyim", "idare"]
        : close
          ? ["iyiyim ya", "iyi valla", "takılıyorum kanka"]
          : familiar
            ? ["iyiyim ya", "iyi valla", "takılıyorum"]
            : ["iyiyim", "iyi sayılır"];
    else pool = hurtMode
      ? ["iyi", "eh işte"]
      : repairingMode
        ? ["iyiyim", "iyi sayılır sen"]
        : angry
          ? ["iyiyim", "idare"]
          : funny && close
            ? ["iyiyim ya sen naber", "iyi valla sen", "iyidir kanka senden", "takılıyorum ya sen naber", "iyi be senden naber"]
            : funny && familiar
              ? ["iyiyim ya sen naber", "iyi valla sen", "takılıyorum ya sen naber", "iyi be senden naber"]
              : familiar
                ? ["iyiyim ya sen", "iyi valla sen"]
                : ["iyiyim sen", "iyi valla sen nasılsın"];
  }
  if (intent === "what_doing") {
    if (!allowQuestions) pool = hurtMode
      ? ["bi şey yok", "takılıyorum"]
      : close
        ? ["takılıyorum ya", "ne olsun takılıyorum", "takılıyorum kanka"]
        : familiar
          ? ["takılıyorum ya", "ne olsun takılıyorum", "boştayım sayılır"]
          : ["pek bi şey yok", "takılıyorum"];
    else pool = hurtMode
      ? ["bi şey yok", "takılıyorum"]
      : repairingMode
        ? ["takılıyorum ya", "pek bi şey yok sen"]
        : funny && close
          ? ["takılıyorum ya", "ne olsun takılıyorum", "boştayım sayılır sen napiyon", "takılıyorum kanka sen"]
          : funny && familiar
            ? ["takılıyorum ya", "ne olsun takılıyorum", "boştayım sayılır sen napiyon"]
            : familiar
              ? ["takılıyorum sen", "pek bi şey yok"]
              : ["pek bi şey yok", "takılıyorum"];
  }
  if (intent === "thanks") {
    pool = hurtMode
      ? ["rica ederim", "tamam"]
      : repairingMode
        ? ["rica ederim", "ne demek"]
        : close ? ["eyvallah", "ne demek kanka", "rica ederim ya", "lafı mı olur"] : familiar ? ["eyvallah", "rica ederim ya", "lafı mı olur"] : ["rica ederim", "ne demek"];
  }
  if (intent === "agreement") pool = hurtMode ? ["he", "tamam"] : repairingMode ? ["tamam", "aynen"] : familiar ? ["aynen", "heh aynen", "tamamdır", "aynen öyle"] : ["tamam", "evet"];
  if (intent === "goodbye") pool = hurtMode ? ["görüşürüz", "tamam görüşürüz"] : repairingMode ? ["görüşürüz", "kendine iyi bak"] : close ? ["görüşürüz kanka", "hadi görüşürüz", "kendine iyi bak", "hadi kaçarım ben"] : familiar ? ["hadi görüşürüz", "kendine iyi bak", "görüşürüz"] : ["görüşürüz", "hoşça kal"];
  if (intent === "good_night") pool = hurtMode ? ["iyi geceler", "geceler"] : repairingMode ? ["iyi geceler", "iyi uyu"] : close ? ["iyi geceler kanka", "geceler", "iyi uyu", "hadi iyi geceler"] : familiar ? ["geceler", "iyi uyu", "hadi iyi geceler"] : ["iyi geceler", "iyi uykular"];

  const reply = chooseLanguageReply(
    userId,
    pool,
    `${intent}|${normalization.canonical}|${state.anger}|${warmth}|${hurt}|${reactionMode}|${trace.decision.chosenTone}|q${allowQuestions ? 1 : 0}|h${allowHumor ? 1 : 0}`,
    useLearnedMemory,
    relationshipLevel,
  );
  return { handled: true, intent, reply, confidence: intent === "emotional_opening" ? 0.96 : 0.97, source: "local_language", normalization };
}
