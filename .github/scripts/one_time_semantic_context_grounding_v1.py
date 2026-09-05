from pathlib import Path

# 1) Extend canonical type with additive, provider-computed grounding trace.
p = Path('src/types/semanticInterpretation.ts')
s = p.read_text()
old = '''export interface InterpretationEvidence {
  source: InterpretationEvidenceSource;
  provider?: string;
  cues: string[];
  confidence: number;
}
'''
new = '''export interface InterpretationEvidence {
  source: InterpretationEvidenceSource;
  provider?: string;
  cues: string[];
  confidence: number;
}

export type SemanticGroundingField =
  | "primaryIntent"
  | "secondarySocialActs"
  | "target"
  | "valence"
  | "severity"
  | "affection"
  | "support"
  | "compliment"
  | "emotionalLoad"
  | "apology"
  | "repairAttempt"
  | "stopRequest"
  | "socialRoutine"
  | "discourseAct"
  | "repairSignal"
  | "adviceRequested"
  | "knowledgeQuery"
  | "selfMemoryQuery"
  | "relationalAct"
  | "stopQuestions"
  | "stopTalking";

/**
 * Provider-computed context provenance. This is observational metadata, not a
 * second semantic authority: it records which canonical fields changed when
 * the same current turn was adjudicated without conversational history.
 */
export interface SemanticGroundingTrace {
  adjudicatedAgainstContextFree: boolean;
  contextInfluencedFields: SemanticGroundingField[];
  rejectedContextFields: SemanticGroundingField[];
}
'''
assert old in s
s = s.replace(old, new, 1)
old = '  uncertainty: InterpretationUncertainty;\n  evidence: InterpretationEvidence[];\n}'
new = '  uncertainty: InterpretationUncertainty;\n  evidence: InterpretationEvidence[];\n  grounding?: SemanticGroundingTrace;\n}'
assert old in s
s = s.replace(old, new, 1)
p.write_text(s)

# 2) Preserve/sanitize additive grounding metadata through canonical normalization.
p = Path('src/services/semanticInterpretationSchema.ts')
s = p.read_text()
s = s.replace(
  '  type SemanticInterpretation,\n  type SemanticPrimaryIntent,',
  '  type SemanticInterpretation,\n  type SemanticGroundingField,\n  type SemanticGroundingTrace,\n  type SemanticPrimaryIntent,',
  1,
)
anchor = '''const RELATIONAL_ACTS = new Set<SemanticRelationalAct>([
  "none", "reassurance_seek", "repair_probe", "reconciliation_attempt", "challenge",
  "mockery", "closeness_bid",
]);
'''
insert = anchor + '''const GROUNDING_FIELDS = new Set<SemanticGroundingField>([
  "primaryIntent", "secondarySocialActs", "target", "valence", "severity",
  "affection", "support", "compliment", "emotionalLoad", "apology",
  "repairAttempt", "stopRequest", "socialRoutine", "discourseAct", "repairSignal",
  "adviceRequested", "knowledgeQuery", "selfMemoryQuery", "relationalAct",
  "stopQuestions", "stopTalking",
]);
'''
assert anchor in s
s = s.replace(anchor, insert, 1)
anchor = '''function normalizeEvidence(value: unknown): InterpretationEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): InterpretationEvidence[] => {
    if (!raw || typeof raw !== "object") return [];
    const e = raw as Record<string, unknown>;
    const source = e.source === "llm" || e.source === "regex" || e.source === "reconciled" ? e.source : "llm";
    return [{
      source,
      ...(typeof e.provider === "string" ? { provider: e.provider } : {}),
      cues: Array.isArray(e.cues) ? e.cues.filter((x): x is string => typeof x === "string").slice(0, 24) : [],
      confidence: clamp01(e.confidence),
    }];
  }).slice(0, 8);
}
'''
addition = anchor + '''function normalizeGrounding(value: unknown): SemanticGroundingTrace | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const fields = (raw: unknown): SemanticGroundingField[] => Array.isArray(raw)
    ? Array.from(new Set(raw.filter((x): x is SemanticGroundingField => GROUNDING_FIELDS.has(x as SemanticGroundingField))))
    : [];
  return {
    adjudicatedAgainstContextFree: asBool(v.adjudicatedAgainstContextFree),
    contextInfluencedFields: fields(v.contextInfluencedFields),
    rejectedContextFields: fields(v.rejectedContextFields),
  };
}
'''
assert anchor in s
s = s.replace(anchor, addition, 1)
old = '    uncertainty: normalizeUncertainty(v.uncertainty), evidence: normalizeEvidence(v.evidence),\n  };'
new = '    uncertainty: normalizeUncertainty(v.uncertainty), evidence: normalizeEvidence(v.evidence),\n    ...(normalizeGrounding(v.grounding) ? { grounding: normalizeGrounding(v.grounding) } : {}),\n  };'
assert old in s
s = s.replace(old, new, 1)
p.write_text(s)

# 3) Generalize provider adjudication into a field-level context-grounding seam.
p = Path('src/services/llmSemanticUnderstandingProvider.ts')
s = p.read_text()
s = s.replace(
  'import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticInterpretation } from "../types/semanticInterpretation";',
  'import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticGroundingField, type SemanticInterpretation } from "../types/semanticInterpretation";',
  1,
)
start = s.index('function isShortContextAdjudicationCandidate')
prefix = s[:start]
replacement = r'''function isShortContextAdjudicationCandidate(message: string, context?: LanguageUnderstandingContext): boolean {
  const token = message.trim();
  return Boolean(context?.recentMessages?.length) && /^[\p{L}\p{N}]{2,3}$/u.test(token);
}

function hasRecentContext(context?: LanguageUnderstandingContext): boolean {
  return Boolean(context?.recentMessages?.length);
}

function isSemanticallyOpaqueWithoutContext(interpretation: SemanticInterpretation): boolean {
  const severityPeak = Math.max(
    interpretation.severity.disrespect,
    interpretation.severity.coercion,
    interpretation.severity.manipulation,
    interpretation.severity.privacy,
    interpretation.severity.aggression,
  );
  const facets = interpretation.discourseFacets;
  return interpretation.primaryIntent === "other"
    && interpretation.secondarySocialActs.length === 0
    && interpretation.target === "unknown"
    && interpretation.valence === "neutral"
    && severityPeak <= 0.15
    && interpretation.affection <= 0.15
    && interpretation.support <= 0.15
    && interpretation.compliment <= 0.15
    && interpretation.emotionalLoad <= 0.25
    && !interpretation.apology
    && !interpretation.repairAttempt
    && !interpretation.stopRequest
    && facets.socialRoutine === "none"
    && facets.discourseAct === "none"
    && facets.repairSignal === "none"
    && !facets.adviceRequested
    && facets.knowledgeQuery === null
    && facets.selfMemoryQuery === null
    && facets.relationalAct === "none"
    && !facets.stopQuestions
    && !facets.stopTalking
    && interpretation.uncertainty.overall >= 0.7
    && interpretation.uncertainty.intent >= 0.7;
}

function contextInventsLexicalMeaning(
  baseline: SemanticInterpretation,
  contextual: SemanticInterpretation,
): boolean {
  const baselineFacets = baseline.discourseFacets;
  const contextualFacets = contextual.discourseFacets;
  const contextualSeverityPeak = Math.max(
    contextual.severity.disrespect,
    contextual.severity.coercion,
    contextual.severity.manipulation,
    contextual.severity.privacy,
    contextual.severity.aggression,
  );
  return contextual.primaryIntent !== baseline.primaryIntent
    || contextual.secondarySocialActs.length > 0
    || contextual.valence !== baseline.valence
    || contextualSeverityPeak > 0.2
    || contextual.affection > baseline.affection + 0.2
    || contextual.support > baseline.support + 0.2
    || contextual.compliment > baseline.compliment + 0.2
    || contextual.emotionalLoad > baseline.emotionalLoad + 0.35
    || contextual.apology !== baseline.apology
    || contextual.repairAttempt !== baseline.repairAttempt
    || contextual.stopRequest !== baseline.stopRequest
    || contextualFacets.socialRoutine !== baselineFacets.socialRoutine
    || contextualFacets.discourseAct !== baselineFacets.discourseAct
    || contextualFacets.repairSignal !== baselineFacets.repairSignal
    || contextualFacets.adviceRequested !== baselineFacets.adviceRequested
    || contextualFacets.knowledgeQuery !== null
    || contextualFacets.selfMemoryQuery !== null
    || contextualFacets.relationalAct !== baselineFacets.relationalAct
    || contextualFacets.stopQuestions !== baselineFacets.stopQuestions
    || contextualFacets.stopTalking !== baselineFacets.stopTalking;
}

function preserveOnlyContextualReferent(
  baseline: SemanticInterpretation,
  contextual: SemanticInterpretation,
): SemanticInterpretation {
  if (contextual.target === "unknown" || contextual.target === baseline.target) return baseline;
  return {
    ...baseline,
    target: contextual.target,
    uncertainty: {
      ...baseline.uncertainty,
      target: Math.min(baseline.uncertainty.target, contextual.uncertainty.target),
    },
  };
}

function fieldValue(interpretation: SemanticInterpretation, field: SemanticGroundingField): unknown {
  switch (field) {
    case "socialRoutine": return interpretation.discourseFacets.socialRoutine;
    case "discourseAct": return interpretation.discourseFacets.discourseAct;
    case "repairSignal": return interpretation.discourseFacets.repairSignal;
    case "adviceRequested": return interpretation.discourseFacets.adviceRequested;
    case "knowledgeQuery": return interpretation.discourseFacets.knowledgeQuery;
    case "selfMemoryQuery": return interpretation.discourseFacets.selfMemoryQuery;
    case "relationalAct": return interpretation.discourseFacets.relationalAct;
    case "stopQuestions": return interpretation.discourseFacets.stopQuestions;
    case "stopTalking": return interpretation.discourseFacets.stopTalking;
    default: return interpretation[field];
  }
}

const GROUNDING_FIELDS: SemanticGroundingField[] = [
  "primaryIntent", "secondarySocialActs", "target", "valence", "severity",
  "affection", "support", "compliment", "emotionalLoad", "apology", "repairAttempt",
  "stopRequest", "socialRoutine", "discourseAct", "repairSignal", "adviceRequested",
  "knowledgeQuery", "selfMemoryQuery", "relationalAct", "stopQuestions", "stopTalking",
];

function sameSemanticValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function collectContextInfluencedFields(
  baseline: SemanticInterpretation,
  contextual: SemanticInterpretation,
): SemanticGroundingField[] {
  return GROUNDING_FIELDS.filter((field) => !sameSemanticValue(fieldValue(baseline, field), fieldValue(contextual, field)));
}

function withGrounding(
  interpretation: SemanticInterpretation,
  contextInfluencedFields: SemanticGroundingField[],
  rejectedContextFields: SemanticGroundingField[],
): SemanticInterpretation {
  return {
    ...interpretation,
    grounding: {
      adjudicatedAgainstContextFree: true,
      contextInfluencedFields,
      rejectedContextFields,
    },
  };
}

function shouldAdjudicateContextGrounding(
  message: string,
  context: LanguageUnderstandingContext | undefined,
  contextual: SemanticInterpretation,
): boolean {
  if (!hasRecentContext(context)) return false;
  return isShortContextAdjudicationCandidate(message, context)
    || contextual.discourseFacets.socialRoutine !== "none";
}

function reconcileContextGrounding(
  message: string,
  contextFree: SemanticInterpretation,
  contextual: SemanticInterpretation,
): SemanticInterpretation {
  const influenced = collectContextInfluencedFields(contextFree, contextual);

  if (
    isShortContextAdjudicationCandidate(message, { recentMessages: [{ role: "user", content: "context" }] })
    && isSemanticallyOpaqueWithoutContext(contextFree)
    && contextInventsLexicalMeaning(contextFree, contextual)
  ) {
    const result = preserveOnlyContextualReferent(contextFree, contextual);
    const rejected = influenced.filter((field) => field !== "target");
    return withGrounding(result, influenced, rejected);
  }

  const contextFreeRoutineIsGrounded =
    contextFree.uncertainty.overall <= 0.35
    && contextFree.uncertainty.intent <= 0.35;
  const routineDrift =
    contextual.discourseFacets.socialRoutine !== contextFree.discourseFacets.socialRoutine;

  if (routineDrift && contextFreeRoutineIsGrounded) {
    const rejected: SemanticGroundingField[] = ["socialRoutine"];
    const primaryIntentDrift = contextual.primaryIntent !== contextFree.primaryIntent;
    if (primaryIntentDrift) rejected.push("primaryIntent");
    return withGrounding({
      ...contextual,
      ...(primaryIntentDrift ? { primaryIntent: contextFree.primaryIntent } : {}),
      discourseFacets: {
        ...contextual.discourseFacets,
        socialRoutine: contextFree.discourseFacets.socialRoutine,
      },
    }, influenced, rejected);
  }

  return withGrounding(contextual, influenced, []);
}

export function createLlmSemanticUnderstandingProvider(options: LlmSemanticProviderOptions): SemanticUnderstandingProvider {
  const interpretOnce = async (
    message: string,
    morphology: TurkishMorphologyResult | undefined,
    context: LanguageUnderstandingContext | undefined,
  ): Promise<SemanticInterpretation> => {
    const prompt = `MESAJ:\n${message}\n\nMORFOLOJİ:\n${compactMorphology(morphology)}\n\nSON BAĞLAM:\n${compactContext(context)}\n\nKullanıcı adı: ${context?.userName ?? "bilinmiyor"}\nKarakter adı: ${context?.characterName ?? "Kaira"}`;
    const raw = await options.generate({ system: SYSTEM, prompt, temperature: 0.05 });
    const parsed = extractJson(raw) as Record<string, unknown>;
    parsed.raw = message;
    if (parsed.schemaVersion !== SEMANTIC_INTERPRETATION_SCHEMA_VERSION || !isSemanticInterpretation(parsed)) {
      throw new Error("LLM semantic parser incomplete/invalid SemanticInterpretation@2 returned.");
    }
    const normalized = enforceProviderFieldInvariants(
      normalizeSemanticInterpretation(parsed, message),
      context,
    );
    normalized.evidence = normalized.evidence.length
      ? normalized.evidence.map((e) => ({ ...e, source: "llm", provider: e.provider ?? options.name ?? "llm_semantic_parser_v2" }))
      : [{ source: "llm", provider: options.name ?? "llm_semantic_parser_v2", cues: [], confidence: Math.max(0, 1 - normalized.uncertainty.overall) }];
    return normalized;
  };

  return {
    name: options.name ?? "llm_semantic_parser_v2",
    async interpret({ message, morphology, context }): Promise<SemanticInterpretation> {
      const contextual = await interpretOnce(message, morphology, context);
      if (!shouldAdjudicateContextGrounding(message, context, contextual)) return contextual;
      const contextFree = await interpretOnce(message, morphology, { ...context, recentMessages: [] });
      return reconcileContextGrounding(message, contextFree, contextual);
    },
  };
}
'''
p.write_text(prefix + replacement)

# 4) Regression tests: provider grounding + normalization preservation.
Path('src/services/semanticContextGroundingRegression.test.ts').write_text(r'''import { describe, expect, it, vi } from "vitest";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticInterpretation } from "../types/semanticInterpretation";

function semantic(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw: "x",
    normalized: "x",
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
    uncertainty: { overall: 0.2, intent: 0.2, target: 0.2, severity: 0.2 },
    evidence: [{ source: "llm", cues: [], confidence: 0.8 }],
    ...overrides,
  };
}

const warmContext = {
  userName: "Mert",
  characterName: "Kaira",
  recentMessages: [
    { role: "user" as const, content: "naber" },
    { role: "assistant" as const, content: "iyi valla sen nasılsın" },
  ],
};

describe("semantic context grounding regression", () => {
  it("rejects prior-turn socialRoutine projection while preserving current-turn smalltalk", async () => {
    const contextual = semantic({
      raw: "iyi maç izliyorum",
      normalized: "iyi maç izliyorum",
      primaryIntent: "greeting",
      discourseFacets: {
        ...semantic().discourseFacets,
        socialRoutine: "how_are_you",
      },
      uncertainty: { overall: 0.18, intent: 0.18, target: 0.3, severity: 0.2 },
    });
    const contextFree = semantic({
      raw: "iyi maç izliyorum",
      normalized: "iyi maç izliyorum",
      primaryIntent: "smalltalk",
      target: "event",
      valence: "positive",
      uncertainty: { overall: 0.2, intent: 0.2, target: 0.25, severity: 0.2 },
    });
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(contextual))
      .mockResolvedValueOnce(JSON.stringify(contextFree));
    const provider = createLlmSemanticUnderstandingProvider({ generate });

    const result = await understandTurkishMessage("iyi maç izliyorum", {
      semanticProvider: provider,
      context: warmContext,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("none");
    expect(result.interpretation.grounding?.adjudicatedAgainstContextFree).toBe(true);
    expect(result.interpretation.grounding?.contextInfluencedFields).toEqual(expect.arrayContaining(["primaryIntent", "socialRoutine"]));
    expect(result.interpretation.grounding?.rejectedContextFields).toEqual(expect.arrayContaining(["primaryIntent", "socialRoutine"]));
  });

  it("keeps a real current-turn routine when context-free and contextual readings agree", async () => {
    const naber = semantic({
      raw: "naber",
      normalized: "naber",
      primaryIntent: "greeting",
      discourseFacets: { ...semantic().discourseFacets, socialRoutine: "how_are_you" },
      uncertainty: { overall: 0.1, intent: 0.1, target: 0.2, severity: 0.1 },
    });
    const generate = vi.fn().mockResolvedValue(JSON.stringify(naber));
    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const result = await understandTurkishMessage("naber", { semanticProvider: provider, context: warmContext });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.interpretation.primaryIntent).toBe("greeting");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("how_are_you");
    expect(result.interpretation.grounding?.rejectedContextFields).toEqual([]);
  });

  it("keeps short-token non-invention on the same grounding seam", async () => {
    const contextual = semantic({
      raw: "sg",
      normalized: "sg",
      primaryIntent: "smalltalk",
      secondarySocialActs: ["affection", "closeness_bid"],
      target: "kaira",
      valence: "positive",
      affection: 0.75,
      discourseFacets: { ...semantic().discourseFacets, socialRoutine: "thanks", relationalAct: "closeness_bid", relationalIntensity: 0.5 },
      uncertainty: { overall: 0.5, intent: 0.5, target: 0.4, severity: 0.2 },
    });
    const contextFree = semantic({
      raw: "sg",
      normalized: "sg",
      primaryIntent: "other",
      target: "unknown",
      valence: "neutral",
      uncertainty: { overall: 0.8, intent: 0.8, target: 0.8, severity: 0.5 },
    });
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(contextual))
      .mockResolvedValueOnce(JSON.stringify(contextFree));
    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const result = await understandTurkishMessage("sg", { semanticProvider: provider, context: warmContext });

    expect(result.interpretation.primaryIntent).toBe("other");
    expect(result.interpretation.valence).toBe("neutral");
    expect(result.interpretation.affection).toBe(0);
    expect(result.interpretation.grounding?.rejectedContextFields).toContain("primaryIntent");
    expect(result.interpretation.grounding?.rejectedContextFields).toContain("socialRoutine");
  });
});
''')

# 5) Architecture record.
Path('docs/adr/0020-semantic-context-grounding-provenance.md').write_text('''# ADR-0020: Canonical semantic context grounding provenance\n\n## Status\nAccepted\n\n## Context\nThree production findings exposed the same missing dimension: a canonical semantic value could be correct or incorrect without recording whether it came from the current utterance or was introduced by conversational history. Short opaque `sg` gained invented thanks/affection under warm context, and `iyi maç izliyorum` was repeatedly relabeled as `greeting/how_are_you` solely because the previous assistant turn asked how the user was. The schema defines `socialRoutine` as a current-utterance facet, not the role of the previous adjacency pair.\n\n## Decision\nKeep `SemanticInterpretation@2` as the canonical authority and add an optional provider-computed `grounding` trace. The trace records that a context-free counterfactual adjudication occurred, which canonical fields changed under history, and which context-induced field changes were rejected. It is observational provenance, not a second semantic authority.\n\nThe existing short-token non-invention adjudication and the social-routine projection check now share this field-level grounding seam. Context-free adjudication stays bounded: it runs only on the existing short-token surface or when the contextual provider claims a social routine. A confident context-free current-turn social-routine reading wins over a conflicting history-induced routine; genuine routines such as `naber` remain unchanged when both readings agree.\n\n## Consequences\n- `socialRoutine` can no longer be copied from the previous adjacency pair when the current turn confidently says otherwise.\n- The short-token `sg` guard is no longer an isolated mechanism; it is one consumer of the same provenance seam.\n- KNT/debug and future policy work can inspect which semantic fields were history-influenced or rejected without reparsing raw text.\n- No schema-version reset, second semantic classifier, or topic-specific lexical rule is introduced.\n- If future findings require provenance for more fields, extend the grounding seam rather than adding independent context heuristics.\n''')
