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
 * existing Firestore data remains readable without a migration.
 */
export function kairaOwnerScope(userId?: string, instanceId?: string): string {
  const userScope = sanitize(userId) || "anonymous";
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
