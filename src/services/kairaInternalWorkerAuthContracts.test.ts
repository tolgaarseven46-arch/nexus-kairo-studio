import { describe, expect, it } from "vitest";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";

describe("Kaira internal worker auth contracts", () => {
  it("disables internal workers when no secret is configured", () => {
    expect(authorizeKairaInternalWorker({
      authorizationHeader: "Bearer anything",
      configuredSecret: "",
    })).toEqual({
      status: "disabled",
      httpStatus: 503,
      reason: "worker_secret_not_configured",
    });
  });

  it("rejects missing and malformed bearer credentials", () => {
    expect(authorizeKairaInternalWorker({ configuredSecret: "secret" })).toMatchObject({
      status: "unauthorized",
      httpStatus: 401,
    });
    expect(authorizeKairaInternalWorker({
      authorizationHeader: "Basic secret",
      configuredSecret: "secret",
    })).toMatchObject({ status: "unauthorized", httpStatus: 401 });
  });

  it("rejects the wrong token and accepts only the configured bearer secret", () => {
    expect(authorizeKairaInternalWorker({
      authorizationHeader: "Bearer wrong",
      configuredSecret: "secret",
    })).toMatchObject({ status: "forbidden", httpStatus: 403 });

    expect(authorizeKairaInternalWorker({
      authorizationHeader: "Bearer secret",
      configuredSecret: "secret",
    })).toEqual({ status: "authorized" });
  });
});
