import { describe, expect, it } from "vitest";
import {
  buildKairaFinalDeliveryRejectionError,
  resolveKairaFinalDelivery,
} from "./kairaFinalDeliveryGate";

describe("final delivery gate regression", () => {
  it("passes an accepted candidate through unchanged", () => {
    const decision = resolveKairaFinalDelivery("niye ya", { accepted: true, score: 100, issues: [] });
    expect(decision.accepted).toBe(true);
    expect(decision.persistedReply).toBe("niye ya");
  });

  it("keeps the rejected candidate only for diagnostics and removes it from conversational persistence", () => {
    const decision = resolveKairaFinalDelivery("he anladım", {
      accepted: false,
      score: 70,
      issues: ["response_plan_content_engagement_missing"],
    });
    expect(decision.accepted).toBe(false);
    expect(decision.candidateReply).toBe("he anladım");
    expect(decision.persistedReply).toBe("");
    expect(buildKairaFinalDeliveryRejectionError(decision).message).toContain(
      "response_plan_content_engagement_missing",
    );
  });
});
