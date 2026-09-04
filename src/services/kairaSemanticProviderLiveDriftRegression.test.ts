import { describe, expect, it } from "vitest";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import {
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type SemanticInterpretation,
} from "../types/semanticInterpretation";

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
    evidence: [{ source: "llm", provider: "test", cues: ["fixture"], confidence: 0.8 }],
  };
}

async function run(output: SemanticInterpretation, context?: Array<{ role: "user" | "assistant"; content: string }>) {
  let system = "";
  const provider = createLlmSemanticUnderstandingProvider({
    generate: async (input) => {
      system = input.system;
      return JSON.stringify(output);
    },
    name: "measured-live-drift",
  });
  const interpretation = await provider.interpret({
    message: output.raw,
    context: { userName: "Ali", characterName: "Kaira", recentMessages: context },
  });
  return { interpretation, system };
}

describe("measured live semantic-provider drift regression", () => {
  it("cannot manufacture repair without a prior assistant turn and compatible discourse act", async () => {
    const output = base("bu cevap saçma olmuş");
    output.primaryIntent = "complaint";
    output.discourseFacets.discourseAct = "correction";
    output.discourseFacets.repairSignal = "clarification_request";

    const { interpretation } = await run(output);
    expect(interpretation.primaryIntent).toBe("complaint");
    expect(interpretation.discourseFacets.repairSignal).toBe("none");
  });

  it("preserves a typed clarification repair only with assistant context and confusion/challenge semantics", async () => {
    const output = base("nasıl yani");
    output.primaryIntent = "question";
    output.target = "kaira";
    output.discourseFacets.discourseAct = "confusion_or_challenge";
    output.discourseFacets.repairSignal = "clarification_request";

    const { interpretation } = await run(output, [{ role: "assistant", content: "bence bugün gitmez" }]);
    expect(interpretation.discourseFacets.repairSignal).toBe("clarification_request");
  });

  it("keeps stop-request social act consistent with the canonical full-conversation stop flag", async () => {
    const output = base("soru sorma artık");
    output.primaryIntent = "command";
    output.target = "kaira";
    output.secondarySocialActs = ["stop_request"];
    output.stopRequest = true;
    output.discourseFacets.stopQuestions = true;
    output.discourseFacets.stopTalking = false;

    const { interpretation } = await run(output);
    expect(interpretation.discourseFacets.stopQuestions).toBe(true);
    expect(interpretation.discourseFacets.stopTalking).toBe(false);
    expect(interpretation.stopRequest).toBe(false);
    expect(interpretation.secondarySocialActs).not.toContain("stop_request");
  });

  it("locks the measured prompt corrections for complaint, third-party insult and lone lexical hostility", async () => {
    const { system } = await run(base("kontrol"));
    expect(system).toContain('"bu cevap saçma olmuş"');
    expect(system).toContain("repairSignal:none");
    expect(system).toContain("secondarySocialActs içinde insult KORUNUR");
    expect(system).toContain("uncertainty.overall EN AZ 0.70");
    expect(system).toContain("secondarySocialActs içinde stop_request YOK");
  });
});
