import { describe, expect, it } from "vitest";
import { authorizeTestSessionRead } from "./testSessionReadAccess";

describe("live-beta TestSession read neighbor proof", () => {
  it("reported: blocks the captured predictable live-beta TestRun read without internal auth", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_slice-a-acceptance-35310419905",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({
      status: "unauthorized",
      httpStatus: 401,
    });
  });

  it("neighbor-1: blocks another room-scoped live-beta TestRun id", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_room-super-lig",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({
      status: "unauthorized",
      httpStatus: 401,
    });
  });

  it("neighbor-2: rejects the wrong bearer token for a protected live-beta session", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "TR_live_beta_private-room-2",
        authorizationHeader: "Bearer wrong-secret",
        configuredSecret: "shared-secret",
      }),
    ).toMatchObject({
      status: "forbidden",
      httpStatus: 403,
    });
  });

  it("counterexample: preserves legacy Studio TestSession read compatibility", () => {
    expect(
      authorizeTestSessionRead({
        sessionId: "session_test_user_x",
      }),
    ).toEqual({ status: "public_legacy" });
  });
});
