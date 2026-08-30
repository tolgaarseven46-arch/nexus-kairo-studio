import { addDoc, collection, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { CanonicalWorldEvent, WorldEventResolvedTemporalInterval } from "./worldEventEngine";
import { resolveTemporalReference } from "./temporalReferenceResolver";

const WORLD_MODEL_COLLECTION = "worldModel";
const EVENT_COLLECTION = "events";
const QUESTION_LIKE_RE = /[?？]\s*$|\b(?:ne demişti|ne dedi|ne olmuştu|ne oldu|hatırlıyor musun|hatırladın mı|hakkında ne biliyorsun)\b|\b(?:mi|mı|mu|mü)\b.*\b(?:demişti|dedi|söylemişti|söyledi)\b/iu;

export type WorldEventObservationKind = "direct_interaction" | "reported_claim";
export type WorldEventObservationStatus = "grounded" | "ambiguous";

export interface WorldEventObservation {
  id?: string;
  userId: string;
  sessionId: string;
  speakerName?: string;
  kind: WorldEventObservationKind;
  status: WorldEventObservationStatus;
  event: CanonicalWorldEvent;
  createdAt: string;
}

const scope = (value?: string) =>
  (value || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");

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
  event: CanonicalWorldEvent,
  createdAt: string,
  referenceInterval?: WorldEventResolvedTemporalInterval,
): CanonicalWorldEvent {
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
 * session. Never skip an unresolved intervening event to borrow an older time.
 */
export function previousResolvedIntervalFromObservations(
  observations: WorldEventObservation[],
  sessionId: string,
): WorldEventResolvedTemporalInterval | undefined {
  const sorted = [...observations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const previous = sorted.find((row) => row.sessionId === sessionId);
  return previous?.event?.temporal?.resolved;
}

async function loadPreviousResolvedInterval(
  parent: ReturnType<typeof doc>,
  sessionId: string,
): Promise<WorldEventResolvedTemporalInterval | undefined> {
  const snapshot = await getDocs(
    query(collection(parent, EVENT_COLLECTION), orderBy("createdAt", "desc"), limit(12)),
  );
  const observations = snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<WorldEventObservation, "id">),
  }));
  return previousResolvedIntervalFromObservations(observations, sessionId);
}

export async function saveWorldEventObservation(input: {
  userId?: string;
  sessionId: string;
  speakerName?: string;
  event: CanonicalWorldEvent;
}): Promise<void> {
  const classification = classifyWorldEventObservation(input.event);
  if (!classification.persist) return;

  const createdAt = new Date().toISOString();
  const userId = scope(input.userId);
  const parent = doc(db, WORLD_MODEL_COLLECTION, userId);
  const needsPreviousEvent = input.event.temporal?.dependency?.anchor === "previous_event";
  const referenceInterval = needsPreviousEvent
    ? await loadPreviousResolvedInterval(parent, input.sessionId).catch(() => undefined)
    : undefined;
  const event = enrichWorldEventTemporalAtPersistence(input.event, createdAt, referenceInterval);

  await addDoc(collection(parent, EVENT_COLLECTION), {
    userId,
    sessionId: input.sessionId,
    speakerName: input.speakerName || null,
    kind: classification.kind,
    status: classification.status,
    event,
    createdAt,
  });
}

export async function loadRecentWorldEventObservations(
  userId?: string,
  maxItems = 20,
): Promise<WorldEventObservation[]> {
  const safeLimit = Math.max(1, Math.min(maxItems, 100));
  const userScope = scope(userId);
  const parent = doc(db, WORLD_MODEL_COLLECTION, userScope);
  const snapshot = await getDocs(
    query(collection(parent, EVENT_COLLECTION), orderBy("createdAt", "desc"), limit(safeLimit)),
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<WorldEventObservation, "id">),
  }));
}
