import { describe, expect, it } from "vitest";
import { resolveKairaFinalDelivery } from "./kairaFinalDeliveryGate";

const rejected = {
  accepted: false,
  score: 70,
  issues: ["response_plan_question_blocked"],
  warnings: [],
};

describe("final-delivery fail-silent bug-class neighbor proof", () => {
  it("reported: rejected question candidate still persists a non-empty assistant reply", () => {
    const result = resolveKairaFinalDelivery("yasaklı aday?", rejected);
    expect(result.accepted).toBe(false);
    expect(result.persistedReply.trim().length).toBeGreaterThan(0);
  });

  it("neighbor-1: rejected affection candidate still persists a non-empty assistant reply", () => {
    const result = resolveKairaFinalDelivery("aşkım gel buraya", {
      ...rejected,
      issues: ["response_plan_affection_blocked"],
    });
    expect(result.accepted).toBe(false);
    expect(result.persistedReply.trim().length).toBeGreaterThan(0);
  });

  it("neighbor-2: multiply rejected candidate still persists a non-empty assistant reply", () => {
    const result = resolveKairaFinalDelivery("hadi aşkım, ne oynayalım?", {
      ...rejected,
      score: 10,
      issues: ["response_plan_question_blocked", "response_plan_affection_blocked"],
    });
    expect(result.accepted).toBe(false);
    expect(result.persistedReply.trim().length).toBeGreaterThan(0);
  });

  it("counterexample: accepted candidate remains accepted and unchanged", () => {
    const result = resolveKairaFinalDelivery("tamam, olur", {
      accepted: true,
      score: 100,
      issues: [],
      warnings: [],
    });
    expect(result.accepted).toBe(true);
    expect(result.persistedReply).toBe("tamam, olur");
  });
});
