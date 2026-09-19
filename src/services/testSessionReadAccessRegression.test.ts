import { describe, expect, it } from "vitest";
import {
  authorizeTestSessionRead,
  requiresInternalTestSessionReadAuth,
} from "./testSessionReadAccess";

describe("live-beta TestSession read auth", () => {
  it("protects live social-beta TestRun sessions", () => {
    expect(requiresInternalTestSessionReadAuth("TR_live_beta_room-1")).toBe(true);
    expect(requiresInternalTestSessionReadAuth("session_test_user_x")).toBe(false);
  });

  it("reported: blocks predictable live-beta reads without internal auth", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_room-1",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({ status: "unauthorized", httpStatus: 401 });
  });

  it("neighbor: rejects a wrong bearer token", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_room-2",
        authorizationHeader: "Bearer wrong-secret",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({ status: "forbidden", httpStatus: 403 });
  });

  it("counterexample: preserves legacy Studio TestSession compatibility", () => {
    expect(
      authorizeTestSessionRead({ sessionId: "session_test_user_x" }),
    ).toEqual({ status: "public_legacy" });
  });
});
