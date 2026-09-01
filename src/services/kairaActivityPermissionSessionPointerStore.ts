import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { kairaOwnerScope } from "./kairaInstanceContext";
import {
  clearKairaActivityPermissionSessionPointer,
  createKairaActivityPermissionSessionPointer,
  type KairaActivityPermissionSessionPointer,
} from "./kairaActivityPermissionSessionPointer";
import type { KairaActivityPermissionDialogueRequest } from "./kairaActivityPermissionDialogue";

const COLLECTION = "kairaActivityPermissionSessionPointers";

const canonicalSession = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_@.+:-]+/g, "_")
    .slice(0, 180);

function pointerDocumentId(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  sessionId: string;
}): string {
  const ownerScope = kairaOwnerScope(input.ownerUserId, input.kairaInstanceId);
  return `${ownerScope}__permission_session__${canonicalSession(input.sessionId)}`.slice(0, 480);
}

function sameRequest(
  left: KairaActivityPermissionDialogueRequest,
  right: KairaActivityPermissionDialogueRequest,
): boolean {
  return (
    left.requestId === right.requestId &&
    left.activityId === right.activityId &&
    left.promptTurnId === right.promptTurnId &&
    left.sessionId === right.sessionId &&
    left.ownerUserId === right.ownerUserId &&
    left.kairaInstanceId === right.kairaInstanceId
  );
}

export type KairaActivityPermissionPointerCreateResult =
  | { status: "created"; pointer: KairaActivityPermissionSessionPointer }
  | { status: "existing"; pointer: KairaActivityPermissionSessionPointer };

export async function createKairaActivityPermissionSessionPointerAtomic(
  request: KairaActivityPermissionDialogueRequest,
): Promise<KairaActivityPermissionPointerCreateResult> {
  const pointer = createKairaActivityPermissionSessionPointer(request);
  const ref = doc(db, COLLECTION, pointerDocumentId(pointer));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaActivityPermissionSessionPointer;
      if (existing.status === "active") {
        if (!sameRequest(existing.request, request)) {
          throw new Error("Active Kaira activity permission request already exists for session");
        }
        return { status: "existing", pointer: existing } as const;
      }
    }
    transaction.set(ref, pointer);
    return { status: "created", pointer } as const;
  });
}

export async function loadActiveKairaActivityPermissionSessionPointer(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  sessionId: string;
}): Promise<KairaActivityPermissionSessionPointer | null> {
  const ref = doc(db, COLLECTION, pointerDocumentId(input));
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const pointer = snapshot.data() as KairaActivityPermissionSessionPointer;
  return pointer.status === "active" ? pointer : null;
}

export async function clearKairaActivityPermissionSessionPointerAtomic(input: {
  pointer: KairaActivityPermissionSessionPointer;
  now: string;
}): Promise<KairaActivityPermissionSessionPointer> {
  const ref = doc(db, COLLECTION, pointerDocumentId(input.pointer));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira activity permission session pointer not found");
    const stored = snapshot.data() as KairaActivityPermissionSessionPointer;
    if (!sameRequest(stored.request, input.pointer.request)) {
      throw new Error("Kaira activity permission session pointer correlation mismatch");
    }
    if (stored.status === "cleared") return stored;
    const cleared = clearKairaActivityPermissionSessionPointer(stored, input.now);
    transaction.set(ref, cleared);
    return cleared;
  });
}
