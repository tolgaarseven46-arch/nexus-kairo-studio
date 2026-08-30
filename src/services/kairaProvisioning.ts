import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
  type KairaInstanceType,
} from "./kairaInstanceContext";

export type KairaProvisioningStage =
  | "requested"
  | "identity_seed"
  | "knowledge_profile"
  | "life_scaffold"
  | "validation"
  | "assignment"
  | "ready"
  | "failed";

export interface KairaProvisioningRequest {
  requestId: string;
  ownerUserId: string;
  targetServerId: string;
  requestedType: Exclude<KairaInstanceType, "reference">;
  requestedAt: string;
}

export interface KairaProvisioningState {
  request: KairaProvisioningRequest;
  instance: KairaInstanceContext;
  stage: KairaProvisioningStage;
  progress: number;
  estimatedReadyAt?: string;
  completedStages: KairaProvisioningStage[];
  failureReason?: string;
}

const clampProgress = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function welcomeKairaForServer(serverId: string): KairaInstanceContext {
  const safeServer = String(serverId || "server").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return resolveKairaInstanceContext({
    instanceId: `welcome_${safeServer}`,
    instanceType: "welcome",
  });
}

export function startIndividualKairaProvisioning(input: {
  requestId: string;
  ownerUserId: string;
  targetServerId: string;
  instanceId: string;
  requestedAt?: string;
  estimatedMinutes?: number;
}): KairaProvisioningState {
  const requestedAt = input.requestedAt || new Date().toISOString();
  const estimatedMinutes = Math.max(1, Math.min(60, input.estimatedMinutes ?? 10));
  const estimatedReadyAt = new Date(new Date(requestedAt).getTime() + estimatedMinutes * 60000).toISOString();
  return {
    request: {
      requestId: input.requestId,
      ownerUserId: input.ownerUserId,
      targetServerId: input.targetServerId,
      requestedType: "individual",
      requestedAt,
    },
    instance: resolveKairaInstanceContext({ instanceId: input.instanceId, instanceType: "individual" }),
    stage: "requested",
    progress: 0,
    estimatedReadyAt,
    completedStages: [],
  };
}

const STAGE_PROGRESS: Record<KairaProvisioningStage, number> = {
  requested: 0,
  identity_seed: 15,
  knowledge_profile: 35,
  life_scaffold: 60,
  validation: 82,
  assignment: 95,
  ready: 100,
  failed: 100,
};

const ORDER: KairaProvisioningStage[] = [
  "requested",
  "identity_seed",
  "knowledge_profile",
  "life_scaffold",
  "validation",
  "assignment",
  "ready",
];

export function advanceKairaProvisioning(
  current: KairaProvisioningState,
  nextStage: KairaProvisioningStage,
  failureReason?: string,
): KairaProvisioningState {
  if (current.stage === "ready" || current.stage === "failed") return current;
  if (nextStage === "failed") {
    return { ...current, stage: "failed", progress: 100, failureReason: failureReason || "unknown" };
  }
  const currentIndex = ORDER.indexOf(current.stage);
  const nextIndex = ORDER.indexOf(nextStage);
  if (nextIndex < currentIndex || nextIndex < 0) return current;
  const completedStages = Array.from(new Set([
    ...current.completedStages,
    ...ORDER.slice(0, Math.max(0, nextIndex)),
  ]));
  return {
    ...current,
    stage: nextStage,
    progress: clampProgress(STAGE_PROGRESS[nextStage]),
    completedStages,
    ...(nextStage === "ready" ? { estimatedReadyAt: new Date().toISOString() } : {}),
  };
}

export function canProvisioningStatePersistLife(state: KairaProvisioningState): boolean {
  const policy = instancePolicy(state.instance.instanceType);
  return state.stage === "ready" && policy.persistentAutobiography && policy.persistentRelationship;
}

export function provisioningUserMessage(state: KairaProvisioningState): string {
  switch (state.stage) {
    case "requested": return "Kaira talebin alındı. Hazırlık başlıyor.";
    case "identity_seed": return "Kaira'nın bireysel kimliği hazırlanıyor.";
    case "knowledge_profile": return "Bilgi profili hazırlanıyor.";
    case "life_scaffold": return "Geçmiş ve başlangıç bağlamı hazırlanıyor.";
    case "validation": return "Kaira tutarlılık kontrolünden geçiyor.";
    case "assignment": return "Atama tamamlanıyor. Kaira yolda.";
    case "ready": return "Kaira hazır ve sunucuya atandı.";
    case "failed": return "Kaira hazırlığı tamamlanamadı; yeniden denenecek.";
  }
}
