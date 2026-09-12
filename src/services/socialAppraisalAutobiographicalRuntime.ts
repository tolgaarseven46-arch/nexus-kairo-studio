import type { SocialAppraisalMemoryContext } from "../types/socialAppraisal";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import {
  loadKairaCanonicalIdentityResult,
  type KairaCanonicalIdentityLoadResult,
} from "./kairaCanonicalIdentityStore";
import { buildSocialAppraisalAutobiographicalContext } from "./socialAppraisalAutobiographicalContext";
import { buildSocialAppraisalCommitmentContext } from "./socialAppraisalWorldMemoryContext";
import {
  loadRecentWorldEventObservations,
  type WorldEventObservation,
} from "./worldModelEventStore";

export type SocialAppraisalAutobiographicalRuntimeStatus =
  | "loaded"
  | "missing"
  | "unavailable"
  | "ephemeral";

export interface SocialAppraisalAutobiographicalRuntimeResult {
  status: SocialAppraisalAutobiographicalRuntimeStatus;
  memory: SocialAppraisalMemoryContext | undefined;
}

export interface SocialAppraisalAutobiographicalRuntimeDependencies {
  loadIdentity?: (
    instance: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
  ) => Promise<KairaCanonicalIdentityLoadResult>;
  loadWorldObservations?: (
    userId: string | undefined,
    maxItems: number,
    kairaInstanceId: string,
  ) => Promise<WorldEventObservation[]>;
}

/**
 * Persistence-aware upstream seam for G4.
 *
 * The runtime may load canonical identity and existing canonical world events,
 * but it exports only bounded typed projections. Raw autobiographical records and
 * raw world-event text never cross into KDM/G4; no second memory authority exists.
 */
export async function loadSocialAppraisalAutobiographicalRuntime(
  input: {
    instance: KairaInstanceContext;
    userId?: string;
  },
  dependencies: SocialAppraisalAutobiographicalRuntimeDependencies = {},
): Promise<SocialAppraisalAutobiographicalRuntimeResult> {
  const loadIdentity = dependencies.loadIdentity ?? loadKairaCanonicalIdentityResult;
  const loaded = await loadIdentity(input.instance);
  if (loaded.status !== "loaded") {
    return { status: loaded.status, memory: undefined };
  }

  const autobiographical = buildSocialAppraisalAutobiographicalContext(
    loaded.state,
    input.userId,
  );
  const loadWorld = dependencies.loadWorldObservations ?? loadRecentWorldEventObservations;
  const observations = await loadWorld(input.userId, 40, input.instance.instanceId).catch(() => []);
  const world = buildSocialAppraisalCommitmentContext(observations);

  return {
    status: "loaded",
    memory:
      autobiographical || world.length > 0
        ? {
            ...(autobiographical ? { autobiographical } : {}),
            ...(world.length > 0 ? { world } : {}),
          }
        : undefined,
  };
}
