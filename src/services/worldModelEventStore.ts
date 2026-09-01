import { addDoc, collection, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
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

export type WorldEventObservationKind = "direct_interaction" | "reported_claim";
export type WorldEventObservationStatus = "grounded" | "ambiguous";

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
  createdAt: string;
  temporalReferenceObservationId?: string;
}

const scope = (value?: string) =>
  (value || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");

export function observationKairaInstanceId(observation: WorldEventObservation): string {
  return resolveKairaInstanceContext({ instanceId: observation.kairaInstanceId }).instanceId;
}

export function classifyWorldEventObservation(
  event: CanonicalWorldEvent,
): { persist: boolean; kind: WorldEventObservationKind; status: WorldEventObservationStatus } {
  const kind: WorldEventObservationKind = event.reportedSpeech
    ? "reported_claim"
    : "direct_interaction";

  const status: WorldEventObservationStatus =
    event.ambiguities.length === 0 && event.certainty >= 0.72
      ? "grounded"
      : "ambiguous";

  const isQuestionLike = QUESTION_LIKE_RE.test(event.raw || "");
  const hasParticipant = Boolean(event.actor || event.target);
  const meaningfulType = event.eventType !== "general";
  const persist = !isQuestionLike && event.certainty >= 0.45 && (meaningfulType || hasParticipant);

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
