export type KairaInstanceType = "reference" | "welcome" | "individual";

export const DEFAULT_KAIRA_INSTANCE_ID = "kaira_reference_001";
export const DEFAULT_KAIRA_INSTANCE_TYPE: KairaInstanceType = "reference";

export interface KairaInstanceContext {
  instanceId: string;
  instanceType: KairaInstanceType;
}

export interface KairaInstancePolicy {
  persistentIdentity: boolean;
  persistentAutobiography: boolean;
  persistentWorldModel: boolean;
  persistentRelationship: boolean;
  persistentUserMemory: boolean;
  canConsolidateCoreMemories: boolean;
  autonomousActivityPlanning: boolean;
  purpose: "reference-development" | "onboarding" | "individual-life";
}

const sanitize = (value?: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 96);

const LEGACY_OWNER_SCOPE_RE = /^[a-zA-Z0-9_-]{1,96}$/;
const OWNER_SCOPE_V2_PREFIX = "u2_";

/**
 * Keep existing safe owner ids byte-compatible with legacy Firestore paths,
 * while giving unsafe / overlong ids an injective, filesystem-safe namespace.
 *
 * `u2_` is reserved: a raw id beginning with the prefix is encoded again, so a
 * fresh user cannot choose the literal encoded scope of another user and alias
 * their relationship / memory / cache ownership key.
 */
function ownerUserScopeSegment(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "anonymous";
  if (LEGACY_OWNER_SCOPE_RE.test(raw) && !raw.startsWith(OWNER_SCOPE_V2_PREFIX)) {
    return raw;
  }
  return `${OWNER_SCOPE_V2_PREFIX}${Array.from(raw)
    .map((char) => char.codePointAt(0)!.toString(16))
    .join("_")}`;
}

export function resolveKairaInstanceContext(input?: {
  instanceId?: string;
  instanceType?: KairaInstanceType;
}): KairaInstanceContext {
  const instanceId = sanitize(input?.instanceId) || DEFAULT_KAIRA_INSTANCE_ID;
  return {
    instanceId,
    instanceType: input?.instanceType || DEFAULT_KAIRA_INSTANCE_TYPE,
  };
}

export function instancePolicy(type: KairaInstanceType): KairaInstancePolicy {
  if (type === "welcome") {
    return {
      persistentIdentity: false,
      persistentAutobiography: false,
      persistentWorldModel: false,
      persistentRelationship: false,
      persistentUserMemory: false,
      canConsolidateCoreMemories: false,
      autonomousActivityPlanning: false,
      purpose: "onboarding",
    };
  }
  if (type === "individual") {
    return {
      persistentIdentity: true,
      persistentAutobiography: true,
      persistentWorldModel: true,
      persistentRelationship: true,
      persistentUserMemory: true,
      canConsolidateCoreMemories: true,
      autonomousActivityPlanning: true,
      purpose: "individual-life",
    };
  }
  return {
    persistentIdentity: true,
    persistentAutobiography: true,
    persistentWorldModel: true,
    persistentRelationship: true,
    persistentUserMemory: true,
    canConsolidateCoreMemories: true,
    autonomousActivityPlanning: true,
    purpose: "reference-development",
  };
}

/**
 * Shared partition key for all Kaira-owned persistent state.
 * The current reference Kaira intentionally stays on the legacy user path so
 * existing Firestore data remains readable without a migration for already-safe
 * legacy owner ids. Unsafe / overlong ids use the reserved v2 owner namespace.
 */
export function kairaOwnerScope(userId?: string, instanceId?: string): string {
  const userScope = ownerUserScopeSegment(userId);
  const instance = resolveKairaInstanceContext({ instanceId });
  if (instance.instanceId === DEFAULT_KAIRA_INSTANCE_ID) return userScope;
  return `${userScope}__${instance.instanceId}`;
}

export function worldModelOwnerScope(userId?: string, instanceId?: string): string {
  return kairaOwnerScope(userId, instanceId);
}

export function stateOwnerScope(userId?: string, instanceId?: string): string {
  return kairaOwnerScope(userId, instanceId);
}

export function userMemoryOwnerScope(userId?: string, instanceId?: string): string {
  return kairaOwnerScope(userId, instanceId);
}

export function memoryCacheKey(userId?: string, instanceId?: string): string {
  return kairaOwnerScope(userId, instanceId);
}
