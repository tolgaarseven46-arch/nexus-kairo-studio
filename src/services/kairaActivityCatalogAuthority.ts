import type {
  KairaActivityExecutionExperienceSubject,
  KairaActivityPermissionPolicy,
} from "./kairaActivityExecution";
import type { KairaActivityDescriptor } from "./kairaActivityCandidateGenerator";
import type { KairaActivityMotivationKind } from "./kairaActivityPlanningPolicy";

export interface KairaActivityCatalogEntry {
  catalogId: string;
  activityType: string;
  motivationAffinity: Partial<Record<KairaActivityMotivationKind, number>>;
  preferenceKeys?: string[];
  repetitionKey?: string;
  requiredCapabilities?: string[];
  noveltyPotential: number;
  permissionPolicy: KairaActivityPermissionPolicy;
  experienceSubject?: KairaActivityExecutionExperienceSubject;
  evidenceIds?: string[];
}

export interface KairaActivityRuntimeAssessment {
  catalogId: string;
  availability: "available" | "blocked";
  contextualFit: number;
  interruptionCost: number;
  risk: number;
  notBefore: string;
  expiresAt?: string;
  evidenceIds?: string[];
}

export interface KairaActivityCatalogRuntimeContext {
  capabilities: Record<string, boolean>;
  assessments: KairaActivityRuntimeAssessment[];
}

const key = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

const finiteUnit = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

function uniqueKeys(values: string[] | undefined) {
  return Array.from(new Set((values || []).map(key).filter(Boolean)));
}

function assertCatalogEntry(entry: KairaActivityCatalogEntry) {
  if (!key(entry.catalogId) || !key(entry.activityType) || !finiteUnit(entry.noveltyPotential)) {
    throw new Error("Invalid Kaira activity catalog entry");
  }
  if (entry.permissionPolicy !== "none" && entry.permissionPolicy !== "owner_approval") {
    throw new Error("Invalid Kaira activity catalog permission policy");
  }
  const affinities = Object.values(entry.motivationAffinity || {});
  if (affinities.some((value) => value !== undefined && !finiteUnit(value))) {
    throw new Error("Invalid Kaira activity catalog motivation affinity");
  }
  if (entry.experienceSubject) {
    const subject = entry.experienceSubject;
    const validValue =
      (typeof subject.experiencedValue === "string" && Boolean(subject.experiencedValue.trim())) ||
      (typeof subject.experiencedValue === "number" && Number.isFinite(subject.experiencedValue)) ||
      typeof subject.experiencedValue === "boolean";
    if (!key(subject.preferenceKey) || !validValue) {
      throw new Error("Invalid Kaira activity catalog experience subject");
    }
  }
}

function assertAssessment(assessment: KairaActivityRuntimeAssessment) {
  const notBeforeMs = Date.parse(assessment.notBefore);
  const expiresAtMs = assessment.expiresAt ? Date.parse(assessment.expiresAt) : undefined;
  if (
    !key(assessment.catalogId) ||
    !finiteUnit(assessment.contextualFit) ||
    !finiteUnit(assessment.interruptionCost) ||
    !finiteUnit(assessment.risk) ||
    !Number.isFinite(notBeforeMs) ||
    (expiresAtMs !== undefined && (!Number.isFinite(expiresAtMs) || expiresAtMs <= notBeforeMs))
  ) {
    throw new Error("Invalid Kaira activity runtime assessment");
  }
}

function assertUniqueIds(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate Kaira activity ${label}`);
  }
}

/** Canonical stable catalog semantics. Runtime availability never belongs here. */
export function normalizeKairaActivityCatalog(
  entries: KairaActivityCatalogEntry[],
): KairaActivityCatalogEntry[] {
  const normalized = entries.map((entry) => {
    assertCatalogEntry(entry);
    return {
      ...entry,
      catalogId: key(entry.catalogId),
      activityType: key(entry.activityType),
      motivationAffinity: { ...entry.motivationAffinity },
      preferenceKeys: uniqueKeys(entry.preferenceKeys),
      repetitionKey: key(entry.repetitionKey),
      requiredCapabilities: uniqueKeys(entry.requiredCapabilities),
      ...(entry.experienceSubject
        ? {
            experienceSubject: {
              preferenceKey: key(entry.experienceSubject.preferenceKey),
              experiencedValue:
                typeof entry.experienceSubject.experiencedValue === "string"
                  ? entry.experienceSubject.experiencedValue.trim()
                  : entry.experienceSubject.experiencedValue,
            },
          }
        : {}),
      evidenceIds: uniqueKeys(entry.evidenceIds),
    };
  });
  assertUniqueIds(normalized.map((entry) => entry.catalogId), "catalog id");
  return normalized;
}

/**
 * Materializes stable catalog semantics together with ephemeral runtime facts.
 * Stable semantics can only come from catalog entries. Availability, context,
 * interruption, risk and temporal windows can only come from runtime assessment.
 * Missing or unsatisfied capability facts fail closed.
 */
export function materializeKairaActivityDescriptors(input: {
  catalog: KairaActivityCatalogEntry[];
  runtime: KairaActivityCatalogRuntimeContext;
}): KairaActivityDescriptor[] {
  const catalog = normalizeKairaActivityCatalog(input.catalog);
  const assessments = input.runtime.assessments.map((assessment) => {
    assertAssessment(assessment);
    return { ...assessment, catalogId: key(assessment.catalogId) };
  });

  assertUniqueIds(assessments.map((assessment) => assessment.catalogId), "runtime assessment id");

  const assessmentById = new Map(assessments.map((assessment) => [assessment.catalogId, assessment]));
  const capabilities = new Map(
    Object.entries(input.runtime.capabilities || {}).map(([capability, value]) => [key(capability), value === true]),
  );

  const descriptors: KairaActivityDescriptor[] = [];
  for (const entry of catalog) {
    const assessment = assessmentById.get(entry.catalogId);
    if (!assessment) continue;

    const requiredCapabilities = entry.requiredCapabilities || [];
    const capabilitiesSatisfied = requiredCapabilities.every((capability) => capabilities.get(capability) === true);
    const availability =
      capabilitiesSatisfied && assessment.availability === "available" ? "available" : "blocked";

    descriptors.push({
      proposalId: entry.catalogId,
      activityType: entry.activityType,
      motivationAffinity: { ...entry.motivationAffinity },
      preferenceKeys: entry.preferenceKeys || [],
      repetitionKey: entry.repetitionKey || "",
      noveltyPotential: entry.noveltyPotential,
      contextualFit: assessment.contextualFit,
      interruptionCost: assessment.interruptionCost,
      risk: assessment.risk,
      availability,
      permissionPolicy: entry.permissionPolicy,
      notBefore: assessment.notBefore,
      ...(assessment.expiresAt ? { expiresAt: assessment.expiresAt } : {}),
      ...(entry.experienceSubject ? { experienceSubject: { ...entry.experienceSubject } } : {}),
      evidenceIds: Array.from(new Set([
        ...(entry.evidenceIds || []),
        ...uniqueKeys(assessment.evidenceIds),
        ...requiredCapabilities.map((capability) => `capability:${capability}`),
      ])),
    });
  }
  return descriptors;
}
