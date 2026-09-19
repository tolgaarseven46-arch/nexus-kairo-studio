import { describe, expect, it } from "vitest";

describe("LIVE proof: protected live-beta TestSession reads", () => {
  it("blocks predictable live-beta ids but keeps legacy path publicly reachable", async () => {
    const base = "https://nexus-kairo-studio.onrender.com";

    const protectedResponse = await fetch(
      `${base}/api/test-sessions/TR_live_beta_MYorKeCOP0aq0h3QLLlr`,
      { signal: AbortSignal.timeout(10000) },
    );
    const protectedBody = await protectedResponse.json().catch(() => ({}));

    const legacyResponse = await fetch(
      `${base}/api/test-sessions/session_nonexistent_security_proof`,
      { signal: AbortSignal.timeout(10000) },
    );
    const legacyBody = await legacyResponse.json().catch(() => ({}));

    console.log("LIVE_TEST_SESSION_READ_AUTH_PROOF", JSON.stringify({
      protectedStatus: protectedResponse.status,
      protectedError: protectedBody?.error,
      legacyStatus: legacyResponse.status,
      legacyError: legacyBody?.error,
    }));

    expect(protectedResponse.status).toBe(401);
    expect(protectedBody?.error).toBe("missing_bearer_token");
    expect(legacyResponse.status).toBe(404);
  }, 20000);
});
