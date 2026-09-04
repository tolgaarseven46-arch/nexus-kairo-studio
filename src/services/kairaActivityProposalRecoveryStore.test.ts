import { describe, expect, it } from "vitest";
import {
  buildReclaimedKairaActivityProposalRecoveryReceipt,
  type KairaActivityProposalRecoveryReceipt,
} from "./kairaActivityProposalRecoveryStore";

describe("Kaira activity proposal recovery reclaim receipt", () => {
  it("omits terminal-only fields instead of persisting undefined values", () => {
    const existing: KairaActivityProposalRecoveryReceipt = {
      schemaVersion: 1,
      ownerUserId: "knt_test_user_x_new",
      kairaInstanceId: "kaira-runtime",
      instanceType: "individual",
      proposalId: "planning:dynamic_state:chat_request:test:experience_archive",
      status: "completed",
      claimedAt: "2026-09-04T17:00:00.000Z",
      leaseUntil: "2026-09-04T17:05:00.000Z",
      completedAt: "2026-09-04T17:01:00.000Z",
      outcome: "materialized",
    };

    const reclaimed = buildReclaimedKairaActivityProposalRecoveryReceipt({
      existing,
      claimedAt: "2026-09-04T17:40:00.000Z",
      leaseUntil: "2026-09-04T17:45:00.000Z",
    });

    expect(reclaimed.status).toBe("claimed");
    expect(reclaimed.claimedAt).toBe("2026-09-04T17:40:00.000Z");
    expect(reclaimed.leaseUntil).toBe("2026-09-04T17:45:00.000Z");
    expect(Object.prototype.hasOwnProperty.call(reclaimed, "completedAt")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(reclaimed, "outcome")).toBe(false);
  });
});
