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

const hasRoomContextQuestionSemantics = (interpretation: SemanticInterpretation) =>
  interpretation.discourseFacets.platformScopeQuery === "room_setup";

export function realizeKairaFirstEncounterContext(
  input: KairaFirstEncounterContextRealizationInput,
): KairaFirstEncounterContextRealization {
  if (
    input.plan.move !== "answer_or_clarify" ||
    !hasRoomContextQuestionSemantics(input.interpretation)
  ) {
    return { handled: false };
  }

  const roomName = input.context?.roomName?.trim();
  const owner = input.context?.isOwner === true;

  const variants = owner
    ? [
        roomName
          ? `Burası senin "${roomName}" odan 😄 Ben başlangıcı toparlayayım: önce genel sohbeti oturturuz, sonra ortama göre odaları ve kuralları ekleriz.`
          : "Burası senin yeni odan 😄 Ben başlangıcı toparlayayım: önce genel sohbeti oturturuz, sonra ortama göre odaları ve kuralları ekleriz.",
        roomName
          ? `"${roomName}" daha yeni. Ben ilk akışı kurayım; gelenler rahat takılsın diye önce sohbeti ve temel düzeni oturturuz.`
          : "Burası daha yeni. Ben ilk akışı kurayım; gelenler rahat takılsın diye önce sohbeti ve temel düzeni oturturuz.",
        roomName
          ? `Şu an "${roomName}" odasını kuruyoruz. İlk adımı ben atayım: burayı nasıl bir ortama çevireceğimizi konuşup sonra odaları ona göre açarız.`
          : "Şu an yeni odanı kuruyoruz. İlk adımı ben atayım: burayı nasıl bir ortama çevireceğimizi konuşup sonra odaları ona göre açarız.",
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
