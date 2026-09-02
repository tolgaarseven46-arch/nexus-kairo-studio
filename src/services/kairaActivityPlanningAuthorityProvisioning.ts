import type { DroitDynamicState } from "../types/nexus";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import { provisionKairaActivityCatalogIfMissingAtomic } from "./kairaActivityCatalogStore";
import type { KairaActivityEnvironmentEntry } from "./kairaActivityEnvironmentAuthority";
import { provisionOrRefreshKairaActivityEnvironmentAtomic } from "./kairaActivityEnvironmentStore";
import { provisionKairaActivityDynamicStateIfMissingAtomic } from "./kairaActivityDynamicStateStore";
import type { KairaActivityPlanningTriggerInboxRecord } from "./kairaActivityPlanningTriggerInboxStore";

export const BUILTIN_ACTIVITY_CATALOG_VERSION = "autonomous_builtin_v1";

export const BUILTIN_ACTIVITY_CATALOG: KairaActivityCatalogEntry[] = [{
  catalogId: "experience_archive",
  activityType: "archive_exploration",
  motivationAffinity: { curiosity: 1, growth: 0.7 },
  preferenceKeys: ["preferred_archive_mode"],
  repetitionKey: "experience_archive",
  requiredCapabilities: ["world_access"],
  noveltyPotential: 0.9,
  permissionPolicy: "owner_approval",
  experienceSubject: {
    preferenceKey: "preferred_archive_mode",
    experiencedValue: "deep_exploration",
  },
  evidenceIds: ["catalog:archive_exploration"],
}];

export const BUILTIN_ACTIVITY_ENVIRONMENT: KairaActivityEnvironmentEntry[] = [{
  catalogId: "experience_archive",
  accessible: true,
  capabilities: { world_access: true },
  contextFit: 0.95,
  risk: 0.05,
  evidenceIds: ["environment:archive_access"],
}];

export const BUILTIN_ACTIVITY_DYNAMIC_STATE: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};

/** Ensures each real inbox owner has durable authorities before source composition. */
export async function provisionKairaActivityPlanningAuthorities(input: {
  record: KairaActivityPlanningTriggerInboxRecord;
  now: string;
}) {
  const identity = {
    kairaInstanceId: input.record.kairaInstanceId,
    instanceType: input.record.instanceType,
  };
  const [catalog, environment, dynamicState] = await Promise.all([
    provisionKairaActivityCatalogIfMissingAtomic({
      ...identity,
      catalogVersion: BUILTIN_ACTIVITY_CATALOG_VERSION,
      entries: BUILTIN_ACTIVITY_CATALOG,
      publishedAt: input.now,
    }),
    provisionOrRefreshKairaActivityEnvironmentAtomic({
      ...identity,
      snapshot: {
        schemaVersion: 1,
        kairaInstanceId: input.record.kairaInstanceId,
        observedAt: input.now,
        entries: BUILTIN_ACTIVITY_ENVIRONMENT,
      },
    }),
    provisionKairaActivityDynamicStateIfMissingAtomic({
      ...identity,
      state: BUILTIN_ACTIVITY_DYNAMIC_STATE,
      observedAt: input.now,
      sourceId: "authority_bootstrap:autonomous_builtin_v1",
    }),
  ]);
  return { catalog, environment, dynamicState };
}
