import {
  parseConversationGraphNamespaceV1,
  parseEscalationEvidenceRefV1,
  parseSuppressionReceiptV1,
  validateConversationGraphReplayBundleV1,
  type ConversationGraphNamespaceV1,
  type DecisionOwnerRegistryV1,
  type EscalationEvidenceRefV1,
  type OwnedEvidenceStoreV1,
  type SuppressionReceiptV1,
} from "./sliceBConversationGraphIngressContracts";

export type ConversationActorKind = "human" | "droit" | "system";
export type PlatformRole = "owner" | "admin" | "moderator" | "member";

export interface ConversationParticipantV1 {
  participantId: string;
  actorKind: ConversationActorKind;
  platformRoles: PlatformRole[];
  firstSeenAt: number;
  lastSeenAt: number;
  messageCount: number;
}

export interface ConversationEventV1 {
  eventId: string;
  actorId: string;
  actorKind: ConversationActorKind;
  occurredAt: number;
  sourceSequence?: number;
  semanticSnapshotRef?: string;
}

export interface ExplicitReplyEdgeV1 {
  fromEventId: string;
  toEventId: string;
  source: "platform";
}

export interface ExplicitMentionEdgeV1 {
  fromEventId: string;
  toParticipantId: string;
  source: "platform";
}

export interface InferredAddressCandidateEdgeV1 {
  fromEventId: string;
  toParticipantId: string;
  confidence: number;
  ruleId: string;
  evidenceEventIds: string[];
}

export interface UnresolvedReferenceV1 {
  sourceEventId: string;
  referenceType: "reply" | "mention" | "participant" | "escalation_evidence";
  referencedId: string;
}

export interface ConversationGraphV1 {
  schemaVersion: 1;
  derivationVersion: string;
  namespace: ConversationGraphNamespaceV1;
  conversationId: string;
  participants: ConversationParticipantV1[];
  events: ConversationEventV1[];
  explicitReplyEdges: ExplicitReplyEdgeV1[];
  explicitMentionEdges: ExplicitMentionEdgeV1[];
  inferredAddressCandidateEdges: InferredAddressCandidateEdgeV1[];
  unresolvedReferences: UnresolvedReferenceV1[];
  suppressionReceipts: SuppressionReceiptV1[];
  escalationEvidenceRefs: EscalationEvidenceRefV1[];
  builtFromEventIds: string[];
  snapshotHash: string;
}

export interface RawConversationGraphEventV1 {
  eventId: string;
  actorId: string;
  actorKind: ConversationActorKind;
  occurredAt: number;
  sourceSequence?: number;
  semanticSnapshotRef?: string;
  explicitReplyToEventId?: string;
  explicitMentionedParticipantIds?: string[];
  [key: string]: unknown;
}

export interface RawConversationParticipantV1 {
  participantId: string;
  actorKind: ConversationActorKind;
  platformRoles: readonly PlatformRole[];
  [key: string]: unknown;
}

export interface BuildConversationGraphInputV1 {
  namespace: unknown;
  conversationId: string;
  participants: ReadonlyArray<RawConversationParticipantV1>;
  events: ReadonlyArray<RawConversationGraphEventV1>;
  inferredAddressCandidateEdges?: ReadonlyArray<Record<string, unknown>>;
  suppressionReceipts?: ReadonlyArray<unknown>;
  escalationEvidenceRefs?: ReadonlyArray<unknown>;
  decisionOwnerRegistry: DecisionOwnerRegistryV1;
  ownedEvidenceStore: OwnedEvidenceStoreV1;
  platformIdentityFacts: Readonly<Record<string, ConversationActorKind>>;
  [key: string]: unknown;
}

export interface ReplayDepsV1 {
  livePlatformRead?: (...args: unknown[]) => unknown;
  liveSemanticRead?: (...args: unknown[]) => unknown;
}

const DERIVATION_VERSION = "conversation-graph-v1@1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
};

const requireFiniteNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
};

const compareCodepoint = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareCodepoint)
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
};

const stableStringify = (value: unknown): string =>
  JSON.stringify(stableValue(value));

const fnv1a32 = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const normalizeEventForGraph = (
  raw: RawConversationGraphEventV1,
): ConversationEventV1 => {
  const event: ConversationEventV1 = {
    eventId: requireString(raw.eventId, "eventId"),
    actorId: requireString(raw.actorId, "actorId"),
    actorKind: raw.actorKind,
    occurredAt: requireFiniteNumber(raw.occurredAt, "occurredAt"),
  };
  if (
    raw.actorKind !== "human" &&
    raw.actorKind !== "droit" &&
    raw.actorKind !== "system"
  ) {
    throw new Error("actorKind must be human, droit, or system");
  }
  if (raw.sourceSequence !== undefined) {
    event.sourceSequence = requireFiniteNumber(
      raw.sourceSequence,
      "sourceSequence",
    );
  }
  if (raw.semanticSnapshotRef !== undefined) {
    event.semanticSnapshotRef = requireString(
      raw.semanticSnapshotRef,
      "semanticSnapshotRef",
    );
  }
  return event;
};

const canonicalRawEventIdentity = (
  raw: RawConversationGraphEventV1,
): string =>
  stableStringify({
    eventId: raw.eventId,
    actorId: raw.actorId,
    actorKind: raw.actorKind,
    occurredAt: raw.occurredAt,
    sourceSequence: raw.sourceSequence,
    semanticSnapshotRef: raw.semanticSnapshotRef,
    explicitReplyToEventId: raw.explicitReplyToEventId,
    explicitMentionedParticipantIds: raw.explicitMentionedParticipantIds ?? [],
  });

export const normalizeConversationEventsV1 = (
  rawEvents: ReadonlyArray<RawConversationGraphEventV1>,
): ConversationEventV1[] => {
  const accepted = new Map<
    string,
    { identity: string; event: ConversationEventV1 }
  >();

  for (const raw of rawEvents) {
    const eventId = requireString(raw.eventId, "eventId");
    const identity = canonicalRawEventIdentity(raw);
    const existing = accepted.get(eventId);

    if (existing) {
      if (existing.identity !== identity) {
        throw new Error(`duplicate_event_conflict:${eventId}`);
      }
      continue;
    }

    accepted.set(eventId, {
      identity,
      event: normalizeEventForGraph(raw),
    });
  }

  return [...accepted.values()]
    .map(({ event }) => event)
    .sort((a, b) => {
      if (a.occurredAt !== b.occurredAt) {
        return a.occurredAt - b.occurredAt;
      }

      const aSeq = a.sourceSequence;
      const bSeq = b.sourceSequence;
      if (aSeq !== undefined && bSeq !== undefined && aSeq !== bSeq) {
        return aSeq - bSeq;
      }
      if (aSeq !== undefined && bSeq === undefined) return -1;
      if (aSeq === undefined && bSeq !== undefined) return 1;

      return compareCodepoint(a.eventId, b.eventId);
    });
};

const normalizeParticipants = (
  rawParticipants: ReadonlyArray<RawConversationParticipantV1>,
  events: ReadonlyArray<ConversationEventV1>,
): ConversationParticipantV1[] => {
  const facts = new Map<string, RawConversationParticipantV1>();
  for (const participant of rawParticipants) {
    facts.set(
      requireString(participant.participantId, "participantId"),
      participant,
    );
  }

  const eventStats = new Map<
    string,
    { firstSeenAt: number; lastSeenAt: number; messageCount: number }
  >();
  for (const event of events) {
    const current = eventStats.get(event.actorId);
    if (!current) {
      eventStats.set(event.actorId, {
        firstSeenAt: event.occurredAt,
        lastSeenAt: event.occurredAt,
        messageCount: 1,
      });
    } else {
      current.firstSeenAt = Math.min(current.firstSeenAt, event.occurredAt);
      current.lastSeenAt = Math.max(current.lastSeenAt, event.occurredAt);
      current.messageCount += 1;
    }
  }

  const ids = new Set<string>([...facts.keys(), ...eventStats.keys()]);
  return [...ids]
    .sort(compareCodepoint)
    .map((participantId) => {
      const fact = facts.get(participantId);
      const stats = eventStats.get(participantId);
      if (!fact) {
        const event = events.find((candidate) => candidate.actorId === participantId);
        if (!event || !stats) {
          throw new Error(`participant fact missing:${participantId}`);
        }
        return {
          participantId,
          actorKind: event.actorKind,
          platformRoles: [],
          ...stats,
        };
      }

      const actorKind = fact.actorKind;
      if (
        actorKind !== "human" &&
        actorKind !== "droit" &&
        actorKind !== "system"
      ) {
        throw new Error("participant actorKind must be human, droit, or system");
      }

      return {
        participantId,
        actorKind,
        platformRoles: [...fact.platformRoles],
        firstSeenAt: stats?.firstSeenAt ?? 0,
        lastSeenAt: stats?.lastSeenAt ?? 0,
        messageCount: stats?.messageCount ?? 0,
      };
    });
};

const normalizeInferredEdges = (
  edges: ReadonlyArray<Record<string, unknown>>,
): InferredAddressCandidateEdgeV1[] =>
  edges.map((edge) => ({
    fromEventId: requireString(edge.fromEventId, "fromEventId"),
    toParticipantId: requireString(edge.toParticipantId, "toParticipantId"),
    confidence: requireFiniteNumber(edge.confidence, "confidence"),
    ruleId: requireString(edge.ruleId, "ruleId"),
    evidenceEventIds: Array.isArray(edge.evidenceEventIds)
      ? edge.evidenceEventIds.map((id) => requireString(id, "evidenceEventId"))
      : [],
  }));

const hashGraph = (
  graph: Omit<ConversationGraphV1, "snapshotHash">,
): string => fnv1a32(stableStringify(graph));

export const buildConversationGraphV1 = (
  input: BuildConversationGraphInputV1,
): ConversationGraphV1 => {
  const namespace = parseConversationGraphNamespaceV1(input.namespace);

  for (const participant of input.participants) {
    validateActorKindFactV1(
      {
        actorId: participant.participantId,
        actorKind: participant.actorKind,
      },
      input.platformIdentityFacts,
    );
  }
  for (const rawEvent of input.events) {
    validateActorKindFactV1(
      {
        actorId: rawEvent.actorId,
        actorKind: rawEvent.actorKind,
      },
      input.platformIdentityFacts,
    );
  }

  const events = normalizeConversationEventsV1(input.events);
  const acceptedEventIds = new Set(events.map((event) => event.eventId));
  const participantIds = new Set(
    input.participants.map((participant) => participant.participantId),
  );

  const unresolvedReferences: UnresolvedReferenceV1[] = [];
  const explicitReplyEdges: ExplicitReplyEdgeV1[] = [];
  const explicitMentionEdges: ExplicitMentionEdgeV1[] = [];

  const rawById = new Map<string, RawConversationGraphEventV1>();
  for (const raw of input.events) {
    if (!rawById.has(raw.eventId)) rawById.set(raw.eventId, raw);
  }

  for (const event of events) {
    const raw = rawById.get(event.eventId);
    if (!raw) continue;

    if (raw.explicitReplyToEventId !== undefined) {
      const target = requireString(
        raw.explicitReplyToEventId,
        "explicitReplyToEventId",
      );
      if (acceptedEventIds.has(target)) {
        explicitReplyEdges.push({
          fromEventId: event.eventId,
          toEventId: target,
          source: "platform",
        });
      } else {
        unresolvedReferences.push({
          sourceEventId: event.eventId,
          referenceType: "reply",
          referencedId: target,
        });
      }
    }

    for (const mentioned of raw.explicitMentionedParticipantIds ?? []) {
      const participantId = requireString(
        mentioned,
        "explicitMentionedParticipantId",
      );
      if (participantIds.has(participantId)) {
        explicitMentionEdges.push({
          fromEventId: event.eventId,
          toParticipantId: participantId,
          source: "platform",
        });
      } else {
        unresolvedReferences.push({
          sourceEventId: event.eventId,
          referenceType: "participant",
          referencedId: participantId,
        });
      }
    }
  }

  const suppressionReceipts = (input.suppressionReceipts ?? []).map((receipt) =>
    parseSuppressionReceiptV1(receipt, input.decisionOwnerRegistry),
  );

  const escalationEvidenceRefs: EscalationEvidenceRefV1[] = [];
  for (const candidate of input.escalationEvidenceRefs ?? []) {
    try {
      escalationEvidenceRefs.push(
        parseEscalationEvidenceRefV1(candidate, input.ownedEvidenceStore),
      );
    } catch {
      if (isRecord(candidate)) {
        const sourceEventId =
          typeof candidate.eventId === "string" && candidate.eventId.length > 0
            ? candidate.eventId
            : "unknown";
        const referencedId =
          typeof candidate.evidenceRef === "string" &&
          candidate.evidenceRef.length > 0
            ? candidate.evidenceRef
            : "unknown";
        unresolvedReferences.push({
          sourceEventId,
          referenceType: "escalation_evidence",
          referencedId,
        });
      }
    }
  }

  const withoutHash: Omit<ConversationGraphV1, "snapshotHash"> = {
    schemaVersion: 1,
    derivationVersion: DERIVATION_VERSION,
    namespace,
    conversationId: requireString(input.conversationId, "conversationId"),
    participants: normalizeParticipants(input.participants, events),
    events,
    explicitReplyEdges,
    explicitMentionEdges,
    inferredAddressCandidateEdges: normalizeInferredEdges(
      input.inferredAddressCandidateEdges ?? [],
    ),
    unresolvedReferences,
    suppressionReceipts,
    escalationEvidenceRefs,
    builtFromEventIds: events.map((event) => event.eventId),
  };

  return {
    ...withoutHash,
    snapshotHash: hashGraph(withoutHash),
  };
};

export const replayConversationGraphV1 = (
  bundle: unknown,
  _deps?: ReplayDepsV1,
): ConversationGraphV1 => {
  const validated = validateConversationGraphReplayBundleV1(bundle);
  return validated.graph as unknown as ConversationGraphV1;
};

export const validateActorKindFactV1 = (
  eventFact: { actorId: string; actorKind: ConversationActorKind },
  platformIdentityFacts: Readonly<Record<string, ConversationActorKind>>,
): true => {
  const expected = platformIdentityFacts[eventFact.actorId];
  if (!expected) {
    throw new Error(`actorKind identity fact missing:${eventFact.actorId}`);
  }
  if (expected !== eventFact.actorKind) {
    throw new Error(
      `actorKind mismatch for ${eventFact.actorId}: expected ${expected}, got ${eventFact.actorKind}`,
    );
  }
  return true;
};

export const applyConversationGraphRetentionV1 = (
  graph: ConversationGraphV1,
  retainedEventIds: readonly string[],
): ConversationGraphV1 => {
  const retained = new Set(retainedEventIds);
  const events = graph.events.filter((event) => retained.has(event.eventId));
  const participants = normalizeParticipants(
    graph.participants.map((participant) => ({
      participantId: participant.participantId,
      actorKind: participant.actorKind,
      platformRoles: participant.platformRoles,
    })),
    events,
  ).filter((participant) => participant.messageCount > 0);

  const explicitReplyEdges = graph.explicitReplyEdges.filter(
    (edge) => retained.has(edge.fromEventId) && retained.has(edge.toEventId),
  );
  const explicitMentionEdges = graph.explicitMentionEdges.filter((edge) =>
    retained.has(edge.fromEventId),
  );
  const inferredAddressCandidateEdges =
    graph.inferredAddressCandidateEdges.filter((edge) =>
      retained.has(edge.fromEventId),
    );
  const unresolvedReferences = graph.unresolvedReferences.filter((ref) =>
    retained.has(ref.sourceEventId),
  );
  const suppressionReceipts = graph.suppressionReceipts.filter((receipt) =>
    retained.has(receipt.sourceEventId),
  );
  const escalationEvidenceRefs = graph.escalationEvidenceRefs.filter((ref) =>
    retained.has(ref.eventId),
  );

  const withoutHash: Omit<ConversationGraphV1, "snapshotHash"> = {
    ...graph,
    participants,
    events,
    explicitReplyEdges,
    explicitMentionEdges,
    inferredAddressCandidateEdges,
    unresolvedReferences,
    suppressionReceipts,
    escalationEvidenceRefs,
    builtFromEventIds: events.map((event) => event.eventId),
  };
  delete (withoutHash as Partial<ConversationGraphV1>).snapshotHash;

  return {
    ...withoutHash,
    snapshotHash: hashGraph(withoutHash),
  };
};
