import type { SocialAppraisalMemoryContext } from "../types/socialAppraisal";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import {
  loadKairaCanonicalIdentityResult,
  type KairaCanonicalIdentityLoadResult,
} from "./kairaCanonicalIdentityStore";
import { buildSocialAppraisalAutobiographicalContext } from "./socialAppraisalAutobiographicalContext";

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
}

/**
 * Persistence-aware upstream seam for G4.
 *
 * The runtime may load canonical identity, but it only exports the bounded
 * active-user projection. Raw autobiographical records never cross into KDM/G4.
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
  return {
    status: "loaded",
    memory: autobiographical ? { autobiographical } : undefined,
  };
}
