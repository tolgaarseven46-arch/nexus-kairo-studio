import { describe, expect, it, vi } from "vitest";
import {
  buildConversationGraphV1,
  normalizeConversationEventsV1,
  replayConversationGraphV1,
  applyConversationGraphRetentionV1,
  validateActorKindFactV1,
  type BuildConversationGraphInputV1,
  type RawConversationGraphEventV1,
} from "./sliceBConversationGraphRuntime";
import {
  buildConversationGraphEvidenceViewV1,
  parseConversationGraphNamespaceV1,
  parseConversationGraphExternalIngressV1,
  validateConversationGraphReplayBundleV1,
} from "./sliceBConversationGraphIngressContracts";

const namespace = {
  environmentId: "test" as const,
  testRunId: "TR_slice_b_w5",
  serverId: "server-a",
  roomId: "room-a",
  kairaInstanceId: "kaira-a",
};

const participants = [
  { participantId: "A", actorKind: "human" as const, platformRoles: ["member"] as const },
  { participantId: "B", actorKind: "human" as const, platformRoles: ["member"] as const },
  { participantId: "C", actorKind: "human" as const, platformRoles: ["member"] as const },
  { participantId: "KAIRA", actorKind: "droit" as const, platformRoles: ["member"] as const },
];

const event = (
  eventId: string,
  actorId: string,
  occurredAt: number,
  extra: Record<string, unknown> = {},
): RawConversationGraphEventV1 => ({
  eventId,
  actorId,
  actorKind: actorId === "KAIRA" ? "droit" : "human",
  occurredAt,
  ...extra,
});

const baseBuildInput = (): BuildConversationGraphInputV1 => ({
  namespace,
  conversationId: "conversation-a",
  participants,
  events: [],
  inferredAddressCandidateEdges: [],
  suppressionReceipts: [],
  escalationEvidenceRefs: [],
  decisionOwnerRegistry: {
    version: "decision-owners@1",
    owners: {
      kaira_response_plan: "attest:kaira_response_plan:v1",
    },
  },
  ownedEvidenceStore: {
    "evidence:1": { ownerId: "social_appraisal", hash: "sha256:abc" },
  },
});

const json = (value: unknown) => JSON.stringify(value);

describe("Slice B W5 Conversation Graph characterization", () => {
  it("T-B01 explicit reply precedence", () => {
    const input = baseBuildInput();
    input.events = [
      event("e1", "A", 1),
      event("e2", "B", 2, { explicitReplyToEventId: "e1" }),
    ];
    input.inferredAddressCandidateEdges = [
      {
        fromEventId: "e2",
        toParticipantId: "C",
        confidence: 0.99,
        ruleId: "wrong-candidate",
        evidenceEventIds: ["e2"],
      },
    ];

    const graph = buildConversationGraphV1(input);
    expect(graph.explicitReplyEdges).toEqual([
      { fromEventId: "e2", toEventId: "e1", source: "platform" },
    ]);
    expect(graph.inferredAddressCandidateEdges[0]?.toParticipantId).toBe("C");
  });

  it("T-B02 multi-mention ambiguity", () => {
    const input = baseBuildInput();
    input.events = [
      event("e1", "A", 1, { explicitMentionedParticipantIds: ["B", "C"] }),
    ];
    const graph = buildConversationGraphV1(input);
    expect(graph.explicitMentionEdges).toEqual([
      { fromEventId: "e1", toParticipantId: "B", source: "platform" },
      { fromEventId: "e1", toParticipantId: "C", source: "platform" },
    ]);
    expect(graph).not.toHaveProperty("resolvedTargetParticipantId");
  });

  it("T-B03 missing parent stays unresolved", () => {
    const input = baseBuildInput();
    input.events = [
      event("e2", "B", 2, { explicitReplyToEventId: "missing-e1" }),
    ];
    const graph = buildConversationGraphV1(input);
    expect(graph.explicitReplyEdges).toEqual([]);
    expect(graph.unresolvedReferences).toContainEqual({
      sourceEventId: "e2",
      referenceType: "reply",
      referencedId: "missing-e1",
    });
    expect(graph.events.some((x: any) => x.eventId === "missing-e1")).toBe(false);
  });

  it("T-B04 identical duplicate is idempotent and conflicting duplicate fails closed", () => {
    const identical = [
      event("e1", "A", 1),
      event("e1", "A", 1),
    ];
    expect(normalizeConversationEventsV1(identical)).toHaveLength(1);

    const conflicting = [
      event("e1", "A", 1),
      event("e1", "B", 1),
    ];
    expect(() => normalizeConversationEventsV1(conflicting)).toThrow(
      /duplicate_event_conflict/i,
    );
  });

  it("T-B05 out-of-order delivery normalizes byte-equivalently", () => {
    const a = [
      event("e1", "A", 1),
      event("e2", "B", 2),
      event("e3", "C", 3),
    ];
    const b = [a[2], a[0], a[1]];
    expect(json(normalizeConversationEventsV1(a))).toBe(
      json(normalizeConversationEventsV1(b)),
    );
  });

  it("T-B06 sourceSequence orders equal timestamps", () => {
    const events = [
      event("e2", "A", 1, { sourceSequence: 2 }),
      event("e1", "A", 1, { sourceSequence: 1 }),
    ];
    expect(normalizeConversationEventsV1(events).map((x: any) => x.eventId)).toEqual([
      "e1",
      "e2",
    ]);
  });

  it("T-B07 eventId is deterministic final tie-break", () => {
    const events = [event("b", "A", 1), event("a", "A", 1)];
    expect(normalizeConversationEventsV1(events).map((x: any) => x.eventId)).toEqual([
      "a",
      "b",
    ]);
  });

  it("T-B08 cross-server zero leak", () => {
    const left = baseBuildInput();
    left.events = [event("e1", "A", 1)];
    const right = baseBuildInput();
    right.namespace = { ...namespace, serverId: "server-b" };
    right.events = [event("e1", "A", 1)];

    const graphA = buildConversationGraphV1(left);
    const graphB = buildConversationGraphV1(right);
    expect(graphA.namespace.serverId).not.toBe(graphB.namespace.serverId);
    expect(graphA.snapshotHash).not.toBe(graphB.snapshotHash);
  });

  it("T-B09 cross-room zero leak", () => {
    const left = baseBuildInput();
    left.events = [event("e1", "A", 1)];
    const right = baseBuildInput();
    right.namespace = { ...namespace, roomId: "room-b" };
    right.events = [event("e1", "A", 1)];

    const graphA = buildConversationGraphV1(left);
    const graphB = buildConversationGraphV1(right);
    expect(graphA.namespace.roomId).not.toBe(graphB.namespace.roomId);
    expect(graphA.snapshotHash).not.toBe(graphB.snapshotHash);
  });

  it("T-B10 cross-Kaira zero leak", () => {
    const left = baseBuildInput();
    left.events = [event("e1", "A", 1)];
    const right = baseBuildInput();
    right.namespace = { ...namespace, kairaInstanceId: "kaira-b" };
    right.events = [event("e1", "A", 1)];

    const graphA = buildConversationGraphV1(left);
    const graphB = buildConversationGraphV1(right);
    expect(graphA.namespace.kairaInstanceId).not.toBe(
      graphB.namespace.kairaInstanceId,
    );
    expect(graphA.snapshotHash).not.toBe(graphB.snapshotHash);
  });

  it("T-B11 frozen replay parity", () => {
    const input = baseBuildInput();
    input.events = [event("e1", "A", 1, { semanticSnapshotRef: "sem:1" })];
    const graph = buildConversationGraphV1(input);
    const bundle = {
      graph,
      frozenSemanticSnapshots: [
        {
          semanticSnapshotRef: "sem:1",
          snapshotHash: "sha256:sem1",
          canonicalSnapshot: { kind: "greeting" },
        },
      ],
    };
    expect(json(replayConversationGraphV1(bundle))).toBe(json(graph));
  });

  it("T-B12 replay performs zero live reads", () => {
    const input = baseBuildInput();
    input.events = [event("e1", "A", 1, { semanticSnapshotRef: "sem:1" })];
    const graph = buildConversationGraphV1(input);
    const livePlatformRead = vi.fn(() => {
      throw new Error("live platform read forbidden");
    });
    const liveSemanticRead = vi.fn(() => {
      throw new Error("live semantic read forbidden");
    });

    replayConversationGraphV1(
      {
        graph,
        frozenSemanticSnapshots: [
          {
            semanticSnapshotRef: "sem:1",
            snapshotHash: "sha256:sem1",
            canonicalSnapshot: { kind: "greeting" },
          },
        ],
      },
      { livePlatformRead, liveSemanticRead },
    );
    expect(livePlatformRead).not.toHaveBeenCalled();
    expect(liveSemanticRead).not.toHaveBeenCalled();
  });

  it("T-B13 R-scope exclusion", () => {
    const graph = buildConversationGraphV1(baseBuildInput());
    expect(graph).not.toHaveProperty("unansweredAddressedTurnEvidence");
    expect(graph).not.toHaveProperty("ignoredBy");
  });

  it("T-B14 suppression ownership authenticity", () => {
    const input = baseBuildInput();
    input.suppressionReceipts = [
      {
        decisionId: "d1",
        ownerId: "forged",
        ownerRegistryVersion: "decision-owners@1",
        ownerAttestationRef: "attest:forged",
        sourceEventId: "e1",
        reasonCode: "not_addressed",
        occurredAt: 1,
      },
    ];
    expect(() => buildConversationGraphV1(input)).toThrow(/owner/i);
  });

  it("T-B15 escalation reference authenticity", () => {
    const input = baseBuildInput();
    input.events = [event("e1", "A", 1)];
    input.escalationEvidenceRefs = [
      {
        eventId: "e1",
        evidenceOwnerId: "social_appraisal",
        evidenceRef: "evidence:1",
        evidenceHash: "sha256:wrong",
      },
    ];
    const graph = buildConversationGraphV1(input);
    expect(graph.escalationEvidenceRefs).toEqual([]);
    expect(graph.unresolvedReferences).toContainEqual({
      sourceEventId: "e1",
      referenceType: "escalation_evidence",
      referencedId: "evidence:1",
    });
  });

  it("T-B16 fixture lifecycle metadata is decision-neutral / graph-neutral", () => {
    const cold = { ...baseBuildInput(), fixtureMetadata: { lifecycleClass: "cold" } };
    const warm = { ...baseBuildInput(), fixtureMetadata: { lifecycleClass: "warm" } };
    const experienced = {
      ...baseBuildInput(),
      fixtureMetadata: { lifecycleClass: "experienced-owner" },
    };
    expect(json(buildConversationGraphV1(cold))).toBe(
      json(buildConversationGraphV1(warm)),
    );
    expect(json(buildConversationGraphV1(cold))).toBe(
      json(buildConversationGraphV1(experienced)),
    );
  });

  it("T-B17 participant fact purity", () => {
    const input = baseBuildInput();
    input.participants = [
      {
        participantId: "A",
        actorKind: "human",
        platformRoles: ["member"],
        trust: 0.9,
        personality: "extrovert",
        toxicity: 0.8,
      } as any,
    ];
    input.events = [event("e1", "A", 1)];
    const graph = buildConversationGraphV1(input);
    const participant = graph.participants[0] as any;
    expect(participant).toEqual({
      participantId: "A",
      actorKind: "human",
      platformRoles: ["member"],
      firstSeenAt: 1,
      lastSeenAt: 1,
      messageCount: 1,
    });
    expect(participant).not.toHaveProperty("trust");
    expect(participant).not.toHaveProperty("personality");
    expect(participant).not.toHaveProperty("toxicity");
  });

  it("T-B18 Droit self-event is observational only and non-recursive", () => {
    const input = baseBuildInput();
    input.events = [event("k1", "KAIRA", 1)];
    const graph = buildConversationGraphV1(input);
    expect(graph.events).toHaveLength(1);
    expect(graph.events[0]).toMatchObject({ eventId: "k1", actorKind: "droit" });
    expect(graph).not.toHaveProperty("triggerDecision");
    expect(graph).not.toHaveProperty("answerDecision");
    expect(graph).not.toHaveProperty("recursionSignal");
  });

  it("T-B19 missing semantic ref does not invent semantic truth", () => {
    const input = baseBuildInput();
    input.events = [
      event("e1", "A", 1, { rawText: "selam", semanticSnapshotRef: undefined }),
    ];
    const graph = buildConversationGraphV1(input);
    expect(graph.events[0]).not.toHaveProperty("semanticMeaning");
    expect(graph.events[0].semanticSnapshotRef).toBeUndefined();
  });

  it("T-B20 snapshot provenance is complete", () => {
    const input = baseBuildInput();
    input.events = [event("e1", "A", 1)];
    const graph = buildConversationGraphV1(input);
    expect(graph.schemaVersion).toBe(1);
    expect(graph.derivationVersion).toEqual(expect.any(String));
    expect(graph.namespace).toEqual(namespace);
    expect(graph.builtFromEventIds).toEqual(["e1"]);
    expect(graph.snapshotHash).toEqual(expect.any(String));
  });

  it("T-B21 raw graph is not the downstream evidence view", () => {
    const input = baseBuildInput();
    input.events = [event("e1", "A", 1)];
    input.inferredAddressCandidateEdges = [
      {
        fromEventId: "e1",
        toParticipantId: "B",
        confidence: 0.8,
        ruleId: "r1",
        evidenceEventIds: ["e1"],
      },
    ];
    const graph = buildConversationGraphV1(input);
    const view = buildConversationGraphEvidenceViewV1(graph);
    expect(view).not.toHaveProperty("inferredAddressCandidateEdges");
    expect(view).not.toHaveProperty("suppressionReceipts");
    expect(view).not.toHaveProperty("escalationEvidenceRefs");
  });

  it("T-B22 test namespace requires testRunId at runtime", () => {
    expect(() =>
      parseConversationGraphNamespaceV1({
        environmentId: "test",
        serverId: "s",
        roomId: "r",
        kairaInstanceId: "k",
      }),
    ).toThrow(/testRunId/i);
  });

  it("T-B23 invalid escalation ref stays unresolved", () => {
    const input = baseBuildInput();
    input.events = [event("e1", "A", 1)];
    input.escalationEvidenceRefs = [
      {
        eventId: "e1",
        evidenceOwnerId: "social_appraisal",
        evidenceRef: "missing",
        evidenceHash: "sha256:none",
      },
    ];
    const graph = buildConversationGraphV1(input);
    expect(graph.escalationEvidenceRefs).toEqual([]);
    expect(graph.unresolvedReferences).toContainEqual({
      sourceEventId: "e1",
      referenceType: "escalation_evidence",
      referencedId: "missing",
    });
  });

  it("T-B24 eventId final ordering is locale-independent", () => {
    const events = [
      event("z", "A", 1),
      event("ä", "A", 1),
      event("a", "A", 1),
    ];
    const normalized = normalizeConversationEventsV1(events).map(
      (x: any) => x.eventId,
    );
    expect(normalized).toEqual([...normalized].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it("T-B25 actorKind platform-fact integrity", () => {
    expect(() =>
      validateActorKindFactV1(
        { actorId: "KAIRA", actorKind: "human" },
        { KAIRA: "droit" },
      ),
    ).toThrow(/actorKind/i);
    expect(
      validateActorKindFactV1(
        { actorId: "KAIRA", actorKind: "droit" },
        { KAIRA: "droit" },
      ),
    ).toBe(true);
  });

  it("T-B26 participant retention is bounded by retained source evidence", () => {
    const input = baseBuildInput();
    input.events = [event("e1", "A", 1), event("e2", "A", 2)];
    const graph = buildConversationGraphV1(input);
    const retained = applyConversationGraphRetentionV1(graph, ["e2"]);
    expect(retained.builtFromEventIds).toEqual(["e2"]);
    expect(retained.participants[0]).toMatchObject({
      participantId: "A",
      firstSeenAt: 2,
      lastSeenAt: 2,
      messageCount: 1,
    });
  });

  it("T-B27 malformed raw ingress fails before typed graph values exist", () => {
    expect(() =>
      parseConversationGraphExternalIngressV1(
        {
          namespace: {
            environmentId: "test",
            serverId: "s1",
            roomId: "r1",
            kairaInstanceId: "k1",
          },
          suppressionReceipts: [],
          escalationEvidenceRefs: [],
        },
        {
          decisionOwnerRegistry: {
            version: "decision-owners@1",
            owners: {},
          },
          ownedEvidenceStore: {},
        },
      ),
    ).toThrow(/testRunId/i);
  });

  it("T-B28 evidence view redacts top-level and nested non-whitelisted facts", () => {
    const view = buildConversationGraphEvidenceViewV1({
      schemaVersion: 1,
      namespace,
      conversationId: "c1",
      participants: [
        {
          participantId: "A",
          actorKind: "human",
          platformRoles: ["member"],
          firstSeenAt: 1,
          lastSeenAt: 1,
          messageCount: 1,
          trust: 0.99,
        },
      ],
      events: [
        {
          eventId: "e1",
          actorId: "A",
          actorKind: "human",
          occurredAt: 1,
          rawText: "private raw text",
        },
      ],
      explicitReplyEdges: [],
      explicitMentionEdges: [],
      inferredAddressCandidateEdges: [{ secret: true }],
      unresolvedReferences: [],
      suppressionReceipts: [{ secret: true }],
      escalationEvidenceRefs: [{ secret: true }],
      builtFromEventIds: ["e1"],
      snapshotHash: "sha256:x",
    } as any) as any;

    expect(view).not.toHaveProperty("inferredAddressCandidateEdges");
    expect(view).not.toHaveProperty("suppressionReceipts");
    expect(view).not.toHaveProperty("escalationEvidenceRefs");
    expect(view.participants[0]).not.toHaveProperty("trust");
    expect(view.events[0]).not.toHaveProperty("rawText");
  });

  it("T-B29 replay missing semantic snapshot fails closed", () => {
    expect(() =>
      validateConversationGraphReplayBundleV1({
        graph: {
          events: [{ semanticSnapshotRef: "sem:missing" }],
        },
        frozenSemanticSnapshots: [],
      }),
    ).toThrow(/semanticSnapshotRef/i);
  });
});
