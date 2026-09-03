/**
 * emotional_load wiring regression.
 *
 * Deterministic ordinary chat stays at zero. Canonical LLM measurements now
 * cross into the legacy/runtime event only through the shared confidence +
 * uncertainty policy, and KDM reserves `duygusal_yük` for salient load.
 */

import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { semanticSentimentToKdm } from "./kdmConsistencyEngine";
import {
  interpretationFromRegexFloor,
  projectLegacySemanticEvent,
} from "./semanticInterpretationLegacyProjection";

const ORDINARY_TURNS = [
  "naber",
  "iyi be kanka nasıl olsun",
  "iyi dedim ya",
  "merhaba kanka",
  "selam",
  "ee başka bişey konuşmayacakmıydık",
  "sen sürekli merhaba diyorsun",
  "iyi be ne olsun hava çok sıcak eve geldim şimdi",
  "napıyon",
  "ne yapıyorsun",
  "eyvallah",
  "aynen",
];

describe("deterministic path does not tag ordinary chat as emotional load", () => {
  it.each(ORDINARY_TURNS)("'%s' -> emotionalLoad 0, sentiment not duygusal_yük", (message) => {
    const event = interpretSemanticEvent(message);
    expect(event.emotionalLoad).toBe(0);
    expect(semanticSentimentToKdm(event)).not.toBe("duygusal_yük");
  });

  it("a genuine low-mood opening remains salient emotional load", () => {
    const event = interpretSemanticEvent("bugün moralim çok bozuk ya");
    expect(event.emotionalLoad).toBeGreaterThanOrEqual(0.8);
    expect(semanticSentimentToKdm(event)).toBe("duygusal_yük");
  });
});

describe("LLM emotional load trust gate", () => {
  it("drops a high but uncertain LLM-only reading on ordinary chat", () => {
    const base = interpretationFromRegexFloor("selam");
    const event = projectLegacySemanticEvent(
      {
        ...base,
        emotionalLoad: 0.8,
        uncertainty: { ...base.uncertainty, overall: 0.8 },
        evidence: [{ source: "llm", provider: "test", cues: [], confidence: 0.95 }],
      },
      "selam",
    );
    expect(event.emotionalLoad).toBe(0);
    expect(semanticSentimentToKdm(event)).not.toBe("duygusal_yük");
  });

  it("accepts trusted salient LLM load", () => {
    const base = interpretationFromRegexFloor("bugün değişik hissediyorum");
    const event = projectLegacySemanticEvent(
      {
        ...base,
        emotionalLoad: 0.6,
        uncertainty: { ...base.uncertainty, overall: 0.2 },
        evidence: [{ source: "llm", provider: "test", cues: [], confidence: 0.8 }],
      },
      "bugün değişik hissediyorum",
    );
    expect(event.emotionalLoad).toBe(0.6);
    expect(semanticSentimentToKdm(event)).toBe("duygusal_yük");
  });
});
