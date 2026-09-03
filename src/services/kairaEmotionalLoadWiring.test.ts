/**
 * emotional_load wiring check (ADR-0006 foundation repair, task §6).
 *
 * The first real 8-turn conversation showed ordinary greeting / general-chat
 * turns tagged "duygusal_yük" in KNT. On the DETERMINISTIC path this does NOT
 * happen — verified below and pinned as a regression. The over-labelling in the
 * live KNT came from the LLM semantic provider, which has no confidence gate on
 * `emotionalLoad` (flat binary model). That is a semantic-architecture issue,
 * NOT a small wiring bug, so per task §6 it is left as documented risk +
 * expected-future test, not patched here.
 */

import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { semanticSentimentToKdm } from "./kdmConsistencyEngine";

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

  it("a genuine low-mood opening still IS emotional load (the classifier isn't broken, just binary)", () => {
    const event = interpretSemanticEvent("bugün moralim çok bozuk ya");
    expect(event.emotionalLoad).toBeGreaterThan(0);
    expect(semanticSentimentToKdm(event)).toBe("duygusal_yük");
  });
});

describe("KNOWN GAP (documented risk, not patched in the foundation-repair PR)", () => {
  // The LLM semantic provider can set `emotionalLoad` with no confidence gate,
  // and `semanticSentimentToKdm` treats any `emotionalLoad > 0` as full
  // "duygusal_yük". A real fix needs a confidence/uncertainty-aware semantic
  // model (out of scope for foundation repair).
  it.todo("LLM-provided emotionalLoad should carry a confidence and be gated before it becomes duygusal_yük");
});
