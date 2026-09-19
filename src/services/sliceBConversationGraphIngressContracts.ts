export interface ConversationGraphNamespaceBaseV1 {
  serverId: string;
  roomId: string;
  kairaInstanceId: string;
}

export type ConversationGraphNamespaceV1 =
  | (ConversationGraphNamespaceBaseV1 & {
      environmentId: "test";
      testRunId: string;
    })
  | (ConversationGraphNamespaceBaseV1 & {
      environmentId: "staging" | "live-beta";
      testRunId?: string;
    });

export type RegisteredDecisionOwnerId = string & {
  readonly __registeredDecisionOwnerId: unique symbol;
};

export type RegisteredEvidenceOwnerId = string & {
  readonly __registeredEvidenceOwnerId: unique symbol;
};

export interface SuppressionReceiptV1 {
  decisionId: string;
  ownerId: RegisteredDecisionOwnerId;
  ownerRegistryVersion: string;
  ownerAttestationRef: string;
  sourceEventId: string;
  reasonCode: string;
  occurredAt: number;
}

export interface EscalationEvidenceRefV1 {
  eventId: string;
  evidenceOwnerId: RegisteredEvidenceOwnerId;
  evidenceRef: string;
  evidenceHash: string;
}

export interface DecisionOwnerRegistryV1 {
  version: string;
  owners: Readonly<Record<string, string>>;
}

export interface OwnedEvidenceStoreV1 {
  readonly [evidenceRef: string]: {
    ownerId: string;
    hash: string;
  };
}

export interface ConversationGraphEvidenceViewV1 {
  schemaVersion: 1;
  namespace: ConversationGraphNamespaceV1;
  conversationId: string;
  participants: unknown[];
  events: unknown[];
  explicitReplyEdges: unknown[];
  explicitMentionEdges: unknown[];
  unresolvedReferences: unknown[];
}

export interface FrozenSemanticSnapshotEvidenceV1 {
  semanticSnapshotRef: string;
  snapshotHash: string;
  canonicalSnapshot: unknown;
}

export interface ConversationGraphReplayBundleV1 {
  graph: {
    events: Array<{
      semanticSnapshotRef?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  frozenSemanticSnapshots: FrozenSemanticSnapshotEvidenceV1[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
};

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
};

const optionalString = (value: unknown, label: string): string | undefined => {
  if (value === undefined) return undefined;
  return requireString(value, label);
};

const requireFiniteNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
};

const requireArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
};

export const parseConversationGraphNamespaceV1 = (
  value: unknown,
): ConversationGraphNamespaceV1 => {
  const input = requireRecord(value, "ConversationGraphNamespaceV1");
  const environmentId = requireString(input.environmentId, "environmentId");
  const base = {
    serverId: requireString(input.serverId, "serverId"),
    roomId: requireString(input.roomId, "roomId"),
    kairaInstanceId: requireString(input.kairaInstanceId, "kairaInstanceId"),
  };

  if (environmentId === "test") {
    return {
      ...base,
      environmentId,
      testRunId: requireString(
        input.testRunId,
        "testRunId is required when environmentId=test",
      ),
    };
  }

  if (environmentId === "staging" || environmentId === "live-beta") {
    const testRunId = optionalString(input.testRunId, "testRunId");
    return testRunId
      ? { ...base, environmentId, testRunId }
      : { ...base, environmentId };
  }

  throw new Error("environmentId must be test, staging, or live-beta");
};

export const parseSuppressionReceiptV1 = (
  value: unknown,
  registry: DecisionOwnerRegistryV1,
): SuppressionReceiptV1 => {
  const input = requireRecord(value, "SuppressionReceiptV1");
  const ownerRegistryVersion = requireString(
    input.ownerRegistryVersion,
    "ownerRegistryVersion",
  );
  if (ownerRegistryVersion !== registry.version) {
    throw new Error("suppression owner registry version mismatch");
  }

  const ownerId = requireString(input.ownerId, "ownerId");
  const expectedAttestation = registry.owners[ownerId];
  if (!expectedAttestation) {
    throw new Error("suppression owner is not registered");
  }

  const ownerAttestationRef = requireString(
    input.ownerAttestationRef,
    "ownerAttestationRef",
  );
  if (ownerAttestationRef !== expectedAttestation) {
    throw new Error("suppression owner attestation is invalid");
  }

  return {
    decisionId: requireString(input.decisionId, "decisionId"),
    ownerId: ownerId as RegisteredDecisionOwnerId,
    ownerRegistryVersion,
    ownerAttestationRef,
    sourceEventId: requireString(input.sourceEventId, "sourceEventId"),
    reasonCode: requireString(input.reasonCode, "reasonCode"),
    occurredAt: requireFiniteNumber(input.occurredAt, "occurredAt"),
  };
};

export const parseEscalationEvidenceRefV1 = (
  value: unknown,
  store: OwnedEvidenceStoreV1,
): EscalationEvidenceRefV1 => {
  const input = requireRecord(value, "EscalationEvidenceRefV1");
  const evidenceRef = requireString(input.evidenceRef, "evidenceRef");
  const owned = store[evidenceRef];
  if (!owned) {
    throw new Error("escalation evidenceRef does not resolve");
  }

  const evidenceOwnerId = requireString(
    input.evidenceOwnerId,
    "evidenceOwnerId",
  );
  if (evidenceOwnerId !== owned.ownerId) {
    throw new Error("escalation evidence owner mismatch");
  }

  const evidenceHash = requireString(input.evidenceHash, "evidenceHash");
  if (evidenceHash !== owned.hash) {
    throw new Error("escalation evidence hash mismatch");
  }

  return {
    eventId: requireString(input.eventId, "eventId"),
    evidenceOwnerId: evidenceOwnerId as RegisteredEvidenceOwnerId,
    evidenceRef,
    evidenceHash,
  };
};

export const buildConversationGraphEvidenceViewV1 = (
  value: unknown,
): ConversationGraphEvidenceViewV1 => {
  const input = requireRecord(value, "ConversationGraphV1");
  if (input.schemaVersion !== 1) {
    throw new Error("ConversationGraphV1 schemaVersion must be 1");
  }

  return {
    schemaVersion: 1,
    namespace: parseConversationGraphNamespaceV1(input.namespace),
    conversationId: requireString(input.conversationId, "conversationId"),
    participants: [...requireArray(input.participants, "participants")],
    events: [...requireArray(input.events, "events")],
    explicitReplyEdges: [
      ...requireArray(input.explicitReplyEdges, "explicitReplyEdges"),
    ],
    explicitMentionEdges: [
      ...requireArray(input.explicitMentionEdges, "explicitMentionEdges"),
    ],
    unresolvedReferences: [
      ...requireArray(input.unresolvedReferences, "unresolvedReferences"),
    ],
  };
};

export const validateConversationGraphReplayBundleV1 = (
  value: unknown,
): ConversationGraphReplayBundleV1 => {
  const input = requireRecord(value, "ConversationGraphReplayBundleV1");
  const graph = requireRecord(input.graph, "graph");
  const events = requireArray(graph.events, "graph.events");
  const frozenRaw = requireArray(
    input.frozenSemanticSnapshots,
    "frozenSemanticSnapshots",
  );

  const frozenSemanticSnapshots = frozenRaw.map((entry, index) => {
    const record = requireRecord(
      entry,
      `frozenSemanticSnapshots[${index}]`,
    );
    return {
      semanticSnapshotRef: requireString(
        record.semanticSnapshotRef,
        `frozenSemanticSnapshots[${index}].semanticSnapshotRef`,
      ),
      snapshotHash: requireString(
        record.snapshotHash,
        `frozenSemanticSnapshots[${index}].snapshotHash`,
      ),
      canonicalSnapshot: record.canonicalSnapshot,
    };
  });

  const refs = new Map<string, FrozenSemanticSnapshotEvidenceV1>();
  for (const snapshot of frozenSemanticSnapshots) {
    if (refs.has(snapshot.semanticSnapshotRef)) {
      throw new Error(
        `duplicate semanticSnapshotRef in replay bundle: ${snapshot.semanticSnapshotRef}`,
      );
    }
    refs.set(snapshot.semanticSnapshotRef, snapshot);
  }

  for (const [index, rawEvent] of events.entries()) {
    const event = requireRecord(rawEvent, `graph.events[${index}]`);
    if (event.semanticSnapshotRef === undefined) continue;
    const semanticSnapshotRef = requireString(
      event.semanticSnapshotRef,
      `graph.events[${index}].semanticSnapshotRef`,
    );
    if (!refs.has(semanticSnapshotRef)) {
      throw new Error(
        `semanticSnapshotRef ${semanticSnapshotRef} is missing from frozenSemanticSnapshots`,
      );
    }
  }

  return {
    graph: graph as ConversationGraphReplayBundleV1["graph"],
    frozenSemanticSnapshots,
  };
};

export interface ConversationGraphExternalIngressDepsV1 {
  decisionOwnerRegistry: DecisionOwnerRegistryV1;
  ownedEvidenceStore: OwnedEvidenceStoreV1;
}

export interface ConversationGraphExternalIngressV1 {
  namespace: ConversationGraphNamespaceV1;
  suppressionReceipts: SuppressionReceiptV1[];
  escalationEvidenceRefs: EscalationEvidenceRefV1[];
}

export const parseConversationGraphExternalIngressV1 = (
  value: unknown,
  deps: ConversationGraphExternalIngressDepsV1,
): ConversationGraphExternalIngressV1 => {
  const input = requireRecord(value, "ConversationGraphExternalIngressV1");
  return {
    namespace: parseConversationGraphNamespaceV1(input.namespace),
    suppressionReceipts: requireArray(
      input.suppressionReceipts,
      "suppressionReceipts",
    ).map((receipt) =>
      parseSuppressionReceiptV1(receipt, deps.decisionOwnerRegistry),
    ),
    escalationEvidenceRefs: requireArray(
      input.escalationEvidenceRefs,
      "escalationEvidenceRefs",
    ).map((ref) =>
      parseEscalationEvidenceRefV1(ref, deps.ownedEvidenceStore),
    ),
  };
};
