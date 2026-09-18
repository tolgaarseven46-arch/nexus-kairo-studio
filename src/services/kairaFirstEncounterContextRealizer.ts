import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import type { KairaFirstEncounterContinuity } from "./kairaFirstEncounterContinuity";

export interface KairaFirstEncounterContextRealizationInput {
  requestId: string;
  interpretation: SemanticInterpretation;
  plan: KairaResponsePlan;
  context?: KairaFirstEncounterContinuity["context"];
}

export interface KairaFirstEncounterContextRealization {
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

const hasRoomContextQuestionEvidence = (interpretation: SemanticInterpretation) =>
  interpretation.evidence.some((evidence) =>
    evidence.cues.includes("first_encounter_room_context_question"),
  );

export function realizeKairaFirstEncounterContext(
  input: KairaFirstEncounterContextRealizationInput,
): KairaFirstEncounterContextRealization {
  if (
    input.plan.move !== "answer_or_clarify" ||
    !hasRoomContextQuestionEvidence(input.interpretation)
  ) {
    return { handled: false };
  }

  const roomName = input.context?.roomName?.trim();
  const owner = input.context?.isOwner === true;

  const variants = owner
    ? [
        roomName
          ? `Burası senin "${roomName}" odan 😄 Şimdilik ortamı kuruyoruz; ben de gerektiğinde düzenlemeye ve canlandırmaya yardım ederim.`
          : "Burası senin yeni odan 😄 Şimdilik ortamı kuruyoruz; ben de gerektiğinde düzenlemeye ve canlandırmaya yardım ederim.",
        roomName
          ? `"${roomName}" senin alanın. Nasıl bir yer olacağına sen karar verirsin; ben de gerektiğinde el atarım.`
          : "Burası senin alanın. Nasıl bir yer olacağına sen karar verirsin; ben de gerektiğinde el atarım.",
        roomName
          ? `Şu an "${roomName}" odasını kuruyoruz. Sen yön veriyorsun, ben de ortamı toparlamak ve hareketlendirmek için buradayım.`
          : "Şu an yeni odanı kuruyoruz. Sen yön veriyorsun, ben de ortamı toparlamak ve hareketlendirmek için buradayım.",
      ]
    : [
        roomName
          ? `Burası "${roomName}" odası. Ortamın yönünü oda sahibi belirliyor; ben de gerektiğinde yardımcı oluyorum.`
          : "Burası bu sunucunun sohbet odası. Ortamın yönünü oda sahibi belirliyor; ben de gerektiğinde yardımcı oluyorum.",
        "Burada sohbet edip ortamı birlikte şekillendiriyoruz. Ben de gerektiğinde düzenlemeye ve akışı canlı tutmaya yardım ediyorum.",
      ];

  const seed = `${input.requestId}:room_context:${roomName || "room"}:${owner ? "owner" : "member"}`;
  const index = fnv1a(seed) % variants.length;
  let reply = variants[index];

  if (!input.plan.allowHumor) {
    reply = reply.replace(/\s*[😄🙂]/gu, "").trim();
  }

  return {
    handled: true,
    reply,
    variantId: `first_encounter_room_context_v${index + 1}`,
    realizationVariantSeed: seed,
  };
}
