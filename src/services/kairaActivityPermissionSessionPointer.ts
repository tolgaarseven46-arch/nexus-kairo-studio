import type { KairaActivityPermissionDialogueRequest } from "./kairaActivityPermissionDialogue";

export interface KairaActivityPermissionSessionPointer {
  schemaVersion: 1;
  ownerUserId: string;
  kairaInstanceId: string;
  sessionId: string;
  status: "active" | "cleared";
  request: KairaActivityPermissionDialogueRequest;
  createdAt: string;
  updatedAt: string;
  clearedAt?: string;
}

export function createKairaActivityPermissionSessionPointer(
  request: KairaActivityPermissionDialogueRequest,
): KairaActivityPermissionSessionPointer {
  if (request.status !== "pending") {
    throw new Error("Pending Kaira activity permission request required");
  }
  return {
    schemaVersion: 1,
    ownerUserId: request.ownerUserId,
    kairaInstanceId: request.kairaInstanceId,
    sessionId: request.sessionId,
    status: "active",
    request,
    createdAt: request.createdAt,
    updatedAt: request.createdAt,
  };
}

export function clearKairaActivityPermissionSessionPointer(
  pointer: KairaActivityPermissionSessionPointer,
  now: string,
): KairaActivityPermissionSessionPointer {
  if (pointer.status === "cleared") return pointer;
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira permission pointer clear time");
  const clearedAt = new Date(nowMs).toISOString();
  return {
    ...pointer,
    status: "cleared",
    updatedAt: clearedAt,
    clearedAt,
  };
}
