import { describe, expect, it } from "vitest";
import { buildTestRunCaptureProof } from "./testRunLiveBinding";

describe("TestRun capture proof regression", () => {
  it("does not claim persistence when TestSession did not return a turn id", () => {
    expect(
      buildTestRunCaptureProof({
        testRunId: "TR_live_beta_room-1",
        sessionId: "TR_live_beta_room-1",
        turnId: "",
      }),
    ).toEqual({
      testRunId: "TR_live_beta_room-1",
      sessionId: "TR_live_beta_room-1",
      turnId: undefined,
      persisted: false,
    });
  });

  it("marks capture persisted only after a concrete saved turn id exists", () => {
    expect(
      buildTestRunCaptureProof({
        testRunId: "TR_live_beta_room-1",
        sessionId: "TR_live_beta_room-1",
        turnId: "turn_1",
      }),
    ).toEqual({
      testRunId: "TR_live_beta_room-1",
      sessionId: "TR_live_beta_room-1",
      turnId: "turn_1",
      persisted: true,
    });
  });

  it("returns no capture proof for legacy non-TestRun chat", () => {
    expect(
      buildTestRunCaptureProof({
        sessionId: "legacy-session",
        turnId: "turn_legacy",
      }),
    ).toBeUndefined();
  });
});
