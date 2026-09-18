import {
  authorizeKairaInternalWorker,
  type KairaInternalWorkerAuthDecision,
} from "./kairaInternalWorkerAuth";

export const LIVE_BETA_TEST_RUN_PREFIX = "TR_live_beta_";

export function requiresInternalTestSessionReadAuth(sessionId: string): boolean {
  return String(sessionId || "").trim().startsWith(LIVE_BETA_TEST_RUN_PREFIX);
}

export function authorizeTestSessionRead(input: {
  sessionId: string;
  authorizationHeader?: string | null;
  configuredSecret?: string | null;
}): KairaInternalWorkerAuthDecision | { status: "public_legacy" } {
  if (!requiresInternalTestSessionReadAuth(input.sessionId)) {
    return { status: "public_legacy" };
  }

  return authorizeKairaInternalWorker({
    authorizationHeader: input.authorizationHeader,
    configuredSecret: input.configuredSecret,
  });
}
