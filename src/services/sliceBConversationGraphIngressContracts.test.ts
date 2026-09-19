import { describe, expect, it } from "vitest";
import {
  buildConversationGraphEvidenceViewV1,
  parseConversationGraphNamespaceV1,
  parseEscalationEvidenceRefV1,
  parseSuppressionReceiptV1,
  validateConversationGraphReplayBundleV1,
} from "./sliceBConversationGraphIngressContracts";

const ownerRegistry = {
  version: "decision-owners@1",
  owners: {
    kaira_response_plan: "attest:kaira_response_plan:v1",
  },
} as const;

const evidenceStore = {
  "ev:1": { ownerId: "social_appraisal", hash: "sha256:abc" },
} as const;

describe("Slice B Conversation Graph external ingestion runtime guards", () => {
  it("RED B-W2-R01: rejects raw test namespace without testRunId at runtime", () => {
    expect(() =>
      parseConversationGraphNamespaceV1({
        environmentId: "test",
        serverId: "s1",
        roomId: "r1",
        kairaInstanceId: "k1",
      }),
    ).toThrow(/testRunId/i);
  });

  it("RED B-W2-R01: accepts raw test namespace only with testRunId", () => {
    expect(
      parseConversationGraphNamespaceV1({
        environmentId: "test",
        testRunId: "TR_1",
        serverId: "s1",
        roomId: "r1",
        kairaInstanceId: "k1",
      }),
    ).toMatchObject({ environmentId: "test", testRunId: "TR_1" });
  });

  it("RED B-W2-R01: rejects structurally valid but unregistered suppression owner", () => {
    expect(() =>
      parseSuppressionReceiptV1(
        {
          decisionId: "d1",
          ownerId: "forged_owner",
          ownerRegistryVersion: "decision-owners@1",
          ownerAttestationRef: "attest:forged",
          sourceEventId: "e1",
          reasonCode: "not_addressed",
          occurredAt: 1,
        },
        ownerRegistry,
      ),
    ).toThrow(/owner/i);
  });

  it("RED B-W2-R01: rejects escalation ref when owned evidence hash mismatches", () => {
    expect(() =>
      parseEscalationEvidenceRefV1(
        {
          eventId: "e1",
          evidenceOwnerId: "social_appraisal",
          evidenceRef: "ev:1",
          evidenceHash: "sha256:wrong",
        },
        evidenceStore,
      ),
    ).toThrow(/hash/i);
  });

  it("NB-W2-04: constructs a real runtime-redacted evidence view", () => {
    const view = buildConversationGraphEvidenceViewV1({
      schemaVersion: 1,
      namespace: {
        environmentId: "test",
        testRunId: "TR_1",
        serverId: "s1",
        roomId: "r1",
        kairaInstanceId: "k1",
      },
      conversationId: "c1",
      participants: [],
      events: [],
      explicitReplyEdges: [],
      explicitMentionEdges: [],
      inferredAddressCandidateEdges: [{ secret: true }],
      unresolvedReferences: [],
      suppressionReceipts: [{ secret: true }],
      escalationEvidenceRefs: [{ secret: true }],
      builtFromEventIds: [],
      snapshotHash: "sha256:g",
    } as any);

    expect(view).not.toHaveProperty("inferredAddressCandidateEdges");
    expect(view).not.toHaveProperty("suppressionReceipts");
    expect(view).not.toHaveProperty("escalationEvidenceRefs");
  });

  it("NB-W2-06: replay bundle fails closed when a semanticSnapshotRef is missing", () => {
    expect(() =>
      validateConversationGraphReplayBundleV1({
        graph: {
          events: [{ semanticSnapshotRef: "sem:missing" }],
        },
        frozenSemanticSnapshots: [],
      } as any),
    ).toThrow(/semanticSnapshotRef/i);
  });
});
