import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { projectCanonicalBehaviorSituations } from "./behaviorSituationProjection";
import type { SemanticInterpretation } from "../types/semanticInterpretation";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

const baseInterpretation = (overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation => ({
  schemaVersion: "semantic-interpretation@2",
  raw: "fixture",
  normalized: "fixture",
  primaryIntent: "smalltalk",
  secondarySocialActs: [],
  target: "unknown",
  valence: "neutral",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.5,
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
  evidence: [],
  ...overrides,
});

describe("canonical behavior situation projection", () => {
  it("keeps third-party hostility out of dyadic personality/social hostility", () => {
    const interpretation = baseInterpretation({
      primaryIntent: "insult",
      target: "third_party",
      valence: "negative",
      severity: { disrespect: 0.95, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.8 },
      secondarySocialActs: ["insult"],
    });
    const projected = projectCanonicalBehaviorSituations(interpretation);
    expect(projected.personality.conflict).toBe(0.1);
    expect(projected.social.challengeSignal).toBe(0.1);
    expect(projected.expression.hostileContext).toBe(0);
    expect(projected.values.disrespect).toBe(0.95);
  });

  it("projects direct Kaira hostility from canonical severity", () => {
    const interpretation = baseInterpretation({
      primaryIntent: "insult",
      target: "kaira",
      valence: "negative",
      severity: { disrespect: 0.9, coercion: 0.4, manipulation: 0, privacy: 0, aggression: 0.7 },
      secondarySocialActs: ["insult", "coercion"],
    });
    const projected = projectCanonicalBehaviorSituations(interpretation);
    expect(projected.personality.conflict).toBe(0.9);
    expect(projected.motivation.autonomyThreat).toBe(0.4);
    expect(projected.social.coercionSignal).toBe(0.4);
    expect(projected.expression.hostileContext).toBe(1);
  });

  it("forbids raw-text reparsing inside downstream behavior engines", () => {
    const files = [
      "src/services/personalityTendencyEngine.ts",
      "src/services/motivationEngine.ts",
      "src/services/valueEngine.ts",
      "src/services/preferenceEngine.ts",
      "src/services/socialOrientationEngine.ts",
      "src/services/expressionStyleEngine.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/toLocaleLowerCase|RegExp|\.test\(/u);
      expect(source).not.toMatch(/infer(?:Personality|Motivation|Value|Preference|Social)Situation/u);
    }
    const projection = read("src/services/behaviorSituationProjection.ts");
    expect(projection).not.toMatch(/\.raw\b|\.normalized\b|RegExp|\.test\(/u);
  });

  it("wires one canonical situation projection into the client behavior chain", () => {
    const client = read("src/services/droitChatService.ts");
    expect(client).toContain('import { projectCanonicalBehaviorSituations } from "./behaviorSituationProjection"');
    expect(client).toContain("projectCanonicalBehaviorSituations(languageUnderstanding.interpretation)");
    expect(client).toContain("applyPersonalityTendencies(personality, fineTune, behaviorSituations.personality)");
    expect(client).toContain("applyMotivations(personalityRuntime.personality, fineTune, behaviorSituations.motivation)");
    expect(client).toContain("applyValues(motivationRuntime.personality, fineTune, behaviorSituations.values)");
    expect(client).toContain("applyPreferences(valueRuntime.personality, fineTune, behaviorSituations.preferences)");
    expect(client).toContain("applySocialOrientation(preferenceRuntime.personality, fineTune, behaviorSituations.social, temperamentAdjustedState)");
    expect(client).toContain("applyExpressionStyle(boundaryRuntime.personality, fineTune, behaviorSituations.expression, temperamentAdjustedState)");
  });
});
