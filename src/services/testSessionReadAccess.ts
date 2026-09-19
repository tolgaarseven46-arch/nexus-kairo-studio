export const LIVE_BETA_TEST_RUN_PREFIX = "TR_live_beta_";

export function requiresInternalTestSessionReadAuth(sessionId: string): boolean {
  return String(sessionId || "").trim().startsWith(LIVE_BETA_TEST_RUN_PREFIX);
}

export function authorizeTestSessionRead(_input: {
  sessionId: string;
  authorizationHeader?: string | null;
  configuredSecret?: string | null;
}): { status: "public_legacy" } {
  // Historical RED: live-beta sessions were still treated like public legacy sessions.
  return { status: "public_legacy" };
}
