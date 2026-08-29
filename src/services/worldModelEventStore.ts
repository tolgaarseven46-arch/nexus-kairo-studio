import { addDoc, collection, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { CanonicalWorldEvent } from "./worldEventEngine";

const WORLD_MODEL_COLLECTION = "worldModel";
const EVENT_COLLECTION = "events";

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

  // Low-confidence generic chatter has little world-model value. Preserve
  // meaningful or participant-linked observations, including ambiguous claims,
  // but never promote them to grounded facts here.
  const hasParticipant = Boolean(event.actor || event.target);
  const meaningfulType = event.eventType !== "general";
  const persist = event.certainty >= 0.45 && (meaningfulType || hasParticipant);

  return { persist, kind, status };
}

export async function saveWorldEventObservation(input: {
  userId?: string;
  sessionId: string;
  speakerName?: string;
  event: CanonicalWorldEvent;
}): Promise<void> {
  const classification = classifyWorldEventObservation(input.event);
  if (!classification.persist) return;

  const userId = scope(input.userId);
  const parent = doc(db, WORLD_MODEL_COLLECTION, userId);
  await addDoc(collection(parent, EVENT_COLLECTION), {
    userId,
    sessionId: input.sessionId,
    speakerName: input.speakerName || null,
    kind: classification.kind,
    status: classification.status,
    event: input.event,
    createdAt: new Date().toISOString(),
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
