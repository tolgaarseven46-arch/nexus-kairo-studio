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
export type WorldEventTemporalPrecision = "day" | "week" | "hour" | "minute" | "instant" | "unknown";
export type WorldEventTemporalOffsetUnit = "minute" | "hour" | "day" | "week";

export interface WorldEventParticipant {
  id?: string;
  name?: string;
  source: "explicit_name" | "first_person" | "second_person" | "semantic_target" | "unknown";
  confidence: number;
}

export interface WorldEventProposition {
  key: string;
  predicate: WorldEventType;
  actorKey?: string;
  targetKey?: string;
  contentKey?: string;
}

export interface WorldEventResolvedTemporalInterval {
  startAt: string;
  endAt: string;
  precision: WorldEventTemporalPrecision;
  anchorAt: string;
  source: "relative_marker" | "relative_offset" | "explicit_date" | "relation_fallback" | "referenced_event";
}

export interface WorldEventTemporalDependency {
  anchor: "observation" | "previous_event";
  direction: "before" | "after";
  offsetAmount?: number;
  offsetUnit?: WorldEventTemporalOffsetUnit;
  marker: string;
}

export interface WorldEventTemporalReference {
  relation: WorldEventTemporalRelation;
  marker?: string;
  asksLatest: boolean;
  dependency?: WorldEventTemporalDependency;
  resolved?: WorldEventResolvedTemporalInterval;
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
  proposition?: WorldEventProposition;
  polarity?: WorldEventPolarity;
  temporal?: WorldEventTemporalReference;
}

const REPORTING_RE = /\b(?:dedi|demiş|diyor|diyordu|söyledi|söylemiş|söylüyor)\b/iu;
const EXPLICIT_APOLOGY_ACTION_RE = /\bözür\s+diledi\b/iu;
const NEGATED_CLAIM_RE = /\b(?:değil(?:di)?|demedi|söylemedi|yapmadı|olmadı|etmedi|istemedi|sevmedi|kızmadı)\b/iu;
const PRODUCTIVE_NEGATION_RE = /(?:^|[^\p{L}\p{N}_])[\p{L}]+(?:ma|me)(?:yacak|yecek|dı|di|du|dü|mış|miş|muş|müş)(?:[^\p{L}\p{N}_]|$)/iu;
const FUTURE_RE = /\b(?:yarın|sonra|yapacak|edecek|olacak|diyecek|söyleyecek|ertesi)\b/iu;
const PRESENT_RE = /\b(?:bugün|şimdi|şu an|halen|hâlen)\b/iu;
const PAST_RE = /\b(?:dün|önce|geçen|demişti|dedi|söyledi|yaptı|oldu|etti)\b/iu;
const LATEST_RE = /\ben\s+son\b/iu;
const NUMBER_WORDS: Record<string, number> = {
  bir: 1,
  iki: 2,
  üç: 3,
  dort: 4,
  dört: 4,
  beş: 5,
  bes: 5,
  altı: 6,
  alti: 6,
  yedi: 7,
};
const OFFSET_RE = /\b(\d+|bir|iki|üç|dört|dort|beş|bes|altı|alti|yedi)\s+(dakika|saat|gün|hafta)\s+(önce|sonra)\b/iu;

const CONTENT_CUES: Partial<Record<WorldEventType, Array<[string, RegExp]>>> = {
  insult: [
    ["aptal", /(?:^|[^\p{L}\p{N}_])aptal(?:[^\p{L}\p{N}_]|$)/iu],
    ["salak", /(?:^|[^\p{L}\p{N}_])salak(?:[^\p{L}\p{N}_]|$)/iu],
    ["gerizekalı", /(?:^|[^\p{L}\p{N}_])(?:gerizekalı|geri\s+zekalı)(?:[^\p{L}\p{N}_]|$)/iu],
    ["mal", /(?:^|[^\p{L}\p{N}_])mal(?:[^\p{L}\p{N}_]|$)/iu],
    ["şerefsiz", /(?:^|[^\p{L}\p{N}_])şerefsiz(?:[^\p{L}\p{N}_]|$)/iu],
    ["ezik", /(?:^|[^\p{L}\p{N}_])ezik(?:[^\p{L}\p{N}_]|$)/iu],
    ["piç", /(?:^|[^\p{L}\p{N}_])piç(?:[^\p{L}\p{N}_]|$)/iu],
    ["yavşak", /(?:^|[^\p{L}\p{N}_])yavşak(?:[^\p{L}\p{N}_]|$)/iu],
  ],
  support: [["support", /(?:yanındayım|haklısın|seni\s+anlıyorum|destekliyorum|merak\s+etme)/iu]],
  apology: [["apology", /(?:özür|pardon|kusura\s+bakma)/iu]],
  repair: [["repair", /(?:barış|telafi|beni\s+affet|konuşup\s+çözelim)/iu]],
  general: [
    ["resign", /(?:^|[^\p{L}\p{N}_])istifa(?:[^\p{L}\p{N}_]|$)/iu],
    ["leave_job", /(?:işten|işinden)\s+ayrıl/iu],
    ["manager_meeting", /(?:(?:müdür|patron)(?:le|la)?\s+görüş|görüş[\p{L}]*\s+(?:müdür|patron)(?:le|la)?)/iu],
    ["salary_raise", /(?:maaş[\p{L}]*.{0,24}(?:zam|artış)|(?:zam|artış).{0,24}maaş[\p{L}]*)/iu],
    ["student_status", /(?:^|[^\p{L}\p{N}_])öğrenci(?:yim|ydi|ymiş|yiz|ydi[mn]?|ymişim)?(?:[^\p{L}\p{N}_]|$)/iu],
    ["go_to_work", /işe\s+git/iu],
  ],
};

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

export function detectWorldEventContentKey(
  eventType: WorldEventType,
  message: string,
): string | undefined {
  for (const [key, pattern] of CONTENT_CUES[eventType] || []) {
    if (pattern.test(message)) return key;
  }
  return undefined;
}

export function buildWorldEventProposition(
  eventType: WorldEventType,
  actor?: WorldEventParticipant,
  target?: WorldEventParticipant,
  contentKey?: string,
): WorldEventProposition {
  const actorKey = participantKey(actor);
  const targetKey = participantKey(target);
  const normalizedContentKey = contentKey?.toLocaleLowerCase("tr-TR").trim() || undefined;
  return {
    key: [actorKey || "?", eventType, targetKey || "?", normalizedContentKey || "?"].join("|"),
    predicate: eventType,
    ...(actorKey ? { actorKey } : {}),
    ...(targetKey ? { targetKey } : {}),
    ...(normalizedContentKey ? { contentKey: normalizedContentKey } : {}),
  };
}

export function detectWorldEventPolarity(message: string): WorldEventPolarity {
  if (NEGATED_CLAIM_RE.test(message) || PRODUCTIVE_NEGATION_RE.test(message)) return "negative";
  return message.trim() ? "positive" : "unknown";
}

function parseOffsetDependency(text: string): WorldEventTemporalDependency | undefined {
  const match = text.match(OFFSET_RE);
  if (!match) return undefined;
  const rawAmount = match[1].toLocaleLowerCase("tr-TR");
  const offsetAmount = /^\d+$/.test(rawAmount) ? Number(rawAmount) : NUMBER_WORDS[rawAmount];
  const unitMap: Record<string, WorldEventTemporalOffsetUnit> = {
    dakika: "minute",
    saat: "hour",
    gün: "day",
    hafta: "week",
  };
  const offsetUnit = unitMap[match[2].toLocaleLowerCase("tr-TR")];
  if (!offsetAmount || !offsetUnit) return undefined;
  return {
    anchor: "observation",
    direction: match[3].toLocaleLowerCase("tr-TR") === "önce" ? "before" : "after",
    offsetAmount,
    offsetUnit,
    marker: match[0],
  };
}

export function detectWorldEventTemporalReference(message: string): WorldEventTemporalReference {
  const text = message.toLocaleLowerCase("tr-TR");
  let relation: WorldEventTemporalRelation = "unspecified";
  let marker: string | undefined;
  let dependency = parseOffsetDependency(text);

  if (/\bert(?:esi)?\s+gün\b/iu.test(text)) {
    dependency = {
      anchor: "previous_event",
      direction: "after",
      offsetAmount: 1,
      offsetUnit: "day",
      marker: text.match(/\bert(?:esi)?\s+gün\b/iu)?.[0] || "ertesi gün",
    };
  } else if (/\bondan\s+sonra\b/iu.test(text)) {
    dependency = { anchor: "previous_event", direction: "after", marker: "ondan sonra" };
  } else if (/\bondan\s+önce\b/iu.test(text)) {
    dependency = { anchor: "previous_event", direction: "before", marker: "ondan önce" };
  }

  if (dependency) {
    relation = dependency.direction === "before" ? "past" : "future";
    marker = dependency.marker;
  } else if (FUTURE_RE.test(text)) {
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
    ...(dependency ? { dependency } : {}),
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
  const contentKey = detectWorldEventContentKey(eventType, message);

  return {
    raw: message,
    eventType,
    actor,
    target,
    reportedSpeech,
    certainty,
    ambiguities: [...new Set(ambiguities)],
    evidence,
    proposition: buildWorldEventProposition(eventType, actor, target, contentKey),
    polarity: detectWorldEventPolarity(message),
    temporal: detectWorldEventTemporalReference(message),
  };
}
