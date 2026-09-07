import { describe, expect, it } from "vitest";
import {
  buildKairaFinalDeliveryRejectionError,
  KAIRA_FINAL_REJECTION_FALLBACK,
  resolveKairaFinalDelivery,
} from "./kairaFinalDeliveryGate";

describe("final delivery gate regression", () => {
  it("passes an accepted candidate through unchanged", () => {
    const decision = resolveKairaFinalDelivery("niye ya", { accepted: true, score: 100, issues: [] });
    expect(decision.accepted).toBe(true);
    expect(decision.persistedReply).toBe("niye ya");
  });

  it("keeps the rejected candidate only for diagnostics while persisting a neutral non-silent fallback", () => {
    const decision = resolveKairaFinalDelivery("he anladım", {
      accepted: false,
      score: 70,
      issues: ["response_plan_content_engagement_missing"],
    });
    expect(decision.accepted).toBe(false);
    expect(decision.candidateReply).toBe("he anladım");
    expect(decision.persistedReply).toBe(KAIRA_FINAL_REJECTION_FALLBACK);
    expect(decision.persistedReply).not.toBe(decision.candidateReply);
    expect(decision.persistedReply.trim().length).toBeGreaterThan(0);
    expect(buildKairaFinalDeliveryRejectionError(decision).message).toContain(
      "response_plan_content_engagement_missing",
    );
  });
});
