import { addDoc, collection, doc, getDocs, limit, orderBy, query, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  DEFAULT_KAIRA_INSTANCE_ID,
  resolveKairaInstanceContext,
  worldModelOwnerScope,
} from "./kairaInstanceContext";
import type { CanonicalWorldEvent, WorldEventResolvedTemporalInterval } from "./worldEventEngine";
import {
  enrichWorldEventModality,
  type ModalCanonicalWorldEvent,
} from "./worldEventModality";
import {
  enrichWorldEventLifecycle,
  type LifecycleCanonicalWorldEvent,
} from "./worldEventLifecycle";
import { resolveTemporalReference } from "./temporalReferenceResolver";

const WORLD_MODEL_COLLECTION = "worldModel";
const EVENT_COLLECTION = "events";
const QUESTION_LIKE_RE = /[?？]\s*$|\b(?:ne demişti|ne dedi|ne olmuştu|ne oldu|hatırlıyor musun|hatırladın mı|hakkında ne biliyorsun)\b|\b(?:mi|mı|mu|mü)\b.*\b(?:demişti|dedi|söylemişti|söyledi)\b/iu;

export type WorldEventObservationKind = "direct_interaction" | "reported_claim" | "kaira_activity";
export type WorldEventObservationStatus = "grounded" | "ambiguous";
export type KairaActivityWorldStatus = "planned" | "active" | "completed" | "cancelled" | "failed";

export interface KairaActivityExperienceSubject {
  preferenceKey: string;
  experiencedValue: string | number | boolean;
}

/** Canonical world truth for one Kaira-owned activity lifecycle observation. */
export interface KairaActivityWorldObservation {
  activityId: string;
  activityType: string;
  status: KairaActivityWorldStatus;
  experienceSubject?: KairaActivityExperienceSubject;
}

export interface WorldEventObservation {
  id?: string;
  userId: string;
  /** Legacy observations may omit this; omission means the reference Kaira. */
  kairaInstanceId?: string;
  sessionId: string;
  speakerName?: string;
  kind: WorldEventObservationKind;
  status: WorldEventObservationStatus;
  event: LifecycleCanonicalWorldEvent;
  /** Present only for first-class Kaira activity observations. */
  activity?: KairaActivityWorldObservation;
  createdAt: string;
  temporalReferenceObservationId?: string;
}

const scope = (value?: string) =>
  (value || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");

const canonicalActivityKey = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

const validActivityValue = (value: unknown): value is string | number | boolean =>
  (typeof value === "string" && Boolean(value.trim())) ||
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean";

const activityValueKey = (value: string | number | boolean) =>
  `${typeof value}:${typeof value === "string" ? value.trim() : String(value)}`;

export function kairaActivityObservationDocumentId(
  activityId: string,
  status: KairaActivityWorldStatus,
): string {
  const canonicalId = canonicalActivityKey(activityId);
  if (!canonicalId) throw new Error("Invalid Kaira activity id");
  return `kaira_activity__${canonicalId}__${status}`;
}

function sameActivityExperienceSubject(
  left?: KairaActivityExperienceSubject,
  right?: KairaActivityExperienceSubject,
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.preferenceKey === right.preferenceKey &&
    activityValueKey(left.experiencedValue) === activityValueKey(right.experiencedValue)
  );
}

function sameCanonicalActivityObservation(
  existing: WorldEventObservation,
  intended: Omit<WorldEventObservation, "id">,
): boolean {
  return Boolean(
    existing.kind === "kaira_activity" &&
    existing.status === "grounded" &&
    existing.userId === intended.userId &&
    observationKairaInstanceId(existing) === observationKairaInstanceId(intended as WorldEventObservation) &&
    existing.sessionId === intended.sessionId &&
    existing.activity?.activityId === intended.activity?.activityId &&
    existing.activity?.activityType === intended.activity?.activityType &&
    existing.activity?.status === intended.activity?.status &&
    sameActivityExperienceSubject(existing.activity?.experienceSubject, intended.activity?.experienceSubject)
  );
}

export function observationKairaInstanceId(observation: WorldEventObservation): string {
  return resolveKairaInstanceContext({ instanceId: observation.kairaInstanceId }).instanceId;
}

export function classifyWorldEventObservation(
  event: CanonicalWorldEvent,
): { persist: boolean; kind: Exclude<WorldEventObservationKind, "kaira_activity">; status: WorldEventObservationStatus } {
  const kind: Exclude<WorldEventObservationKind, "kaira_activity"> = event.reportedSpeech
    ? "reported_claim"
    : "direct_interaction";

  const status: WorldEventObservationStatus =
    event.ambiguities.length === 0 && event.certainty >= 0.72
      ? "grounded"
      : "ambiguous";

  const isQuestionLike = QUESTION_LIKE_RE.test(event.raw || "");
  const hasParticipant = Boolean(event.actor || event.target);
  const meaningfulType = event.eventType !== "general";
  const persist = !event.reportedSpeech && !isQuestionLike && event.certainty >= 0.45 && (meaningfulType || hasParticipant);

  return { persist, kind, status };
}

export function enrichWorldEventTemporalAtPersistence(
  event: LifecycleCanonicalWorldEvent,
  createdAt: string,
  referenceInterval?: WorldEventResolvedTemporalInterval,
): LifecycleCanonicalWorldEvent {
  const resolved = resolveTemporalReference(event.raw, event.temporal, createdAt, referenceInterval);
  if (!event.temporal || !resolved) return event;
  return {
    ...event,
    temporal: {
      ...event.temporal,
      resolved,
    },
  };
}

/**
 * `previous_event` means the immediately previous observation in the same
 * session and Kaira instance. Never borrow temporal provenance across instances.
 */
export function previousTemporalReferenceObservation(
  observations: WorldEventObservation[],
  sessionId: string,
  kairaInstanceId = DEFAULT_KAIRA_INSTANCE_ID,
): WorldEventObservation | undefined {
  const targetInstanceId = resolveKairaInstanceContext({ instanceId: kairaInstanceId }).instanceId;
  const sorted = [...observations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return sorted.find(
    (row) => row.sessionId === sessionId && observationKairaInstanceId(row) === targetInstanceId,
  );
}

export function previousResolvedIntervalFromObservations(
  observations: WorldEventObservation[],
  sessionId: string,
  kairaInstanceId = DEFAULT_KAIRA_INSTANCE_ID,
): WorldEventResolvedTemporalInterval | undefined {
  return previousTemporalReferenceObservation(observations, sessionId, kairaInstanceId)?.event?.temporal?.resolved;
}

async function loadPreviousTemporalReference(
  parent: ReturnType<typeof doc>,
  sessionId: string,
  kairaInstanceId: string,
): Promise<WorldEventObservation | undefined> {
  const snapshot = await getDocs(
    query(collection(parent, EVENT_COLLECTION), orderBy("createdAt", "desc"), limit(12)),
  );
  const observations = snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<WorldEventObservation, "id">),
  }));
  return previousTemporalReferenceObservation(observations, sessionId, kairaInstanceId);
}

export async function saveWorldEventObservation(input: {
  userId?: string;
  kairaInstanceId?: string;
  sessionId: string;
  speakerName?: string;
  event: CanonicalWorldEvent;
}): Promise<WorldEventObservation | null> {
  const classification = classifyWorldEventObservation(input.event);
  if (!classification.persist) return null;

  const createdAt = new Date().toISOString();
  const userId = scope(input.userId);
  const instance = resolveKairaInstanceContext({ instanceId: input.kairaInstanceId });
  const parent = doc(
    db,
    WORLD_MODEL_COLLECTION,
    worldModelOwnerScope(userId, instance.instanceId),
  );
  const needsPreviousEvent = input.event.temporal?.dependency?.anchor === "previous_event";
  const referenceObservation = needsPreviousEvent
    ? await loadPreviousTemporalReference(parent, input.sessionId, instance.instanceId).catch(() => undefined)
    : undefined;
  const referenceInterval = referenceObservation?.event?.temporal?.resolved;
  const modalEvent: ModalCanonicalWorldEvent = enrichWorldEventModality(input.event);
  const lifecycleEvent = enrichWorldEventLifecycle(modalEvent);
  const event = enrichWorldEventTemporalAtPersistence(lifecycleEvent, createdAt, referenceInterval);
  const temporalReferenceObservationId =
    event.temporal?.resolved?.source === "referenced_event"
      ? referenceObservation?.id
      : undefined;

  const persisted: Omit<WorldEventObservation, "id"> = {
    userId,
    kairaInstanceId: instance.instanceId,
    sessionId: input.sessionId,
    ...(input.speakerName ? { speakerName: input.speakerName } : {}),
    kind: classification.kind,
    status: classification.status,
    event,
    createdAt,
    ...(temporalReferenceObservationId ? { temporalReferenceObservationId } : {}),
  };
  const ref = await addDoc(collection(parent, EVENT_COLLECTION), {
    ...persisted,
    speakerName: input.speakerName || null,
  });
  return { id: ref.id, ...persisted };
}

/**
 * Persists trusted Kaira-owned activity lifecycle truth without routing it
 * through user-message classification. Activity lifecycle rows use deterministic
 * document ids, so executor retries resolve to the original canonical observation
 * instead of manufacturing a second independent lived episode.
 */
export async function saveKairaActivityWorldObservation(input: {
  userId?: string;
  kairaInstanceId: string;
  sessionId: string;
  activity: KairaActivityWorldObservation;
}): Promise<WorldEventObservation> {
  const instance = resolveKairaInstanceContext({ instanceId: input.kairaInstanceId });
  const activityId = canonicalActivityKey(input.activity.activityId);
  const activityType = canonicalActivityKey(input.activity.activityType);
  if (!activityId || !activityType) throw new Error("Invalid Kaira activity world observation");

  let experienceSubject: KairaActivityExperienceSubject | undefined;
  if (input.activity.experienceSubject) {
    const preferenceKey = canonicalActivityKey(input.activity.experienceSubject.preferenceKey);
    const experiencedValue = input.activity.experienceSubject.experiencedValue;
    if (!preferenceKey || !validActivityValue(experiencedValue)) {
      throw new Error("Invalid Kaira activity experience subject");
    }
    experienceSubject = {
      preferenceKey,
      experiencedValue: typeof experiencedValue === "string" ? experiencedValue.trim().slice(0, 160) : experiencedValue,
    };
  }

  const createdAt = new Date().toISOString();
  const userId = scope(input.userId);
  const parent = doc(
    db,
    WORLD_MODEL_COLLECTION,
    worldModelOwnerScope(userId, instance.instanceId),
  );
  const activity: KairaActivityWorldObservation = {
    activityId,
    activityType,
    status: input.activity.status,
    ...(experienceSubject ? { experienceSubject } : {}),
  };
  const canonicalEvent: CanonicalWorldEvent = {
    raw: `kaira_activity:${activityType}:${activity.status}`,
    eventType: "general",
    actor: { id: instance.instanceId, source: "first_person", confidence: 1 },
    target: { id: `activity:${activityId}`, source: "semantic_target", confidence: 1 },
    reportedSpeech: false,
    certainty: 1,
    ambiguities: [],
    evidence: ["authority:kaira_activity_executor", `activity:${activityId}`, `status:${activity.status}`],
    proposition: {
      key: `${instance.instanceId}|activity|${activityId}|${activity.status}`,
      predicate: "general",
      actorKey: instance.instanceId,
      targetKey: `activity:${activityId}`,
      contentKey: activityType,
    },
    polarity: "positive",
    temporal: { relation: "present", asksLatest: false },
  };
  const event = enrichWorldEventLifecycle(enrichWorldEventModality(canonicalEvent));
  const persisted: Omit<WorldEventObservation, "id"> = {
    userId,
    kairaInstanceId: instance.instanceId,
    sessionId: input.sessionId,
    kind: "kaira_activity",
    status: "grounded",
    event,
    activity,
    createdAt,
  };

  const observationRef = doc(
    collection(parent, EVENT_COLLECTION),
    kairaActivityObservationDocumentId(activityId, activity.status),
  );
  return runTransaction(db, async (transaction) => {
    const existingSnapshot = await transaction.get(observationRef);
    if (existingSnapshot.exists()) {
      const existing: WorldEventObservation = {
        id: existingSnapshot.id,
        ...(existingSnapshot.data() as Omit<WorldEventObservation, "id">),
      };
      if (!sameCanonicalActivityObservation(existing, persisted)) {
        throw new Error("Kaira activity idempotency conflict");
      }
      return existing;
    }
    transaction.set(observationRef, persisted);
    return { id: observationRef.id, ...persisted };
  });
}

export async function loadRecentWorldEventObservations(
  userId?: string,
  maxItems = 20,
  kairaInstanceId = DEFAULT_KAIRA_INSTANCE_ID,
): Promise<WorldEventObservation[]> {
  const safeLimit = Math.max(1, Math.min(maxItems, 100));
  const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId });
  const parent = doc(
    db,
    WORLD_MODEL_COLLECTION,
    worldModelOwnerScope(userId, instance.instanceId),
  );
  const snapshot = await getDocs(
    query(collection(parent, EVENT_COLLECTION), orderBy("createdAt", "desc"), limit(safeLimit)),
  );

  return snapshot.docs.map((item) => {
    const data = item.data() as Omit<WorldEventObservation, "id">;
    return {
      id: item.id,
      ...data,
      kairaInstanceId: data.kairaInstanceId || DEFAULT_KAIRA_INSTANCE_ID,
    };
  });
}
