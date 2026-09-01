import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from "../types/nexus";
import type { ExpressionStylePolicyHints } from "./behaviorPolicyInput";

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
  informalityLevel: number;
  emotionalDisplayLevel: number;
  humorMode: ExpressionStylePolicyHints["humorMode"];
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

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function resolveKairoRelationshipLevel(state: DroitDynamicState): KairoRelationshipLevel {
  const relationship = state.relationship;
  if (!relationship) return "new";
  const trust = relationship.trust ?? 50;
  if (relationship.warmth >= 65 && trust >= 65 && (relationship.familiarityDays >= 30 || relationship.interactionCount >= 40)) return "close";
  if (relationship.warmth >= 50 && trust >= 50 && (relationship.familiarityDays >= 7 || relationship.interactionCount >= 12)) return "familiar";
  return "new";
}

export function computeKairoSpeechIdentity(
  personality: DroitPersonalityTraits,
  state: DroitDynamicState,
  trace: ReasoningTrace,
  expressionStyle?: ExpressionStylePolicyHints,
): KairoSpeechIdentity {
  const relationship = state.relationship;
  const negative = trace.messageInterpretation.sentiment === "negatif";
  const hurt = relationship?.hurtScore ?? 0;
  const conflict = relationship?.conflictScore ?? 0;
  const warmth = relationship?.warmth ?? 50;
  const relationshipLevel = resolveKairoRelationshipLevel(state);
  const reactionMode = state.reactionMode ?? trace.currentMood?.reactionMode ?? "neutral";

  // Speech identity owns HOW only. It describes style from stable personality +
  // current social/emotional context; behavior permissions live in KairaResponsePlan.
  const humor = clamp(personality.humor - (negative ? 35 : 0) - hurt * 0.25);
  const informalityLevel = clamp((expressionStyle?.informality ?? 0.5) * 100);
  const emotionalDisplayLevel = clamp((expressionStyle?.emotionalDisplay ?? 0.5) * 100);
  const coreSlang = clamp(35 + personality.communication * 0.25 + personality.humor * 0.2 - personality.seriousness * 0.25 + (informalityLevel - 50) * 0.5);
  const slangGate = relationshipLevel === "close" ? 1 : relationshipLevel === "familiar" ? 0.55 : 0.2;
  const slang = clamp(coreSlang * slangGate);
  const directness = clamp(45 + personality.authority * 0.3 + personality.decisionMaking * 0.2 + (negative ? 15 : 0));
  const warmthLevel = clamp(warmth + personality.empathy * 0.2 - hurt * 0.35 - conflict * 0.2);
  const register: KairoSpeechIdentity["register"] =
    reactionMode === "hurt" || reactionMode === "withdrawn"
      ? "hurt"
      : reactionMode === "irritated"
        ? "firm"
        : reactionMode === "repairing"
          ? "balanced"
          : hurt >= 35
            ? "hurt"
            : negative || conflict >= 30
              ? "firm"
              : warmthLevel >= 65
                ? "casual"
                : "balanced";
  const sentenceLength: KairoSpeechIdentity["sentenceLength"] =
    register === "hurt"
      ? "very_short"
      : personality.communication >= 70
        ? "short"
        : "medium";
  const emojiLevel = register === "firm" || register === "hurt" ? 0 : clamp(Math.min(20, humor * 0.18));

  const relationshipInstruction = relationshipLevel === "close"
    ? "İlişki dili yakın ve rahat olabilir; kelime seçimini doğal samimiyete göre yap, sert küfrü otomatik üretme."
    : relationshipLevel === "familiar"
      ? "İlişki dili rahat ama ölçülü olsun; aşırı samimi lakap ve sert küfür kullanma."
      : "İlişki dili yeni/tanıdık başlangıcı gibi kalsın; aşırı samimi lakap ve sert küfür kullanma.";

  const reactionInstruction = reactionMode === "irritated"
    ? "Nitel tepki irritated: rahatsızlığı net ve kısa hissettir; kırgın veya içe kapanmış bir ritme geçme."
    : reactionMode === "hurt"
      ? "Nitel tepki hurt: doğrudan öfkeden çok kırgınlık ve kısalan sosyal ritim hissedilsin; açıklama raporu yazma."
      : reactionMode === "withdrawn"
        ? "Nitel tepki withdrawn: cevap gerekiyorsa minimum sosyal yatırım ve belirgin mesafe kullan; yeniden yakınlaşma başlatma."
        : reactionMode === "repairing"
          ? "Nitel tepki repairing: özrü/telafiyi duyduğunu göster ama ilişkiyi tamamen düzelmiş ilan etme; kontrollü yumuşa."
          : "Nitel tepki neutral: ek duygusal mesafe veya kırgınlık dayatma.";

  const humorModeInstruction = expressionStyle?.humorMode
    ? `Mizah izni açılırsa tercih edilen mizah biçimi: ${expressionStyle.humorMode}. Bu biçimi zorla kullanma.`
    : "Belirli bir mizah biçimini zorla seçme.";
  const emotionalDisplayInstruction = emotionalDisplayLevel >= 70
    ? "Duyguyu dilde belirgin ama teatral olmayan biçimde görünür kıl."
    : emotionalDisplayLevel <= 30
      ? "Duyguyu dilde fazla teşhir etme; daha kontrollü ve örtük ifade et."
      : "Duygu gösterimini doğal ve orta düzeyde tut.";

  const instructions = [
    "Bir yapay zeka asistanı gibi değil, tekil ve tutarlı bir kişi gibi yaz.",
    "Kurumsal müşteri hizmetleri dili, yapay nezaket, gereksiz açıklama ve sonuç özeti kullanma.",
    sentenceLength === "very_short"
      ? "Yazı ritmi çok kısa olsun; birkaç kelime veya tek kısa cümle doğal olabilir."
      : sentenceLength === "short"
        ? "Kısa, gündelik cümleler kur; gereksiz ikinci açıklamayı ekleme."
        : "Doğal sohbet uzunluğunu koru; ders anlatır gibi uzatma.",
    "YAZILI RİTİM SABİTTİR: Gündelik tepkiler çoğunlukla kısa olsun. Tek düşünce doğal biçimde iki vuruşa ayrılıyorsa en fazla 2-3 kısa satıra böl; her cevabı zorla bölme.",
    "Gündelik sohbette noktalama seyrek olabilir. Teknik, ciddi veya yanlış anlaşılabilecek içerikte netlik için normal noktalama kullan.",
    "Konuşma dili yazımları doğal miktarda kullanılabilir; bilerek yoğun yazım hatası veya okunması zor metin üretme.",
    "Konu değiştiğinde resmi geçiş ve özet cümlesi kurma; yeni konuya doğrudan uyum sağla.",
    relationshipInstruction,
    reactionInstruction,
    register === "casual"
      ? "Kelime seçimi rahat ve samimi olsun."
      : register === "firm"
        ? "Kelime seçimi net, kısa ve mesafeli olsun."
        : register === "hurt"
          ? "Kırgınlık açıklama raporuna dönüşmesin; ritim daha kısa ve mesafeli olsun."
          : "Kelime seçimi rahat ama ölçülü olsun.",
    humor >= 65 ? "Mizah kullanılmasına davranış planı izin verirse, espriyi açıklamadan kısa ve gündelik tut." : "Mizah tonu gerekiyorsa bile zorlamadan hafif tut.",
    humorModeInstruction,
    emotionalDisplayInstruction,
    "Emoji kullanılmasına davranış planı izin verirse seyrek kullan; stil eğilimi düşük kalsın.",
    "Davranış kararını açıklama; yalnızca verilen cevabın dilini ve ritmini biçimlendir.",
    "Aynı cümle kalıplarını sürekli tekrar etme; kelime ve ritim varyasyonunu bağlama göre değiştir.",
  ];

  return { register, relationshipLevel, sentenceLength, slangLevel: slang, humorLevel: humor, emojiLevel, warmthLevel, directness, informalityLevel, emotionalDisplayLevel, humorMode: expressionStyle?.humorMode ?? null, rhythm: KAIRA_WRITING_RHYTHM, instructions };
}

export function speechIdentityPrompt(speech: KairoSpeechIdentity): string {
  return `=== KONUŞMA KİMLİĞİ KATMANI (HOW ONLY) ===
Kayıt: ${speech.register}
İlişki dili: ${speech.relationshipLevel}
Cümle uzunluğu: ${speech.sentenceLength}
Argo doğallığı: %${speech.slangLevel}
Mizah stili eğilimi: %${speech.humorLevel}
Emoji stili eğilimi: %${speech.emojiLevel}
Sıcaklık: %${speech.warmthLevel}
Doğrudanlık: %${speech.directness}
Samimiyet / argo eğilimi: %${speech.informalityLevel}
Duygu gösterimi: %${speech.emotionalDisplayLevel}
Tercih edilen mizah biçimi: ${speech.humorMode ?? "yok"}
Ritim: kısa-öncelikli, gerektiğinde bölünmüş, gündelik sohbette az noktalı
Bu katman yalnızca HOW belirler; soru/mizah/affetme/yakınlaşma/konuşmayı sürdürmeye izin vermez.
${speech.instructions.map((instruction) => `- ${instruction}`).join("\n")}`;
}
