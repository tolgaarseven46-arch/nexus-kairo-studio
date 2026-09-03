import { describe, expect, it, vi } from "vitest";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticInterpretation } from "../types/semanticInterpretation";

function base(message: string): SemanticInterpretation {
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw: message,
    normalized: message.toLocaleLowerCase("tr-TR"),
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "unknown",
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: 0.8,
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
    evidence: [{ source: "llm", provider: "recorded-fixture", cues: ["fixture"], confidence: 0.8 }],
  };
}

const cases: Array<{
  name: string;
  message: string;
  context?: Array<{ role: "user" | "assistant"; content: string }>;
  output: SemanticInterpretation;
  assert: (value: SemanticInterpretation) => void;
}> = [
  {
    name: "social routine",
    message: "naber kaira",
    output: {
      ...base("naber kaira"),
      primaryIntent: "greeting",
      target: "kaira",
      discourseFacets: { ...base("naber kaira").discourseFacets, socialRoutine: "how_are_you" },
    },
    assert: (i) => {
      expect(i.primaryIntent).toBe("greeting");
      expect(i.discourseFacets.socialRoutine).toBe("how_are_you");
      expect(i.target).toBe("kaira");
    },
  },
  {
    name: "emotional opening",
    message: "moralim bozuk",
    output: {
      ...base("moralim bozuk"),
      primaryIntent: "emotional_share",
      valence: "negative",
      emotionalLoad: 0.65,
      discourseFacets: { ...base("moralim bozuk").discourseFacets, socialRoutine: "emotional_opening" },
    },
    assert: (i) => {
      expect(i.primaryIntent).toBe("emotional_share");
      expect(i.discourseFacets.socialRoutine).toBe("emotional_opening");
      expect(i.discourseFacets.adviceRequested).toBe(false);
      expect(i.emotionalLoad).toBeGreaterThanOrEqual(0.6);
    },
  },
  {
    name: "generic complaint without repair",
    message: "bu cevap saçma olmuş",
    output: {
      ...base("bu cevap saçma olmuş"),
      primaryIntent: "complaint",
      target: "kaira",
      valence: "negative",
      severity: { ...base("bu cevap saçma olmuş").severity, aggression: 0.2 },
      discourseFacets: { ...base("bu cevap saçma olmuş").discourseFacets, discourseAct: "confusion_or_challenge" },
    },
    assert: (i) => {
      expect(i.primaryIntent).toBe("complaint");
      expect(i.discourseFacets.discourseAct).toBe("confusion_or_challenge");
      expect(i.discourseFacets.repairSignal).toBe("none");
    },
  },
  {
    name: "typed clarification repair signal",
    message: "nasıl yani",
    context: [{ role: "assistant", content: "bence bugün gitmez" }],
    output: {
      ...base("nasıl yani"),
      primaryIntent: "complaint",
      target: "kaira",
      discourseFacets: {
        ...base("nasıl yani").discourseFacets,
        discourseAct: "confusion_or_challenge",
        repairSignal: "clarification_request",
      },
    },
    assert: (i) => {
      expect(i.discourseFacets.discourseAct).toBe("confusion_or_challenge");
      expect(i.discourseFacets.repairSignal).toBe("clarification_request");
    },
  },
  {
    name: "conversation recall",
    message: "Mert yarın ne yapacaktı?",
    context: [{ role: "user", content: "Mert yarın istifa edeceğini söyledi" }],
    output: {
      ...base("Mert yarın ne yapacaktı?"),
      primaryIntent: "question",
      target: "third_party",
      discourseFacets: { ...base("Mert yarın ne yapacaktı?").discourseFacets, discourseAct: "recall_request" },
    },
    assert: (i) => {
      expect(i.primaryIntent).toBe("question");
      expect(i.target).toBe("third_party");
      expect(i.discourseFacets.discourseAct).toBe("recall_request");
    },
  },
  {
    name: "third-party reported insult",
    message: "Mert bana salak dedi",
    output: {
      ...base("Mert bana salak dedi"),
      secondarySocialActs: ["insult"],
      target: "third_party",
      valence: "negative",
      severity: { ...base("Mert bana salak dedi").severity, disrespect: 0.7 },
    },
    assert: (i) => {
      expect(i.target).toBe("third_party");
      expect(i.secondarySocialActs).toContain("insult");
      expect(projectSemanticEvent(i).target).toBe("third_party");
    },
  },
  {
    name: "lone insult word remains candidate-only",
    message: "salak",
    output: {
      ...base("salak"),
      primaryIntent: "other",
      valence: "negative",
      target: "unknown",
      severity: { ...base("salak").severity, disrespect: 0.2 },
      uncertainty: { overall: 0.78, intent: 0.72, target: 0.9, severity: 0.75, ambiguousReadings: ["hakaret adayı", "alıntı/ünlem"] },
      evidence: [{ source: "llm", provider: "recorded-fixture", cues: ["tek hedef-belirsiz sözcük"], confidence: 0.35 }],
    },
    assert: (i) => {
      expect(i.target).toBe("unknown");
      expect(i.primaryIntent).not.toBe("insult");
      expect(i.secondarySocialActs).not.toContain("insult");
      expect(i.uncertainty.overall).toBeGreaterThan(0.6);
      expect(projectSemanticEvent(i).insult).toBe(false);
    },
  },
  {
    name: "explicit stop questions only",
    message: "soru sorma artık",
    output: {
      ...base("soru sorma artık"),
      primaryIntent: "command",
      target: "kaira",
      discourseFacets: { ...base("soru sorma artık").discourseFacets, stopQuestions: true },
    },
    assert: (i) => {
      expect(i.discourseFacets.stopQuestions).toBe(true);
      expect(i.discourseFacets.stopTalking).toBe(false);
      expect(i.stopRequest).toBe(false);
    },
  },
  {
    name: "explicit advice request over emotional sharing",
    message: "moralim bozuk, sence ne yapayım?",
    output: {
      ...base("moralim bozuk, sence ne yapayım?"),
      primaryIntent: "emotional_share",
      valence: "negative",
      emotionalLoad: 0.65,
      discourseFacets: {
        ...base("moralim bozuk, sence ne yapayım?").discourseFacets,
        socialRoutine: "emotional_opening",
        adviceRequested: true,
      },
    },
    assert: (i) => {
      expect(i.primaryIntent).toBe("emotional_share");
      expect(i.discourseFacets.socialRoutine).toBe("emotional_opening");
      expect(i.discourseFacets.adviceRequested).toBe(true);
    },
  },
];

describe("semantic provider canonical quality matrix", () => {
  it.each(cases)("preserves recorded field semantics: $name", async ({ message, context, output, assert }) => {
    let system = "";
    const generate = vi.fn(async (input: { system: string }) => {
      system = input.system;
      return JSON.stringify(output);
    });
    const provider = createLlmSemanticUnderstandingProvider({ generate, name: "quality-matrix" });
    const interpretation = await provider.interpret({
      message,
      context: { userName: "Ali", characterName: "Kaira", recentMessages: context },
    });

    assert(interpretation);
    expect(interpretation.raw).toBe(message);
    expect(interpretation.evidence.every((item) => item.source === "llm")).toBe(true);
    expect(system).toContain("DISCOURSE FACET OPERASYONEL EŞLEMELERİ");
  });

  it("locks producer-side cue semantics instead of asking downstream policy to guess them", async () => {
    let system = "";
    const provider = createLlmSemanticUnderstandingProvider({
      generate: async (input) => {
        system = input.system;
        return JSON.stringify(base("kontrol"));
      },
    });
    await provider.interpret({ message: "kontrol" });

    expect(system).toContain('"nasıl yani"');
    expect(system).toContain("repairSignal:clarification_request");
    expect(system).toContain('"ne alaka"');
    expect(system).toContain("repairSignal:relevance_challenge");
    expect(system).toContain('"Mert yarın ne yapacaktı?"');
    expect(system).toContain('"soru sorma artık"');
    expect(system).toContain('"sus artık"');
    expect(system).toContain("adviceRequested:true");
    expect(system).toMatch(/hedefi belirsiz tek hakaret[^\n]+primaryIntent:other/iu);
  });
});
