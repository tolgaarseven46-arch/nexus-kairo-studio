/**
 * ADR-0006 §1 — the lexical/regex floor must not stamp a message as heavy
 * insult from a single dictionary hit. A slur/insult word is graded BY CONTEXT
 * (target, joking/sincerity confidence, question framing, affectionate framing,
 * length, repetition) and only a genuinely pointed, sincere, sustained hostility
 * reaches the reducer's hard-stop gate.
 *
 * This proves the five classes are distinguished:
 *   - close friend + harsh joke        -> no hard-stop
 *   - post-apology calming             -> no hard-stop
 *   - same word as serious insult      -> hard-stop
 *   - same word as banter              -> no hard-stop
 *   - repeated real boundary violation -> hard-stop, amplified
 */

import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { evaluateRedline, type RelationshipTurnSignal } from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

function signalOf(message: string): RelationshipTurnSignal {
  const i = interpretationFromRegexFloor(message);
  return {
    valence: i.valence,
    targetsKaira: i.target === "kaira",
    severity: i.severity,
    jokingConfidence: i.jokingConfidence,
    sincerityConfidence: i.sincerityConfidence,
    apology: i.apology,
    repairAttempt: i.repairAttempt,
    support: i.support,
    compliment: i.compliment,
    affection: i.affection,
    userStop: false,
    uncertainty: i.uncertainty.overall,
    negativePattern: i.valence === "negative" ? "insult" : null,
  };
}

const prev = (repeatedNegativeCount = 0, boundarySetByKaira = false) => ({
  scores: { repeatedNegativeCount },
  conversationState: "active" as const,
  reactionMode: "neutral" as const,
  affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
  boundarySetByKaira,
});

const hardStops = (message: string, repeated = 0, boundary = false) =>
  evaluateRedline(signalOf(message), prev(repeated, boundary), DEFAULT_RELATIONSHIP_REDUCER_CONFIG).disengage;

describe("semantic context grading — single word / slang / banter must not self-stamp as heavy insult", () => {
  it("a bare slur with no context does not hard-stop (Decision #1)", () => {
    expect(hardStops("orospu")).toBe(false);
    expect(hardStops("kaşar")).toBe(false);
  });

  it("a teasing question containing a slur does not hard-stop", () => {
    expect(hardStops("neden sen kaşar değilmisin")).toBe(false);
    expect(hardStops("sen kaşar mısın ya")).toBe(false);
  });

  it("close friend + harsh joke: slur in an affectionate/joke frame does not hard-stop", () => {
    expect(hardStops("kanka kaşar mısın sen 😂")).toBe(false);
    expect(hardStops("hahaha ne kaşarsın ya")).toBe(false);
  });

  it("post-apology calming: an apology after conflict never hard-stops, even with history", () => {
    expect(hardStops("özür dilerim ya", 3, true)).toBe(false);
    expect(hardStops("tamam özür, haklısın", 3, true)).toBe(false);
  });

  it("same word as a POINTED serious insult DOES hard-stop", () => {
    expect(hardStops("sen tam bir orospusun iğrençsin")).toBe(true);
    expect(hardStops("sen kaşarsın")).toBe(true);
    expect(hardStops("sen aptalsın ya")).toBe(true);
  });

  it("a slur reported as third-party speech does not hard-stop the Kaira relationship", () => {
    expect(hardStops("bana orospu dedi o adam")).toBe(false);
  });

  it("repeated real boundary violation hard-stops and the score is amplified vs the first time", () => {
    const first = evaluateRedline(signalOf("sen tam bir orospusun iğrençsin"), prev(0, false), DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    const repeat = evaluateRedline(signalOf("sen tam bir orospusun iğrençsin"), prev(2, true), DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(first.disengage).toBe(true);
    expect(repeat.disengage).toBe(true);
    expect(repeat.score).toBeGreaterThan(first.score);
  });

  it("the grader emits a severity VECTOR: pointed slur is disrespect-dominant, coercive demand is coercion-dominant", () => {
    const slur = interpretationFromRegexFloor("sen kaşarsın");
    const demand = interpretationFromRegexFloor("dediğimi yap, zorundasın");
    expect(slur.severity.disrespect).toBeGreaterThan(slur.severity.coercion);
    expect(demand.severity.coercion).toBeGreaterThan(demand.severity.disrespect);
  });

  it("joke framing raises jokingConfidence and lowers sincerityConfidence vs a pointed insult", () => {
    const joke = interpretationFromRegexFloor("kaşar mısın sen 😂");
    const pointed = interpretationFromRegexFloor("sen tam bir kaşarsın");
    expect(joke.jokingConfidence).toBeGreaterThan(pointed.jokingConfidence);
    expect(joke.sincerityConfidence).toBeLessThan(pointed.sincerityConfidence);
  });
});

/**
 * PR #26 step 3–4 minimal repro set. The same slur stem ("kaşar") across five
 * contexts must land in five different places. A lexical hit is only a CANDIDATE
 * signal: it produces neither high severity nor a hard-stop until independent
 * hostility evidence (pointed address, serious-conflict framing) resolves it.
 */
describe("kaşar minimal repro — one stem, five contexts", () => {
  it("'kaşar ekmek' is food: no disrespect, no attack act, not aimed at Kaira", () => {
    const i = interpretationFromRegexFloor("kaşar ekmek");
    expect(i.severity.disrespect).toBeLessThan(0.1);
    expect(i.target).not.toBe("kaira");
    expect(i.secondarySocialActs).not.toContain("insult");
    expect(hardStops("kaşar ekmek")).toBe(false);
  });

  it("'kaşarlı tost' / 'kaşar peyniri severim' are food: disrespect ~0", () => {
    expect(interpretationFromRegexFloor("kaşarlı tost").severity.disrespect).toBeLessThan(0.1);
    expect(interpretationFromRegexFloor("kaşar peyniri severim").severity.disrespect).toBeLessThan(0.1);
    expect(hardStops("kaşarlı tost")).toBe(false);
  });

  it("'sen kaşarsın' is a pointed insult: disrespect-dominant, aimed at Kaira, hard-stops", () => {
    const i = interpretationFromRegexFloor("sen kaşarsın");
    expect(i.severity.disrespect).toBeGreaterThan(0.7);
    expect(i.target).toBe("kaira");
    expect(i.secondarySocialActs).toContain("insult");
    expect(hardStops("sen kaşarsın")).toBe(true);
  });

  it("close friend + 'ulan kaşar 😂': banter/insult ambiguity is preserved, no hard-stop", () => {
    const i = interpretationFromRegexFloor("ulan kaşar 😂");
    // non-zero (the possibility is visible) but far below the severity gate
    expect(i.severity.disrespect).toBeGreaterThan(0);
    expect(i.severity.disrespect).toBeLessThan(DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline.minPresentSeverity);
    expect(i.jokingConfidence).toBeGreaterThan(0.5);
    expect(i.uncertainty.overall).toBeGreaterThan(0.6);
    expect(hardStops("ulan kaşar 😂")).toBe(false);
  });

  it("'seninle ciddi ciddi kavga edeceğiz kaşar herif': serious-fight framing → real disrespect + hard-stop", () => {
    const i = interpretationFromRegexFloor("seninle ciddi ciddi kavga edeceğiz kaşar herif");
    expect(i.severity.disrespect).toBeGreaterThan(0.7);
    expect(i.target).toBe("kaira");
    expect(i.jokingConfidence).toBeLessThan(0.2);
    expect(hardStops("seninle ciddi ciddi kavga edeceğiz kaşar herif")).toBe(true);
  });

  it("a lone 'kaşar' is a candidate only: ambiguous, wide uncertainty, never a lone hard-stop", () => {
    const i = interpretationFromRegexFloor("kaşar");
    expect(i.severity.disrespect).toBeLessThan(DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline.minPresentSeverity);
    expect(i.uncertainty.overall).toBeGreaterThan(0.6);
    expect(hardStops("kaşar")).toBe(false);
  });
});
