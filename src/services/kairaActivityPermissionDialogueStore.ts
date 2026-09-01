import { doc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { kairaOwnerScope } from "./kairaInstanceContext";
import {
  settleKairaActivityPermissionDialogueRequest,
  type KairaActivityPermissionDialogueRequest,
} from "./kairaActivityPermissionDialogue";

const COLLECTION = "kairaActivityPermissionRequests";

const requestDocumentId = (request: Pick<KairaActivityPermissionDialogueRequest, "ownerUserId" | "kairaInstanceId" | "requestId">) =>
  `${kairaOwnerScope(request.ownerUserId, request.kairaInstanceId)}__permission__${request.requestId}`.slice(0, 480);

function sameRequest(
  left: KairaActivityPermissionDialogueRequest,
  right: KairaActivityPermissionDialogueRequest,
): boolean {
  return (
    left.requestId === right.requestId &&
    left.ownerUserId === right.ownerUserId &&
    left.kairaInstanceId === right.kairaInstanceId &&
    left.activityId === right.activityId &&
    left.sessionId === right.sessionId &&
    left.promptTurnId === right.promptTurnId &&
    left.createdAt === right.createdAt &&
    left.expiresAt === right.expiresAt
  );
}

export type KairaActivityPermissionRequestCreateResult =
  | { status: "created"; request: KairaActivityPermissionDialogueRequest }
  | { status: "existing"; request: KairaActivityPermissionDialogueRequest };

export async function createKairaActivityPermissionRequestAtomic(
  request: KairaActivityPermissionDialogueRequest,
): Promise<KairaActivityPermissionRequestCreateResult> {
  const ref = doc(db, COLLECTION, requestDocumentId(request));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaActivityPermissionDialogueRequest;
      if (!sameRequest(existing, request)) {
        throw new Error("Kaira activity permission request idempotency conflict");
      }
      return { status: "existing", request: existing } as const;
    }
    transaction.set(ref, request);
    return { status: "created", request } as const;
  });
}

export async function settleKairaActivityPermissionRequestAtomic(input: {
  request: KairaActivityPermissionDialogueRequest;
  intent: "grant" | "deny";
  now: string;
}): Promise<KairaActivityPermissionDialogueRequest> {
  const ref = doc(db, COLLECTION, requestDocumentId(input.request));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira activity permission request not found");
    const stored = snapshot.data() as KairaActivityPermissionDialogueRequest;
    if (!sameRequest(stored, input.request)) {
      throw new Error("Kaira activity permission request correlation mismatch");
    }
    if (stored.status === "granted" && input.intent === "grant") return stored;
    if (stored.status === "denied" && input.intent === "deny") return stored;
    if (stored.status !== "pending") {
      throw new Error("Kaira activity permission request already terminal");
    }
    const settled = settleKairaActivityPermissionDialogueRequest(stored, input.intent, input.now);
    transaction.set(ref, settled);
    return settled;
  });
}
