import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { KairaResponsePlan } from "./kairaResponsePlan";

export interface KairaFirstEncounterSteeringInput {
  requestId: string;
  interpretation: SemanticInterpretation;
  plan: KairaResponsePlan;
}

export interface KairaFirstEncounterSteeringRealization {
  handled: boolean;
  reply?: string;
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

export function isKairaFirstEncounterSteeringEligible(
  interpretation: SemanticInterpretation,
): boolean {
  return (
    interpretation.discourseFacets.shortUtteranceShape === true &&
    interpretation.discourseFacets.uncertaintyAnswerShape === true &&
    (interpretation.primaryIntent === "other" || interpretation.primaryIntent === "smalltalk") &&
    interpretation.target !== "third_party" &&
    (interpretation.valence === "neutral" || interpretation.valence === "positive") &&
    interpretation.emotionalLoad <= 0.35 &&
    interpretation.secondarySocialActs.length === 0 &&
    interpretation.discourseFacets.socialRoutine === "none" &&
    interpretation.discourseFacets.discourseAct === "none" &&
    interpretation.discourseFacets.repairSignal === "none" &&
    interpretation.discourseFacets.knowledgeQuery == null &&
    interpretation.discourseFacets.selfMemoryQuery == null &&
    !interpretation.stopRequest
  );
}

export function realizeKairaFirstEncounterSteering(
  input: KairaFirstEncounterSteeringInput,
): KairaFirstEncounterSteeringRealization {
  if (!isKairaFirstEncounterSteeringEligible(input.interpretation)) {
    return { handled: false };
  }

  const variants = [
    "Acele yok 😄 şimdilik takılırız; bir şey lazım olursa beraber bakarız.",
    "Sorun değil 😄 hemen karar vermen gerekmiyor; ihtiyaç çıktıkça beraber toparlarız.",
    "Rahat ol 😄 biraz zaman geçsin, neye ihtiyaç varsa zaten belli olur.",
  ] as const;

  const seed = `${input.requestId}:first_encounter_steering`;
  const index = fnv1a(seed) % variants.length;
  let reply: string = variants[index];

  if (!input.plan.allowHumor) {
    reply = reply.replace(/\s*[😄🙂]/gu, "").trim();
  }

  return {
    handled: true,
    reply,
    variantId: `first_encounter_steering_v${index + 1}`,
    realizationVariantSeed: seed,
  };
}
