import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import {
  validateKairaCanonicalIdentity,
  type KairaCanonicalIdentityState,
} from "./kairaCanonicalIdentity";

const CANONICAL_IDENTITY_COLLECTION = "kairaCanonicalIdentities";

function canonicalIdentityContext(
  input: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
): KairaInstanceContext {
  return resolveKairaInstanceContext(input);
}

function cloneMemory(memory: KairaAutobiographicalMemory): KairaAutobiographicalMemory {
  return {
    ...memory,
    participantIds: [...memory.participantIds],
    facts: [...memory.facts],
    emotions: memory.emotions.map((emotion) => ({ ...emotion })),
    ...(memory.sourceWorldObservationIds
      ? { sourceWorldObservationIds: [...memory.sourceWorldObservationIds] }
      : {}),
  };
}

function stateFromData(
  ownerId: string,
  data: Partial<KairaCanonicalIdentityState>,
): KairaCanonicalIdentityState {
  return {
    kairaInstanceId: String(data.kairaInstanceId || ownerId),
    schemaVersion: 1,
    selfFacts: Array.isArray(data.selfFacts) ? data.selfFacts.map((fact) => ({ ...fact })) : [],
    autobiographicalMemories: Array.isArray(data.autobiographicalMemories)
      ? data.autobiographicalMemories.map(cloneMemory)
      : [],
  };
}

export function canonicalIdentityOwnerId(
  input: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
): string {
  return canonicalIdentityContext(input).instanceId;
}

export async function saveKairaCanonicalIdentity(
  input: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
  state: KairaCanonicalIdentityState,
): Promise<void> {
  const instance = canonicalIdentityContext(input);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentIdentity || !policy.persistentAutobiography) {
    throw new Error(`Kaira instance type cannot persist canonical identity: ${instance.instanceType}`);
  }

  const ownerId = instance.instanceId;
  const normalized: KairaCanonicalIdentityState = {
    ...state,
    kairaInstanceId: resolveKairaInstanceContext({ instanceId: state.kairaInstanceId }).instanceId,
    selfFacts: state.selfFacts.map((fact) => ({ ...fact })),
    autobiographicalMemories: state.autobiographicalMemories.map(cloneMemory),
  };

  if (normalized.kairaInstanceId !== ownerId) {
    throw new Error("Canonical identity owner mismatch");
  }
  const issues = validateKairaCanonicalIdentity(normalized);
  if (issues.length) {
    throw new Error(
      `Invalid Kaira canonical identity: ${issues.map((issue) => issue.invariant).join(", ")}`,
    );
  }

  await setDoc(doc(db, CANONICAL_IDENTITY_COLLECTION, ownerId), {
    ...normalized,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadKairaCanonicalIdentity(
  input: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
): Promise<KairaCanonicalIdentityState | null> {
  const instance = canonicalIdentityContext(input);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentIdentity || !policy.persistentAutobiography) return null;

  const ownerId = instance.instanceId;
  const snapshot = await getDoc(doc(db, CANONICAL_IDENTITY_COLLECTION, ownerId));
  if (!snapshot.exists()) return null;

  const state = stateFromData(ownerId, snapshot.data() as Partial<KairaCanonicalIdentityState>);
  if (resolveKairaInstanceContext({ instanceId: state.kairaInstanceId }).instanceId !== ownerId) {
    return null;
  }
  if (validateKairaCanonicalIdentity(state).length) return null;
  return state;
}

export type KairaCanonicalIdentityLoadResult =
  | { status: "loaded"; state: KairaCanonicalIdentityState }
  | { status: "missing"; state: null }
  | { status: "unavailable"; state: null }
  | { status: "ephemeral"; state: null };

export async function loadKairaCanonicalIdentityResult(
  input: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
): Promise<KairaCanonicalIdentityLoadResult> {
  const instance = canonicalIdentityContext(input);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentIdentity || !policy.persistentAutobiography) {
    return { status: "ephemeral", state: null };
  }
  try {
    const state = await loadKairaCanonicalIdentity(instance);
    return state
      ? { status: "loaded", state }
      : { status: "missing", state: null };
  } catch {
    return { status: "unavailable", state: null };
  }
}

export type KairaAutobiographicalAppendResult =
  | { status: "appended"; memoryId: string }
  | { status: "duplicate"; memoryId: string }
  | { status: "missing_identity"; memoryId: null }
  | { status: "ephemeral"; memoryId: null };

/**
 * Atomic, instance-owned append for lived autobiography.
 * The transaction prevents concurrent turns from overwriting one another and
 * the consolidation key makes retries idempotent.
 */
export async function appendKairaAutobiographicalMemoryAtomic(
  input: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
  memory: KairaAutobiographicalMemory,
): Promise<KairaAutobiographicalAppendResult> {
  const instance = canonicalIdentityContext(input);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentIdentity || !policy.persistentAutobiography || !policy.canConsolidateCoreMemories) {
    return { status: "ephemeral", memoryId: null };
  }
  if (memory.origin !== "lived") {
    throw new Error("Atomic autobiographical append only accepts lived memories");
  }

  const ownerId = instance.instanceId;
  const ref = doc(db, CANONICAL_IDENTITY_COLLECTION, ownerId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return { status: "missing_identity", memoryId: null } as const;

    const current = stateFromData(
      ownerId,
      snapshot.data() as Partial<KairaCanonicalIdentityState>,
    );
    if (resolveKairaInstanceContext({ instanceId: current.kairaInstanceId }).instanceId !== ownerId) {
      throw new Error("Canonical identity owner mismatch");
    }
    const currentIssues = validateKairaCanonicalIdentity(current);
    if (currentIssues.length) {
      throw new Error(
        `Invalid existing Kaira canonical identity: ${currentIssues.map((issue) => issue.invariant).join(", ")}`,
      );
    }

    const duplicate = current.autobiographicalMemories.find((existing) =>
      existing.id === memory.id ||
      (memory.consolidationKey && existing.consolidationKey === memory.consolidationKey) ||
      Boolean(
        memory.sourceWorldObservationIds?.some((sourceId) =>
          existing.sourceWorldObservationIds?.includes(sourceId),
        ),
      ),
    );
    if (duplicate) {
      return { status: "duplicate", memoryId: duplicate.id } as const;
    }

    const next: KairaCanonicalIdentityState = {
      ...current,
      autobiographicalMemories: [
        ...current.autobiographicalMemories.map(cloneMemory),
        cloneMemory(memory),
      ],
    };
    const issues = validateKairaCanonicalIdentity(next);
    if (issues.length) {
      throw new Error(
        `Invalid Kaira canonical identity append: ${issues.map((issue) => issue.invariant).join(", ")}`,
      );
    }

    transaction.set(ref, {
      ...next,
      updatedAt: new Date().toISOString(),
    });
    return { status: "appended", memoryId: memory.id } as const;
  });
}
