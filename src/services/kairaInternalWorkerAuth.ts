import { timingSafeEqual } from "node:crypto";

export type KairaInternalWorkerAuthDecision =
  | { status: "authorized" }
  | { status: "disabled"; httpStatus: 503; reason: "worker_secret_not_configured" }
  | { status: "unauthorized"; httpStatus: 401; reason: "missing_bearer_token" }
  | { status: "forbidden"; httpStatus: 403; reason: "invalid_worker_token" };

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function authorizeKairaInternalWorker(input: {
  authorizationHeader?: string | null;
  configuredSecret?: string | null;
}): KairaInternalWorkerAuthDecision {
  const secret = String(input.configuredSecret || "").trim();
  if (!secret) {
    return { status: "disabled", httpStatus: 503, reason: "worker_secret_not_configured" };
  }

  const header = String(input.authorizationHeader || "").trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { status: "unauthorized", httpStatus: 401, reason: "missing_bearer_token" };
  }

  const token = match[1].trim();
  if (!token || !safeEqual(token, secret)) {
    return { status: "forbidden", httpStatus: 403, reason: "invalid_worker_token" };
  }

  return { status: "authorized" };
}
