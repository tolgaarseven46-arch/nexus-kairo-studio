import { describe, expect, it } from "vitest";
import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";
import { DEFAULT_PERSONALITY_TRAITS } from "./droitPersonalityService";
import {
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";
import { tryLocalKairoReply } from "./kairoLocalLanguageEngine";

const state = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 55,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin",
  relationship: {
    interactionCount: 1,
    familiarityDays: 0,
    warmth: 50,
    trust: 50,
    conflictScore: 0,
    hurtScore: 0,
    repeatedNegativeCount: 0,
  },
} as DroitDynamicState;

const trace = {
  messageInterpretation: {
    intent: "duygusal_paylasim",
    sentiment: "duygusal_yük",
  },
  decision: { chosenTone: "doğal" },
} as ReasoningTrace;

describe("Kaira local emotional language", () => {
  it.each([
    "bugün moralim biraz bozuk ya",
    "hiç havamda değilim",
    "kafam bozuk",
    "modum yok",
    "modum yo",
    "moodum düşük",
    "canım sıkkın",
  ])("answers the low-mood opening locally: %s", (message) => {
    const plan = planDialogueResponse([], message, "Mert");
    const result = tryLocalKairoReply(
      message,
      DEFAULT_PERSONALITY_TRAITS,
      state,
      trace,
      `local-${message}`,
      plan.move,
    );

    expect(result).toMatchObject({
      handled: true,
      intent: "emotional_opening",
      source: "local_language",
    });
    expect(findDialogueDecisionIssues(result.reply || "", plan)).toEqual([]);
  });

  it("leaves an explicit advice request to AI", () => {
    const message = "modum yok ne yapmalıyım";
    const plan = planDialogueResponse([], message, "Mert");
    const result = tryLocalKairoReply(
      message,
      DEFAULT_PERSONALITY_TRAITS,
      state,
      trace,
      "advice-user",
      plan.move,
    );

    expect(result.handled).toBe(false);
    expect(result.source).toBe("ai");
  });
});
