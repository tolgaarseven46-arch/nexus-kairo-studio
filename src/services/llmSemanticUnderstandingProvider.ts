import type {
  LanguageUnderstandingContext,
  SemanticUnderstandingProvider,
  TurkishMorphologyResult,
} from "./languageUnderstandingService";
import type { SemanticEvent } from "./semanticEventEngine";

export type SemanticTextGenerator = (input: {
  system: string;
  prompt: string;
  temperature: number;
}) => Promise<string>;

export interface LlmSemanticProviderOptions {
  generate: SemanticTextGenerator;
  name?: string;
}

const semanticSchemaExample = {
  raw: "orijinal mesaj",
  normalized: "normalize edilmiş mesaj",
  intent: "general_chat",
  socialRoutine: "none",
  discourseAct: "none",
  adviceRequested: false,
  valence: "neutral",
  target: "unknown",
  relationalAct: "none",
  relationalIntensity: 0,
  severity: 0,
  insult: false,
  redLine: false,
  disrespect: 0,
  coercion: 0,
  manipulation: 0,
  privacyViolation: 0,
  apology: false,
  repairAttempt: false,
  stopQuestions: false,
  stopTalking: false,
  frustration: 0,
  emotionalLoad: 0,
  affection: 0,
  support: 0,
  compliment: 0,
};

const SYSTEM = `Sen Kaira'nın Türkçe semantic parser katmanısın.
Görevin cevap yazmak, kişilik oynamak veya Kaira'nın nasıl tepki vermesi gerektiğine karar vermek DEĞİL.
Yalnızca kullanıcının mesajında gerçekte ne olduğunu yapılandırılmış biçimde çıkar.

ÖNEMLİ AYRIMLAR:
- Literal küfür ile Kaira'ya yöneltilmiş hakareti ayır.
- Üçüncü şahsa edilen veya üçüncü şahıstan aktarılan hakareti Kaira'ya saldırı sayma.
- Şaka/banter sinyalini saldırganlıktan ayır; yine de literal hakaret varsa insult alanını gerçeğe göre doldur.
- "mal" gibi çok anlamlı sözcükleri bağlamdan çöz.
- Alıntılanmış/raporlanmış konuşmada konuşanı ve hedefi karıştırma.
- Özür ile ilişkiyi onarma girişimini ayır.
- Bilmediğin şeyi uydurma; belirsizlik varsa daha düşük severity/intensity seç.
- Türkçe eklerden dolayı yüzey biçimine takılma; varsa morfoloji/lemma bilgisini kullan.

SADECE geçerli JSON döndür. Markdown, açıklama veya kod bloğu ekleme.
JSON tam olarak şu alanları içermeli:
${JSON.stringify(semanticSchemaExample)}

ENUM DEĞERLERİ:
intent = greeting | question | information_request | emotional_share | affection | banter | insult | rejection | apology | repair | complaint | command | support | compliment | general_chat
socialRoutine = none | greeting | how_are_you | what_doing | thanks | agreement | goodbye | good_night | emotional_opening
discourseAct = none | correction | topic_shift | recall_request | confusion_or_challenge
adviceRequested = boolean; kullanıcı açıkça ne yapması gerektiğini/tavsiye/öneri soruyorsa true
valence = positive | negative | neutral
target = kaira | third_party | event | unknown
relationalAct = none | reassurance_seek | repair_probe | reconciliation_attempt | challenge | mockery | closeness_bid

0-1 arası sayısal alanların tamamını bu aralıkta tut.`;

function compactMorphology(morphology?: TurkishMorphologyResult) {
  if (!morphology) return "yok";
  return morphology.tokens
    .map((token) => {
      const parts = [token.surface];
      if (token.lemma) parts.push(`lemma=${token.lemma}`);
      if (token.pos) parts.push(`pos=${token.pos}`);
      if (token.morphemes?.length) parts.push(`morph=${token.morphemes.join("+")}`);
      return parts.join("|");
    })
    .join(", ");
}

function compactContext(context?: LanguageUnderstandingContext) {
  const recent = context?.recentMessages?.slice(-6) ?? [];
  if (!recent.length) return "yok";
  return recent
    .map((item) => `${item.role === "user" ? "Kullanıcı" : "Kaira"}: ${item.content}`)
    .join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("LLM semantic parser JSON döndürmedi.");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function createLlmSemanticUnderstandingProvider(
  options: LlmSemanticProviderOptions,
): SemanticUnderstandingProvider {
  return {
    name: options.name ?? "llm_semantic_parser_v1",
    async interpret({ message, morphology, context }): Promise<SemanticEvent> {
      const prompt = `MESAJ:\n${message}\n\nMORFOLOJİ:\n${compactMorphology(morphology)}\n\nSON BAĞLAM:\n${compactContext(context)}\n\nKullanıcı adı: ${context?.userName ?? "bilinmiyor"}\nKarakter adı: ${context?.characterName ?? "Kaira"}`;
      const raw = await options.generate({
        system: SYSTEM,
        prompt,
        temperature: 0.05,
      });
      const parsed = extractJson(raw) as Record<string, unknown>;

      // Preserve the actual input. A model is not allowed to rewrite evidence.
      parsed.raw = message;
      if (typeof parsed.normalized !== "string") {
        parsed.normalized = message.toLocaleLowerCase("tr-TR").trim();
      }

      return parsed as unknown as SemanticEvent;
    },
  };
}
