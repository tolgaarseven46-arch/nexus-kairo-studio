import {
  understandTurkishMessage,
  type LanguageUnderstandingContext,
  type LanguageUnderstandingResult,
} from "./languageUnderstandingService";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { createConfiguredZemberekMorphologyProvider } from "./zemberekMorphologyProvider";

export interface ServerSemanticGenerateText {
  (
    system: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    temperature: number,
    preferredProvider: string,
  ): Promise<string>;
}

export interface ResolveServerLanguageUnderstandingInput {
  message: string;
  incomingSemanticInterpretation?: unknown;
  context?: LanguageUnderstandingContext;
  preferredProvider: string;
  generateText: ServerSemanticGenerateText;
}

const CANONICAL_SEMANTIC_PROVIDER = "llm_semantic_runtime";
const ATTRIBUTION_SCHEMA_EXTENSION = `
SEMANTIC ATTRIBUTION EXTENSION (optional, fail-closed):
If and only if the CURRENT utterance explicitly supports attribution relevant to an already-known commitment, you may also return:
"attribution": {
  "intentionality": "intentional" | "unintentional" | "unknown",
  "commitmentViolation": "present" | "absent" | "unknown",
  "deception": "present" | "absent" | "unknown",
  "controllability": "high" | "low" | "unknown",
  "communicationConsent": "present" | "absent" | "unknown",
  "externalCause": "present" | "absent" | "unknown",
  "confidence": 0..1,
  "provenance": [short current-utterance evidence labels]
}
These attribution fields describe CURRENT-turn semantic evidence only. Use "unknown" whenever evidence is insufficient.
Do NOT infer betrayal or unfairness here. Do NOT use relationship history to manufacture intentionality, controllability, consent, or external cause.
Do NOT invent actorId or scopeKey; the canonical runtime grounds those from the already-built world event proposition.
If evidence is insufficient, omit attribution or use unknown values. This extension is compatible with SemanticInterpretation@2.`;

const SUBJECT_AND_REPORTED_SPEECH_EXTENSION = `
CANONICAL SUBJECT / REPORTED-SPEECH EXTENSION (fail-closed):
- Kullanıcının birinci şahıs öznesi (ben, benim, yaptım/yapacağım gibi user-owned first-person eylem veya fact) için canonical subjectId/actorId current_user kullan.
- Kaira için kaira yalnız current utterance Kaira'yı açıkça özne yaptığında kullanılabilir. Kullanıcının kendi planını, kararını, durumunu veya eylemini kaira subjectId ile ASLA yazma.
- Adı açık üçüncü kişiler person:<normalize_ad> kimliğini kullanır.
- NESTED REPORTED SPEECH: Kullanıcı yalnızca bir kişinin başka bir kişinin sözünü aktardığını bildiriyorsa (örn. "Ali bana Mert'in X dediğini söyledi"), gömülü X içeriğini doğrudan doğrulanmış durable fact gibi worldMemory claim ÜRETME. Rapor zincirini propositions/evidence içinde current-turn report olarak koru ve belirsizliği koru.
- Yalnız current utterance özne/attribute/value ilişkisini doğrudan destekliyorsa worldMemory claim üret. İkinci-el/nested hearsay için direct provenance yoksa fail-closed kal.
- Reported speech target/insult gibi utterance-level semantics korunabilir; bu kural yalnız durable world-memory fact promotion'ını sınırlar.`;

function groundCanonicalAttribution(result: LanguageUnderstandingResult): LanguageUnderstandingResult {
  const attribution = result.interpretation.attribution;
  if (!attribution) return result;
  const proposition = result.worldEvent.proposition;
  if (!proposition?.key) return result;

  const actorId = proposition.actorKey || attribution.actorId;
  return {
    ...result,
    interpretation: {
      ...result.interpretation,
      attribution: {
        ...attribution,
        ...(actorId ? { actorId } : {}),
        scopeKey: proposition.key,
        provenance: Array.from(new Set([
          ...attribution.provenance,
          "canonical_world_event:current_proposition",
        ])).slice(-8),
      },
    },
  };
}

/** Server bridge: canonical authority is SemanticInterpretation@2. */
export async function resolveServerLanguageUnderstanding(
  input: ResolveServerLanguageUnderstandingInput,
): Promise<LanguageUnderstandingResult> {
  const morphologyProvider = createConfiguredZemberekMorphologyProvider();
  const semanticProvider = createLlmSemanticUnderstandingProvider({
    // Canonical semantic evidence must not encode the requested transport/provider.
    // Runtime provider identity (and fallback) belongs to observability, while this
    // boundary remains stable across OpenRouter/Gemini switching.
    name: CANONICAL_SEMANTIC_PROVIDER,
    generate: ({ system, prompt, temperature }) =>
      input.generateText(
        `${system}\n\n${ATTRIBUTION_SCHEMA_EXTENSION}\n\n${SUBJECT_AND_REPORTED_SPEECH_EXTENSION}`,
        [{ role: "user", content: prompt }],
        temperature,
        input.preferredProvider,
      ),
  });

  const rawResult = await understandTurkishMessage(input.message, {
    incomingSemanticInterpretation: input.incomingSemanticInterpretation,
    morphologyProvider,
    semanticProvider,
    context: input.context,
  });
  const result = groundCanonicalAttribution(rawResult);

  if (result.semanticSource !== "semantic_provider") return result;
  return {
    ...result,
    semanticProvider: CANONICAL_SEMANTIC_PROVIDER,
    interpretation: {
      ...result.interpretation,
      evidence: result.interpretation.evidence.map((evidence) =>
        evidence.source === "llm"
          ? { ...evidence, provider: CANONICAL_SEMANTIC_PROVIDER }
          : evidence,
      ),
    },
  };
}
