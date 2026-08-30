import type { KairaInstanceContext } from "./kairaInstanceContext";

export interface KairaOperationalHandoffContext {
  targetServerId: string;
  ownerUserId: string;
  ownerDisplayName?: string;
  serverDisplayName?: string;
  locale?: string;
  onboardingCompletedSteps?: string[];
}

export interface KairaWelcomeMemoryCandidate {
  kind:
    | "relationship_state"
    | "user_preference"
    | "user_fact"
    | "conversation_episode"
    | "world_event"
    | "operational_context";
  value: unknown;
}

export interface KairaHandoffPackage {
  fromInstanceId: string;
  toInstanceId: string;
  operationalContext: KairaOperationalHandoffContext;
  transferredCharacterMemories: never[];
}

/**
 * Welcome Kaira is an onboarding role, not the childhood of the Individual
 * Kaira. Character memory, relationship state and autobiographical evidence do
 * not cross this boundary. Only product/assignment context may be handed over.
 */
export function buildWelcomeToIndividualHandoff(input: {
  from: KairaInstanceContext;
  to: KairaInstanceContext;
  operationalContext: KairaOperationalHandoffContext;
}): KairaHandoffPackage {
  if (input.from.instanceType !== "welcome") {
    throw new Error("Handoff source must be a Welcome Kaira.");
  }
  if (input.to.instanceType !== "individual") {
    throw new Error("Handoff target must be an Individual Kaira.");
  }
  return {
    fromInstanceId: input.from.instanceId,
    toInstanceId: input.to.instanceId,
    operationalContext: input.operationalContext,
    transferredCharacterMemories: [],
  };
}

export function mayTransferWelcomeCandidate(
  candidate: KairaWelcomeMemoryCandidate,
): boolean {
  return candidate.kind === "operational_context";
}
