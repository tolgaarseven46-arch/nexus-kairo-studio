import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
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
    autobiographicalMemories: state.autobiographicalMemories.map((memory) => ({
      ...memory,
      participantIds: [...memory.participantIds],
      facts: [...memory.facts],
      emotions: memory.emotions.map((emotion) => ({ ...emotion })),
    })),
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

  const data = snapshot.data() as Partial<KairaCanonicalIdentityState>;
  const state: KairaCanonicalIdentityState = {
    kairaInstanceId: String(data.kairaInstanceId || ownerId),
    schemaVersion: 1,
    selfFacts: Array.isArray(data.selfFacts) ? data.selfFacts : [],
    autobiographicalMemories: Array.isArray(data.autobiographicalMemories)
      ? data.autobiographicalMemories
      : [],
  };

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
