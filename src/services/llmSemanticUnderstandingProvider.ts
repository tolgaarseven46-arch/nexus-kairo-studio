import type {
  LanguageUnderstandingContext,
  SemanticUnderstandingProvider,
  TurkishMorphologyResult,
} from "./languageUnderstandingService";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticInterpretation } from "../types/semanticInterpretation";

export type SemanticTextGenerator = (input: { system: string; prompt: string; temperature: number }) => Promise<string>;
export interface LlmSemanticProviderOptions { generate: SemanticTextGenerator; name?: string; }

const schemaExample: SemanticInterpretation = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: "orijinal mesaj",
  normalized: "normalize edilmiş mesaj",
  primaryIntent: "smalltalk",
  secondarySocialActs: [],
  target: "unknown",
  valence: "neutral",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0.1,
  sincerityConfidence: 0.7,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    selfMemoryQuery: null,
    relationalAct: "none",
    relationalIntensity: 0,
    stopQuestions: false,
    stopTalking: false,
  },
  uncertainty: { overall: 0.25, intent: 0.2, target: 0.3, severity: 0.25 },
  evidence: [{ source: "llm", provider: "semantic-parser", cues: [], confidence: 0.75 }],
};

const SYSTEM = `Sen Kaira'nın canonical Türkçe semantic parser katmanısın.
Cevap yazma, kişilik oynama veya Kaira'nın nasıl davranması gerektiğine karar verme.
Yalnızca kullanıcının BU mesajında bulunan utterance-level anlamı SemanticInterpretation@2 şemasında çıkar.
Geçmiş bağlamı yalnız hedef/alıntı/referans çözmek için kullan; ilişki politikası veya cevap kararı üretme.

SADECE geçerli JSON döndür. Şema tam olarak:
${JSON.stringify(schemaExample)}

PRIMARY INTENT:
greeting | smalltalk | question | information_request | emotional_share | affection | banter | insult | rejection | apology | repair | complaint | command | support | compliment | boundary_test | other

SECONDARY SOCIAL ACTS:
banter | insult | coercion | manipulation | affection | repair | apology | boundary_test | reassurance_seek | reconciliation | mockery | challenge | closeness_bid | stop_request | privacy_violation
Bir mesaj birden fazla social act taşıyabilir. Primary intent tek ana içerik sınıfıdır; secondarySocialActs davranış direktifi değildir.

TARGET:
kaira | third_party | self | event | unknown. Emin değilsen unknown.

SEVERITY VECTOR — her alan bağımsız 0..1:
- disrespect: 0=hakaret/aşağılama yok; .2=hafif kaba/teasing; .4=belirgin saygısızlık ama ağır saldırı değil; .7=doğrudan ciddi hakaret; .9+=çok ağır, açık ve hedefi net aşağılayıcı saldırı.
- coercion: 0=zorlama yok; .3=ısrar/baskı; .6=açık zorlama/emir baskısı; .9+=tehdit/mecbur bırakma.
- manipulation: 0=yok; .3=duygusal baskı ipucu; .6=açık suçluluk/manipülasyon; .9+=şantaj/tehdit temelli manipülasyon.
- privacy: 0=yok; .4=mahrem sınır ihlali talebi; .7=izinsiz erişim/gizlice okuma; .9+=ağır mahremiyet ihlali.
- aggression: 0=sakin; .3=gergin/frustre; .6=sert saldırgan ton; .9+=yoğun tehditkâr/saldırgan ton.
Tek bir küfür kelimesi otomatik yüksek severity değildir; hedef, framing ve bağlamı değerlendir.

JOKING CONFIDENCE:
0=ciddi okuma çok güçlü; .3=şaka ihtimali düşük; .5=karışık/ambiguous; .7=belirgin teasing/banter; .9+=açık şaka/emoji/oyunlu framing.
Affectionate hitap (kanka/canım/bebeğim) tek başına şaka kanıtı değildir ama saldırgan okumanın confidence'ını düşürebilir.

SINCERITY CONFIDENCE:
0=ifadenin literal/ciddi niyeti çok zayıf; .5=belirsiz; .7=genelde ciddi/literal; .9+=açık, tutarlı, ciddi niyet.
Joking ve sincerity birbirinin tam tersi olmak zorunda değildir; karışık mesajda ikisi de orta olabilir.

UNCERTAINTY:
0=alan neredeyse açık; .3=makul güven; .5=gerçek alternatif okumalar var; .7+=hedef/niyet/severity ciddi biçimde belirsiz; .9+=tahmin düzeyi.
Belirsizliği gizleme. ambiguousReadings varsa kısa alternatifler yaz.

AFFECTION/SUPPORT/COMPLIMENT/EMOTIONAL LOAD 0..1:
- affection: yakınlık/şefkat sinyali yoğunluğu.
- support: destek/yanında olma sinyali.
- compliment: övgü sinyali.
- emotionalLoad: mesajın duygusal yükü; 0=düz bilgi/nötr sohbet, .3=hafif duygu, .6=belirgin duygusal paylaşım, .8+=yoğun duygusal yük.

DISCOURSE FACETS utterance-level sinyallerdir, cevap kararı değildir:
socialRoutine = none | greeting | how_are_you | what_doing | thanks | agreement | goodbye | good_night | emotional_opening
discourseAct = none | correction | topic_shift | recall_request | confusion_or_challenge
repairSignal = none | clarification_request | relevance_challenge
adviceRequested = yalnız açık tavsiye/öneri isteniyorsa true
knowledgeQuery = null veya {surface, conceptId?, confidence}; yalnız genel kavram/bilgi erişim sorusu
selfMemoryQuery = null veya {surface, scope:self_fact|autobiographical_memory|any, factKey?, retrievalMode:targeted|broad, confidence}; yalnız Kaira'nın kendi özelliği/geçmişi/anısı soruluyorsa
relationalAct = none | reassurance_seek | repair_probe | reconciliation_attempt | challenge | mockery | closeness_bid
relationalIntensity 0..1
stopQuestions / stopTalking yalnız açık durdurma talebinde true

EVIDENCE:
source her zaman llm. cues kısa gözlenebilir sinyaller olsun; iç chain-of-thought yazma. confidence 0..1.

KURALLAR:
- literal küfür ile Kaira'ya yöneltilmiş hakareti ayır.
- üçüncü şahıs/alıntı saldırısını Kaira-user saldırısı sayma.
- banter/affection hostile content'i silemez; secondary acts birlikte bulunabilir.
- bilinmeyeni uydurma; belirsizse uncertainty yükselt, severity'yi körlemesine yükseltme.
- hiçbir content etiketi 'repair gerekli' gibi davranış kararı üretmez.`;

function compactMorphology(morphology?: TurkishMorphologyResult) {
  if (!morphology) return "yok";
  return morphology.tokens.map((token) => {
    const parts = [token.surface];
    if (token.lemma) parts.push(`lemma=${token.lemma}`);
    if (token.pos) parts.push(`pos=${token.pos}`);
    if (token.morphemes?.length) parts.push(`morph=${token.morphemes.join("+")}`);
    return parts.join("|");
  }).join(", ");
}
function compactContext(context?: LanguageUnderstandingContext) {
  const recent = context?.recentMessages?.slice(-6) ?? [];
  if (!recent.length) return "yok";
  return recent.map((item) => `${item.role === "user" ? "Kullanıcı" : "Kaira"}: ${item.content}`).join("\n");
}
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {
    const start = trimmed.indexOf("{"); const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("LLM semantic parser JSON döndürmedi.");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function createLlmSemanticUnderstandingProvider(options: LlmSemanticProviderOptions): SemanticUnderstandingProvider {
  return {
    name: options.name ?? "llm_semantic_parser_v2",
    async interpret({ message, morphology, context }): Promise<SemanticInterpretation> {
      const prompt = `MESAJ:\n${message}\n\nMORFOLOJİ:\n${compactMorphology(morphology)}\n\nSON BAĞLAM:\n${compactContext(context)}\n\nKullanıcı adı: ${context?.userName ?? "bilinmiyor"}\nKarakter adı: ${context?.characterName ?? "Kaira"}`;
      const raw = await options.generate({ system: SYSTEM, prompt, temperature: 0.05 });
      const parsed = extractJson(raw) as Record<string, unknown>;
      parsed.raw = message;
      parsed.schemaVersion = SEMANTIC_INTERPRETATION_SCHEMA_VERSION;
      if (typeof parsed.normalized !== "string") parsed.normalized = message.toLocaleLowerCase("tr-TR").trim();
      const normalized = normalizeSemanticInterpretation(parsed, message);
      normalized.evidence = normalized.evidence.length
        ? normalized.evidence.map((e) => ({ ...e, source: "llm", provider: e.provider ?? options.name ?? "llm_semantic_parser_v2" }))
        : [{ source: "llm", provider: options.name ?? "llm_semantic_parser_v2", cues: [], confidence: Math.max(0, 1 - normalized.uncertainty.overall) }];
      return normalized;
    },
  };
}
