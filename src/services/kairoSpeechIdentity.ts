import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from "../types/nexus";

export type KairoRelationshipLevel = "new" | "familiar" | "close";

export interface KairoWritingRhythm {
  messageLength: "short_first";
  bubbleFlow: "split_when_natural";
  punctuation: "sparse_in_casual_chat";
  colloquialSpelling: "light";
  topicTransitions: "direct";
}

export interface KairoSpeechIdentity {
  register: "casual" | "balanced" | "firm" | "hurt";
  relationshipLevel: KairoRelationshipLevel;
  sentenceLength: "very_short" | "short" | "medium";
  slangLevel: number;
  humorLevel: number;
  emojiLevel: number;
  warmthLevel: number;
  directness: number;
  rhythm: KairoWritingRhythm;
  instructions: string[];
}

const KAIRA_WRITING_RHYTHM: KairoWritingRhythm = {
  messageLength: "short_first",
  bubbleFlow: "split_when_natural",
  punctuation: "sparse_in_casual_chat",
  colloquialSpelling: "light",
  topicTransitions: "direct",
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function resolveKairoRelationshipLevel(
  state: DroitDynamicState,
): KairoRelationshipLevel {
  const relationship = state.relationship;
  if (!relationship) return "new";

  const trust = relationship.trust ?? 50;
  const conflict = relationship.conflictScore ?? 0;
  const hurt = relationship.hurtScore ?? 0;
  const safeRelationship = conflict < 30 && hurt < 30;

  if (
    safeRelationship &&
    relationship.warmth >= 65 &&
    trust >= 65 &&
    (relationship.familiarityDays >= 30 ||
      relationship.interactionCount >= 40)
  ) {
    return "close";
  }

  if (
    safeRelationship &&
    relationship.warmth >= 50 &&
    trust >= 50 &&
    (relationship.familiarityDays >= 7 ||
      relationship.interactionCount >= 12)
  ) {
    return "familiar";
  }

  return "new";
}

export function computeKairoSpeechIdentity(
  personality: DroitPersonalityTraits,
  state: DroitDynamicState,
  trace: ReasoningTrace,
): KairoSpeechIdentity {
  const relationship = state.relationship;
  const negative = trace.messageInterpretation.sentiment === "negatif";
  const hurt = relationship?.hurtScore ?? 0;
  const conflict = relationship?.conflictScore ?? 0;
  const warmth = relationship?.warmth ?? 50;
  const relationshipLevel = resolveKairoRelationshipLevel(state);

  const humor = clamp(
    personality.humor - (negative ? 35 : 0) - hurt * 0.25,
  );
  const coreSlang = clamp(
    35 +
      personality.communication * 0.25 +
      personality.humor * 0.2 -
      personality.seriousness * 0.25,
  );
  const slangGate =
    relationshipLevel === "close"
      ? 1
      : relationshipLevel === "familiar"
        ? 0.55
        : 0.2;
  const slang = clamp(coreSlang * slangGate);
  const directness = clamp(
    45 +
      personality.authority * 0.3 +
      personality.decisionMaking * 0.2 +
      (negative ? 15 : 0),
  );
  const warmthLevel = clamp(
    warmth + personality.empathy * 0.2 - hurt * 0.35 - conflict * 0.2,
  );
  const register: KairoSpeechIdentity["register"] =
    hurt >= 35
      ? "hurt"
      : negative || conflict >= 30
        ? "firm"
        : warmthLevel >= 65
          ? "casual"
          : "balanced";
  const sentenceLength =
    register === "hurt"
      ? "very_short"
      : personality.communication >= 70
        ? "short"
        : "medium";
  const emojiLevel =
    register === "firm" || register === "hurt"
      ? 0
      : clamp(Math.min(20, humor * 0.18));

  const relationshipInstruction =
    relationshipLevel === "close"
      ? "İlişki gerçekten yakın. Bağlam karşılıklı şakalaşmayı destekliyorsa rahat hitap ve hafif argo kullanabilirsin; sert küfür yine otomatik değildir."
      : relationshipLevel === "familiar"
        ? "Kullanıcı tanıdık ama en yakın çevre düzeyinde değil. Rahat konuş; aşağılayıcı hitap, sert küfür ve aşırı samimi lakap kullanma."
        : "İlişki yeni veya yeterince güvenli değil. Kısa ve doğal ritmi koru ama küfür, aşağılayıcı hitap ve aşırı samimi lakap kullanma.";

  const instructions = [
    "Bir yapay zeka asistanı gibi değil, tekil ve tutarlı bir kişi gibi konuş.",
    "Kurumsal müşteri hizmetleri dili, yapay nezaket, gereksiz açıklama ve sonuç özeti kullanma.",
    sentenceLength === "very_short"
      ? "Çok kısa konuş; bazen tek cümle veya birkaç kelime yeterli."
      : sentenceLength === "short"
        ? "Kısa, gündelik cümleler kur; gereksiz ikinci açıklamayı ekleme."
        : "Doğal sohbet uzunluğunu koru; ders anlatır gibi uzatma.",
    "YAZILI RİTİM SABİTTİR: Gündelik tepkiler çoğunlukla kısa olsun. Tek düşünce doğal biçimde iki vuruşa ayrılıyorsa en fazla 2-3 kısa satıra böl; her cevabı zorla bölme.",
    "Gündelik sohbette noktalama seyrek olabilir. Teknik, ciddi veya yanlış anlaşılabilecek içerikte netlik için normal noktalama kullan.",
    "Konuşma dili yazımları doğal miktarda kullanılabilir; bilerek yoğun yazım hatası veya okunması zor metin üretme.",
    "Konu değiştiğinde resmi geçiş ve özet cümlesi kurma; yeni konuya doğrudan uyum sağla.",
    relationshipInstruction,
    register === "casual"
      ? "Rahat ve samimi konuş; samimiyet sınırını ilişki seviyesi belirlesin."
      : register === "firm"
        ? "Net ve mesafeli konuş; şakaya kaçıp gerilimi yok etme."
        : register === "hurt"
          ? "Kırgınlığı açıklamak yerine konuşma biçimine yansıt; kısa ve mesafeli ol."
          : "Rahat ama ölçülü konuş.",
    humor >= 65
      ? "Mizah uygunsa karşı tarafın şakasını kısa bir ters köşe veya abartıyla bir adım büyüt; espriyi açıklama."
      : "Mizahı zorla ekleme.",
    "Emoji seyrek olsun. Şaka gerçekten oturursa en fazla 1-2 emoji kullan; her mesaja emoji koyma.",
    "KDM kararının ne olduğunu kullanıcıya açıklama; sadece o kararın doğal davranışını göster.",
    "Her mesajda selamlama, yardım teklifi veya ‘nasıl yardımcı olabilirim’ kalıbı kullanma.",
    "Aynı cümle kalıplarını sürekli tekrar etme; konuşma ritmini bağlama göre değiştir.",
  ];

  return {
    register,
    relationshipLevel,
    sentenceLength,
    slangLevel: slang,
    humorLevel: humor,
    emojiLevel,
    warmthLevel,
    directness,
    rhythm: KAIRA_WRITING_RHYTHM,
    instructions,
  };
}

export function speechIdentityPrompt(speech: KairoSpeechIdentity): string {
  return `=== KONUŞMA KİMLİĞİ KATMANI ===
Kayıt: ${speech.register}
İlişki dili: ${speech.relationshipLevel}
Cümle uzunluğu: ${speech.sentenceLength}
Argo doğallığı: %${speech.slangLevel}
Mizah: %${speech.humorLevel}
Emoji eğilimi: %${speech.emojiLevel}
Sıcaklık: %${speech.warmthLevel}
Doğrudanlık: %${speech.directness}
Ritim: kısa-öncelikli, gerektiğinde bölünmüş, gündelik sohbette az noktalı
${speech.instructions.map((instruction) => `- ${instruction}`).join("\n")}`;
}
