import { doc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { DistributedChatRecord } from "./kairaDistributedChatIdempotency";
import { STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS } from "./kairaFirestoreStateMutation";

const IDEMPOTENCY_COLLECTION = "kairaChatIdempotency";
const STATE_COLLECTION = "kairaStateMutationLocks";
const IDEMPOTENCY_LEASE_MS = 45_000;
const IDEMPOTENCY_TTL_MS = 2 * 60_000;
export const FIRST_ENCOUNTER_STATE_LEASE_MS = 90_000;
const WAIT_MS = 120_000;
const POLL_MS = 60;

function docId(key: string) {
  return encodeURIComponent(key).replace(/%/g, "_").slice(0, 1400);
}

function stateOwnerKey(requestKey: string) {
  const separator = requestKey.lastIndexOf("::");
  return separator > 0 ? requestKey.slice(0, separator) : requestKey;
}

function token(prefix: string, now = Date.now()) {
  return `${prefix}_${now.toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type FirstEncounterCoordinationClaim<T = unknown> =
  | { kind: "owner"; idempotencyOwnerToken: string; stateOwnerToken: string }
  | { kind: "replay"; payload: T }
  | { kind: "wait_existing" };

export async function claimFirstEncounterCoordination<T = unknown>(
  requestKey: string,
): Promise<FirstEncounterCoordinationClaim<T>> {
  const normalizedKey = requestKey.trim();
  if (!normalizedKey) {
    return {
      kind: "owner",
      idempotencyOwnerToken: "",
      stateOwnerToken: "",
    };
  }

  const idempotencyOwnerToken = token("owner");
  const stateOwnerToken = token("state");
  const stateKey = stateOwnerKey(normalizedKey);
  const idempotencyRef = doc(db, IDEMPOTENCY_COLLECTION, docId(normalizedKey));
  const stateRef = doc(db, STATE_COLLECTION, docId(stateKey));
  const deadline = Date.now() + WAIT_MS;

  while (Date.now() <= deadline) {
    const now = Date.now();
    const outcome = await runTransaction(db, async (tx) => {
      const idempotencySnap = await tx.get(idempotencyRef);
      const existingIdempotency = idempotencySnap.exists()
        ? (idempotencySnap.data() as Partial<DistributedChatRecord<T>>)
        : null;

      if (
        existingIdempotency?.status === "completed" &&
        typeof existingIdempotency.expiresAt === "number" &&
        existingIdempotency.expiresAt > now &&
        existingIdempotency.payload !== undefined
      ) {
        return { kind: "replay" as const, payload: existingIdempotency.payload as T };
      }

      if (
        existingIdempotency?.status === "processing" &&
        typeof existingIdempotency.leaseUntil === "number" &&
        existingIdempotency.leaseUntil > now
      ) {
        return { kind: "wait_existing" as const };
      }

      const stateSnap = await tx.get(stateRef);
      const existingState = stateSnap.exists()
        ? (stateSnap.data() as { ownerToken?: string; leaseUntil?: number })
        : null;

      if (
        existingState &&
        typeof existingState.leaseUntil === "number" &&
        existingState.ownerToken !== stateOwnerToken &&
        existingState.leaseUntil + STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS > now
      ) {
        return { kind: "state_busy" as const };
      }

      tx.set(idempotencyRef, {
        status: "processing",
        ownerToken: idempotencyOwnerToken,
        leaseUntil: now + IDEMPOTENCY_LEASE_MS,
        expiresAt: now + IDEMPOTENCY_TTL_MS,
        updatedAt: new Date(now).toISOString(),
      });
      tx.set(stateRef, {
        ownerToken: stateOwnerToken,
        leaseUntil: now + FIRST_ENCOUNTER_STATE_LEASE_MS,
        updatedAt: new Date(now).toISOString(),
      });
      return {
        kind: "owner" as const,
        idempotencyOwnerToken,
        stateOwnerToken,
      };
    });

    if (outcome.kind !== "state_busy") return outcome;
    await sleep(POLL_MS);
  }

  throw new Error("Timed out waiting for combined first-encounter coordination");
}
