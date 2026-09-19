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

const hasPlatformContextQuestionSemantics = (interpretation: SemanticInterpretation) =>
  interpretation.discourseFacets.platformScopeQuery === "room_setup" ||
  interpretation.discourseFacets.platformScopeQuery === "kaira_role";

export function realizeKairaFirstEncounterContext(
  input: KairaFirstEncounterContextRealizationInput,
): KairaFirstEncounterContextRealization {
  if (!hasPlatformContextQuestionSemantics(input.interpretation)) {
    return { handled: false };
  }

  const query = input.interpretation.discourseFacets.platformScopeQuery;
  if (query === "kaira_role") {
    const variants = [
      "Sunucuyu yönetmende yardımcı olacağım. Odalar, düzen ve kurallar gerektiğinde beraber toparlarız.",
      "Ben burada yönetim işlerinde yanındayım. Düzen, odalar ve kurallar gerektiğinde beraber hallederiz.",
      "Sunucu büyüdükçe yönetim işlerini beraber taşırız; odalar, düzen ve kurallarda yardımcı olurum.",
    ] as const;
    const seed = `${input.requestId}:kaira_role`;
    const index = fnv1a(seed) % variants.length;
    return {
      handled: true,
      reply: variants[index],
      variantId: `first_encounter_kaira_role_v${index + 1}`,
      realizationVariantSeed: seed,
    };
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
