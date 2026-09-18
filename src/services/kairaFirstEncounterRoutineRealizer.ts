import type { KairaResponsePlan } from "./kairaResponsePlan";
import type { SemanticEvent } from "./semanticEventEngine";

export interface KairaFirstEncounterRoutineInput {
  requestId: string;
  event: SemanticEvent;
  plan: KairaResponsePlan;
}

export interface KairaFirstEncounterRoutineResult {
  handled: boolean;
  reply?: string;
  intent?:
    | "greeting"
    | "how_are_you"
    | "what_doing"
    | "thanks"
    | "agreement"
    | "goodbye"
    | "good_night";
  variantId?: string;
  realizationVariantSeed?: string;
}

const fnv1a = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const POOLS = {
  greeting: [
    "selam 😄 burdayım",
    "selam, burdayım",
    "hey 😄",
    "selam ya",
  ],
  how_are_you: [
    "iyiyim ya 😄 sende ne var ne yok?",
    "gayet iyiyim, sen nasılsın?",
    "iyi sayılır 😄 sende durumlar nasıl?",
    "iyiyim, keyfim yerinde. sende?",
    "fena değilim 😄 sen nasılsın?",
  ],
  what_doing: [
    "şimdilik takılıyorum 😄 sen ne yapıyorsun?",
    "burdayım, ortama bakıyorum. sen?",
    "pek bi şey yok, takılıyorum 😄 sende?",
    "şimdilik burdayım. sen ne yapıyorsun?",
  ],
  thanks: [
    "ne demek",
    "rica ederim ya",
    "lafı mı olur 😄",
  ],
  agreement: [
    "aynen",
    "tamamdır",
    "heh aynen",
  ],
  goodbye: [
    "görüşürüz",
    "hadi görüşürüz",
    "kendine iyi bak",
  ],
  good_night: [
    "iyi geceler",
    "geceler 😄",
    "iyi uyu",
  ],
} as const;

type FastRoutine = keyof typeof POOLS;

function fastRoutine(event: SemanticEvent): FastRoutine | null {
  switch (event.socialRoutine) {
    case "greeting":
    case "how_are_you":
    case "what_doing":
    case "thanks":
    case "agreement":
    case "goodbye":
    case "good_night":
      return event.socialRoutine;
    default:
      return null;
  }
}

export function realizeKairaFirstEncounterRoutine(
  input: KairaFirstEncounterRoutineInput,
): KairaFirstEncounterRoutineResult {
  const routine = fastRoutine(input.event);
  if (!routine) return { handled: false };

  if (
    input.plan.move !== "complete_social_routine" &&
    input.plan.move !== "natural_reaction"
  ) {
    return { handled: false };
  }

  const seed = `${input.requestId}:${routine}:${input.plan.move}:${input.plan.relationshipLevel}`;
  const pool = POOLS[routine];
  const index = fnv1a(seed) % pool.length;
  let reply: string = pool[index];

  if (!input.plan.allowQuestion) {
    reply = reply
      .replace(/\s*(?:sende ne var ne yok|sen nasılsın|sende durumlar nasıl|sende|sen ne yapıyorsun|sen)\?$/iu, "")
      .replace(/[?？]$/u, "")
      .trim();
  }

  if (!input.plan.allowHumor) {
    reply = reply.replace(/\s*[😄🙂]/gu, "").trim();
  }

  return {
    handled: true,
    reply,
    intent: routine,
    variantId: `first_encounter_${routine}_v${index + 1}`,
    realizationVariantSeed: seed,
  };
}
