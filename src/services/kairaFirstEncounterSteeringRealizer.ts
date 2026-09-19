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
  if (
    !isKairaFirstEncounterSteeringEligible(input.interpretation) ||
    input.plan.move === "stay_silent"
  ) {
    return { handled: false };
  }

  const variants = [
    "Sorun değil 😄 ben başlangıcı toparlayayım; önce genel sohbeti oturturuz, sonra ihtiyaç çıktıkça odaları ekleriz.",
    "O zaman ilk adımı ben atayım 😄 şimdilik sohbeti kurarız; insanlar geldikçe ortamın neye ihtiyacı varsa onu ekleriz.",
    "Hiç problem değil. Ben burayı başlangıçta sade tutayım; önce muhabbeti oturturuz, sonra odaları ve düzeni beraber büyütürüz.",
  ] as const;

  const seed = `${input.requestId}:first_encounter_steering`;
  const index = fnv1a(seed) % variants.length;
  let reply = variants[index];

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
