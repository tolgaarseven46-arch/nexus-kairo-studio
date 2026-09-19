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

  it("reported: blocks a predictable live-beta TestRun read without internal auth", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_room-1",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({ status: "unauthorized", httpStatus: 401 });
  });

  it("neighbor-1: another room-scoped live-beta TestRun id requires the same internal auth", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_other-room",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({ status: "unauthorized", httpStatus: 401 });
  });

  it("neighbor-2: a wrong bearer token is rejected for protected live-beta sessions", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_room-2",
        authorizationHeader: "Bearer wrong-secret",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({ status: "forbidden", httpStatus: 403 });
  });

  it("counterexample: legacy Studio TestSession read compatibility remains unchanged", () => {
    expect(
      authorizeTestSessionRead({ sessionId: "session_test_user_x" }),
    ).toEqual({ status: "public_legacy" });
  });
});
