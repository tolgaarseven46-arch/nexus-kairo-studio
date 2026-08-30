import type { SemanticEvent } from "./semanticEventEngine";
import type { EntityResolutionResult, ResolvedEntityReference } from "./entityResolutionEngine";

export type WorldEventType =
  | "insult"
  | "support"
  | "compliment"
  | "apology"
  | "repair"
  | "command"
  | "rejection"
  | "emotional_share"
  | "general";

export type WorldEventPolarity = "positive" | "negative" | "unknown";
export type WorldEventTemporalRelation = "past" | "present" | "future" | "unspecified";

export interface WorldEventParticipant {
  id?: string;
  name?: string;
  source: "explicit_name" | "first_person" | "second_person" | "semantic_target" | "unknown";
  confidence: number;
}

/**
 * V2 proposition identity is deliberately bounded. It is not a generated
 * sentence; it is the stable semantic key consumed by temporal/contradiction
 * policy. `key` must therefore be reproducible from canonical participants +
 * event type and must never depend on retrieval score or LLM wording.
 */
export interface WorldEventProposition {
  key: string;
  predicate: WorldEventType;
  actorKey?: string;
  targetKey?: string;
}

export interface WorldEventTemporalReference {
  relation: WorldEventTemporalRelation;
  marker?: string;
  asksLatest: boolean;
}

export interface CanonicalWorldEvent {
  raw: string;
  eventType: WorldEventType;
  actor?: WorldEventParticipant;
  target?: WorldEventParticipant;
  reportedSpeech: boolean;
  certainty: number;
  ambiguities: string[];
  evidence: string[];
  /** Canonical World Event v2 fields. Optional only for legacy persisted rows. */
  proposition?: WorldEventProposition;
  polarity?: WorldEventPolarity;
  temporal?: WorldEventTemporalReference;
}

const REPORTING_RE = /\b(?:dedi|demiş|diyor|diyordu|söyledi|söylemiş|söylüyor)\b/iu;
const EXPLICIT_APOLOGY_ACTION_RE = /\bözür\s+diledi\b/iu;
const NEGATED_CLAIM_RE = /\b(?:değil(?:di)?|demedi|söylemedi|yapmadı|olmadı|etmedi|istemedi|sevmedi|kızmadı)\b/iu;
const FUTURE_RE = /\b(?:yarın|sonra|yapacak|edecek|olacak|diyecek|söyleyecek)\b/iu;
const PRESENT_RE = /\b(?:bugün|şimdi|şu an|halen|hâlen)\b/iu;
const PAST_RE = /\b(?:dün|önce|geçen|demişti|dedi|söyledi|yaptı|oldu|etti)\b/iu;
const LATEST_RE = /\ben\s+son\b/iu;

function eventTypeFromSemantic(event: SemanticEvent, message: string): WorldEventType {
  if (event.insult || event.intent === "insult") return "insult";
  if (event.intent === "support") return "support";
  if (event.intent === "compliment") return "compliment";
  if (event.intent === "apology" || EXPLICIT_APOLOGY_ACTION_RE.test(message)) return "apology";
  if (event.intent === "repair" || event.repairAttempt) return "repair";
  if (event.intent === "command") return "command";
  if (event.intent === "rejection") return "rejection";
  if (event.intent === "emotional_share") return "emotional_share";
  return "general";
}

const participantKey = (participant?: WorldEventParticipant): string | undefined => {
  if (!participant) return undefined;
  const value = participant.id || participant.name;
  return value?.toLocaleLowerCase("tr-TR").trim() || undefined;
};

export function buildWorldEventProposition(
  eventType: WorldEventType,
  actor?: WorldEventParticipant,
  target?: WorldEventParticipant,
): WorldEventProposition {
  const actorKey = participantKey(actor);
  const targetKey = participantKey(target);
  return {
    key: [actorKey || "?", eventType, targetKey || "?"].join("|"),
    predicate: eventType,
    ...(actorKey ? { actorKey } : {}),
    ...(targetKey ? { targetKey } : {}),
  };
}

export function detectWorldEventPolarity(message: string): WorldEventPolarity {
  if (NEGATED_CLAIM_RE.test(message)) return "negative";
  return message.trim() ? "positive" : "unknown";
}

export function detectWorldEventTemporalReference(message: string): WorldEventTemporalReference {
  const text = message.toLocaleLowerCase("tr-TR");
  let relation: WorldEventTemporalRelation = "unspecified";
  let marker: string | undefined;

  if (FUTURE_RE.test(text)) {
    relation = "future";
    marker = text.match(FUTURE_RE)?.[0];
  } else if (PRESENT_RE.test(text)) {
    relation = "present";
    marker = text.match(PRESENT_RE)?.[0];
  } else if (PAST_RE.test(text)) {
    relation = "past";
    marker = text.match(PAST_RE)?.[0];
  }

  return {
    relation,
    ...(marker ? { marker } : {}),
    asksLatest: LATEST_RE.test(text),
  };
}

const toParticipant = (
  ref: ResolvedEntityReference,
  source: WorldEventParticipant["source"],
): WorldEventParticipant => {
  const participant: WorldEventParticipant = {
    source,
    confidence: ref.confidence,
  };
  if (ref.resolvedId) participant.id = ref.resolvedId;
  const name = ref.resolvedName || ref.surface;
  if (name) participant.name = name;
  return participant;
};

/**
 * Converts semantic meaning + discourse entity resolution into a small,
 * canonical world event. It is intentionally conservative: ambiguity is
 * preserved instead of inventing an actor or target.
 */
export function buildCanonicalWorldEvent(
  message: string,
  semantic: SemanticEvent,
  entities: EntityResolutionResult,
): CanonicalWorldEvent {
  const ambiguities = [...entities.ambiguities];
  const evidence: string[] = [];

  const firstPerson = entities.references.find((ref) => ref.role === "first_person");
  const secondPerson = entities.references.find((ref) => ref.role === "second_person" || ref.role === "character");
  const explicitNamed = entities.references.filter((ref) => ref.role === "named_person");
  const unresolvedNamed = explicitNamed.filter((ref) => !ref.resolvedId);
  const explicitCurrentUserName = explicitNamed.find((ref) => ref.resolvedId === "current_user");

  // `reportedSpeech` is the historical compatibility flag used by the world
  // model to mean "the user is reporting an external claim", not only quoted
  // speech. A single explicit third-party actor acting on first-person target
  // ("Ayşe bana özür diledi") is therefore a reported claim as well.
  const reportsExplicitThirdPartyAction = unresolvedNamed.length === 1 && Boolean(firstPerson);
  const reportedSpeech = REPORTING_RE.test(message) || reportsExplicitThirdPartyAction;

  let actor: WorldEventParticipant | undefined;
  let target: WorldEventParticipant | undefined;

  if (reportedSpeech) {
    if (unresolvedNamed.length === 1) {
      actor = toParticipant(unresolvedNamed[0], "explicit_name");
      evidence.push(`actor:${unresolvedNamed[0].surface}`);
    } else if (explicitCurrentUserName && firstPerson) {
      ambiguities.push(
        "Reported speech contains the current speaker's explicit name together with first person; actor is intentionally unresolved.",
      );
      evidence.push(`actor_ambiguous:${explicitCurrentUserName.surface}`);
    }

    if (firstPerson) {
      target = toParticipant(firstPerson, "first_person");
      evidence.push(`target:${firstPerson.surface}`);
    } else if (secondPerson) {
      target = toParticipant(secondPerson, "second_person");
      evidence.push(`target:${secondPerson.surface}`);
    }
  } else {
    if (entities.speaker.name || entities.speaker.id) {
      actor = {
        id: entities.speaker.id,
        name: entities.speaker.name,
        source: "first_person",
        confidence: 1,
      };
      evidence.push("actor:current_speaker");
    }

    if (semantic.target === "kaira") {
      target = {
        id: entities.addressee.id,
        name: entities.addressee.name,
        source: "semantic_target",
        confidence: 0.98,
      };
      evidence.push("target:kaira");
    } else if (firstPerson) {
      target = toParticipant(firstPerson, "first_person");
      evidence.push(`target:${firstPerson.surface}`);
    } else if (unresolvedNamed.length === 1) {
      target = toParticipant(unresolvedNamed[0], "explicit_name");
      evidence.push(`target:${unresolvedNamed[0].surface}`);
    }
  }

  const unresolvedPenalty = (!actor ? 0.18 : 0) + (!target && semantic.target !== "unknown" ? 0.12 : 0);
  const ambiguityPenalty = Math.min(0.45, ambiguities.length * 0.18);
  const certainty = Math.max(
    0.25,
    Math.min(1, entities.confidence - unresolvedPenalty - ambiguityPenalty),
  );
  const eventType = eventTypeFromSemantic(semantic, message);

  return {
    raw: message,
    eventType,
    actor,
    target,
    reportedSpeech,
    certainty,
    ambiguities: [...new Set(ambiguities)],
    evidence,
    proposition: buildWorldEventProposition(eventType, actor, target),
    polarity: detectWorldEventPolarity(message),
    temporal: detectWorldEventTemporalReference(message),
  };
}
