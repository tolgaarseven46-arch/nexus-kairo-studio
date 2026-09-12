import { describe, expect, it } from "vitest";
import {
  KAIRA_FINAL_REJECTION_FALLBACK,
  resolveKairaFinalDelivery,
} from "./kairaFinalDeliveryGate";

describe("kaira final delivery gate", () => {
  it("never persists an empty assistant reply even if upstream marks it accepted", () => {
    const decision = resolveKairaFinalDelivery("   ", {
      accepted: true,
      score: 1,
      issues: [],
    });

    expect(decision.accepted).toBe(false);
    expect(decision.persistedReply).toBe(KAIRA_FINAL_REJECTION_FALLBACK);
    expect(decision.issues).toContain("final_delivery_empty_reply");
  });
});
