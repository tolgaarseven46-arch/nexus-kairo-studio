import { describe, expect, it } from "vitest";
import { validateKairoResponse } from "./kairoResponseConsistency";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import {
  decideResponseRepair,
  selectBestConsistency,
} from "./kdmResponseRepairPolicy";
import type { ReasoningTrace } from "../types/nexus";

const trace = (tone = "sıcak ve empatik"): ReasoningTrace =>
  ({
    messageInterpretation: { intent: "destek", sentiment: "üzgün" },
    currentMood: { moodText: "Sakin ve destekleyici" },
    decision: { chosenTone: tone },
  }) as ReasoningTrace;

describe("KDM response consistency gate", () => {
  it("accepts a response matching the emotional context and tone", () => {
    const result = validateKairoResponse(
      "Anlıyorum, buradayım. Birlikte bunu çözebiliriz.",
      trace(),
    );
    expect(result.accepted).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it("rejects an emotionally mismatched response", () => {
    const result = validateKairoResponse(
      "Net konuşuyorum: Kural bu, uygulanmalı.",
      trace(),
    );
    expect(result.accepted).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("keeps repair bounded at two attempts", () => {
    const result = validateKairoResponse("Yetersiz.", trace());
    expect(decideResponseRepair(result, 0).shouldRepair).toBe(true);
    expect(decideResponseRepair(result, 1).shouldRepair).toBe(true);
    expect(decideResponseRepair(result, 2).shouldRepair).toBe(false);
  });

  it("never replaces a better response with a worse repair", () => {
    const original = validateKairoResponse(
      "Anlıyorum, buradayım ve destek olmak istiyorum.",
      trace(),
    );
    const candidate = validateKairoResponse("Tamam.", trace());
    expect(selectBestConsistency(original, candidate)).toBe(original);
  });

  it("classifies a past-action recall as a question, not an action request", () => {
    const result = analyzeKdmInteraction(
      "bu arada mert yarın ne yapacaktı ya 😄",
    );
    expect(result.trace.messageInterpretation.intent).toBe("soru");
  });

  it("classifies an uncertainty-preserving recall as a question", () => {
    const result = analyzeKdmInteraction(
      "bu arada Mert yarın ne yapmayı düşünüyordu?",
    );
    expect(result.trace.messageInterpretation.intent).toBe("soru");
  });

  it("does not treat the Turkish word bugün as the software term bug", () => {
    const result = analyzeKdmInteraction(
      "neyse boşver, bugün hava da baya sıcak ya",
    );
    expect(result.trace.messageInterpretation.intent).toBe("genel_sohbet");
  });
});
