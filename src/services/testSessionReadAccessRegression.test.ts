import { describe, expect, it } from "vitest";
import {
  authorizeTestSessionRead,
  requiresInternalTestSessionReadAuth,
} from "./testSessionReadAccess";

describe("Slice A10 live-beta TestSession read auth", () => {
  it("protects only live social beta TestRun sessions", () => {
    expect(requiresInternalTestSessionReadAuth("TR_live_beta_room-1")).toBe(true);
    expect(requiresInternalTestSessionReadAuth("session_test_user_x")).toBe(false);
    expect(requiresInternalTestSessionReadAuth("knt_test_user_x_new")).toBe(false);
  });

  it("denies unauthenticated access to live-beta TestRun sessions", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_room-1",
        configuredSecret: "shared-secret",
      }),
    ).toEqual({
      status: "unauthorized",
      httpStatus: 401,
      reason: "missing_bearer_token",
    });
  });

  it("allows the configured internal token for live-beta TestRun sessions", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_room-1",
        authorizationHeader: "Bearer shared-secret",
        configuredSecret: "shared-secret",
      }),
    ).toEqual({ status: "authorized" });
  });

  it("keeps legacy Studio TestSession reads backward compatible", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "session_test_user_x",
      }),
    ).toEqual({ status: "public_legacy" });
  });
});
