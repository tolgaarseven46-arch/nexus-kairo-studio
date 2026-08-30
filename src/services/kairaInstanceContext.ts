export type KairaInstanceType = "reference" | "welcome" | "individual";

export const DEFAULT_KAIRA_INSTANCE_ID = "kaira_reference_001";
export const DEFAULT_KAIRA_INSTANCE_TYPE: KairaInstanceType = "reference";

export interface KairaInstanceContext {
  instanceId: string;
  instanceType: KairaInstanceType;
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

/**
 * Keeps the current reference Kaira on the legacy user path so existing test
 * data remains readable. New instances receive isolated world-model parents.
 */
export function worldModelOwnerScope(userId?: string, instanceId?: string): string {
  const userScope = sanitize(userId) || "anonymous";
  const instance = resolveKairaInstanceContext({ instanceId });
  if (instance.instanceId === DEFAULT_KAIRA_INSTANCE_ID) return userScope;
  return `${userScope}__${instance.instanceId}`;
}
