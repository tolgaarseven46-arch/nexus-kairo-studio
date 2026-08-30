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

export interface WorldEventParticipant {
  id?: string;
  name?: string;
  source: "explicit_name" | "first_person" | "second_person" | "semantic_target" | "unknown";
  confidence: number;
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
}

const REPORTING_RE = /\b(?:dedi|demiş|diyor|diyordu|söyledi|söylemiş|söylüyor)\b/iu;

function eventTypeFromSemantic(event: SemanticEvent): WorldEventType {
  if (event.insult || event.intent === "insult") return "insult";
  if (event.intent === "support") return "support";
  if (event.intent === "compliment") return "compliment";
  if (event.intent === "apology") return "apology";
  if (event.intent === "repair" || event.repairAttempt) return "repair";
  if (event.intent === "command") return "command";
  if (event.intent === "rejection") return "rejection";
  if (event.intent === "emotional_share") return "emotional_share";
  return "general";
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
  const reportedSpeech = REPORTING_RE.test(message);
  const ambiguities = [...entities.ambiguities];
  const evidence: string[] = [];

  const firstPerson = entities.references.find((ref) => ref.role === "first_person");
  const secondPerson = entities.references.find((ref) => ref.role === "second_person" || ref.role === "character");
  const explicitNamed = entities.references.filter((ref) => ref.role === "named_person");
  const unresolvedNamed = explicitNamed.filter((ref) => !ref.resolvedId);
  const explicitCurrentUserName = explicitNamed.find((ref) => ref.resolvedId === "current_user");

  let actor: WorldEventParticipant | undefined;
  let target: WorldEventParticipant | undefined;

  if (reportedSpeech) {
    // For reported speech, an unresolved explicit name is the strongest actor evidence.
    if (unresolvedNamed.length === 1) {
      actor = toParticipant(unresolvedNamed[0], "explicit_name");
      evidence.push(`actor:${unresolvedNamed[0].surface}`);
    } else if (explicitCurrentUserName && firstPerson) {
      // "Mert bana ... dedi" while Mert is the current speaker is discourse-ambiguous.
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
    // Direct utterances are authored by the current speaker.
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

  return {
    raw: message,
    eventType: eventTypeFromSemantic(semantic),
    actor,
    target,
    reportedSpeech,
    certainty,
    ambiguities: [...new Set(ambiguities)],
    evidence,
  };
}
