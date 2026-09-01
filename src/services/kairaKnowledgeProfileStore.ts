import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { resolveKairaInstanceContext } from "./kairaInstanceContext";
import {
  validateKairaKnowledgeProfile,
  type KairaKnowledgeProfile,
} from "./kairaKnowledgeProfile";

const KNOWLEDGE_PROFILE_COLLECTION = "kairaKnowledgeProfiles";

export function knowledgeProfileOwnerId(kairaInstanceId: string): string {
  return resolveKairaInstanceContext({ instanceId: kairaInstanceId }).instanceId;
}

export async function saveKairaKnowledgeProfile(
  profile: KairaKnowledgeProfile,
): Promise<void> {
  const ownerId = knowledgeProfileOwnerId(profile.kairaInstanceId);
  const normalized: KairaKnowledgeProfile = {
    ...profile,
    kairaInstanceId: ownerId,
    concepts: profile.concepts.map((concept) => ({ ...concept })),
  };
  const issues = validateKairaKnowledgeProfile(normalized);
  if (issues.length) {
    throw new Error(
      `Invalid Kaira knowledge profile: ${issues.map((issue) => issue.invariant).join(", ")}`,
    );
  }

  await setDoc(doc(db, KNOWLEDGE_PROFILE_COLLECTION, ownerId), {
    ...normalized,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadKairaKnowledgeProfile(
  kairaInstanceId: string,
): Promise<KairaKnowledgeProfile | null> {
  const ownerId = knowledgeProfileOwnerId(kairaInstanceId);
  const snapshot = await getDoc(doc(db, KNOWLEDGE_PROFILE_COLLECTION, ownerId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Partial<KairaKnowledgeProfile>;
  const profile: KairaKnowledgeProfile = {
    kairaInstanceId: String(data.kairaInstanceId || ownerId),
    schemaVersion: 1,
    coverage:
      data.coverage === "bounded_catalog"
        ? "bounded_catalog"
        : "open_model_fallback",
    concepts: Array.isArray(data.concepts) ? data.concepts : [],
  };

  if (knowledgeProfileOwnerId(profile.kairaInstanceId) !== ownerId) return null;
  if (validateKairaKnowledgeProfile(profile).length) return null;
  return profile;
}
