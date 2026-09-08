import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  addDoc: vi.fn(async () => ({ id: "obs_fixture" })),
  collection: vi.fn((...args: unknown[]) => ({ kind: "collection", args })),
  doc: vi.fn((...args: unknown[]) => ({ kind: "doc", args })),
  getDocs: vi.fn(async () => ({ docs: [] })),
  limit: vi.fn((value: number) => ({ limit: value })),
  orderBy: vi.fn((field: string, direction?: string) => ({ field, direction })),
  query: vi.fn((...args: unknown[]) => ({ kind: "query", args })),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "db" } }));

import { saveWorldEventObservation } from "./worldModelEventStore";

function eventFixture() {
  return {
    raw: "fixture direct interaction",
    eventType: "insult",
    actor: { id: "current_user", source: "first_person", confidence: 1 },
    target: { id: "current_kaira", source: "second_person", confidence: 1 },
    reportedSpeech: false,
    certainty: 1,
    ambiguities: [],
    evidence: ["fixture"],
    proposition: {
      key: "current_user|insult|current_kaira",
      predicate: "insult",
      actorKey: "current_user",
      targetKey: "current_kaira",
      contentKey: "insult",
    },
    polarity: "positive",
    temporal: { relation: "present", asksLatest: false },
  } as any;
}

async function persistedUserId(rawUserId: string): Promise<string> {
  const result = await saveWorldEventObservation({
    userId: rawUserId,
    kairaInstanceId: "kaira_reference_001",
    sessionId: `session_${rawUserId}`,
    event: eventFixture(),
  });
  expect(result).not.toBeNull();
  return result!.userId;
}

describe("world observation injective user identity historical proof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestore.addDoc.mockResolvedValue({ id: "obs_fixture" });
  });

  it("reported: slash and question-mark user ids do not collapse in persisted observation provenance", async () => {
    const slash = await persistedUserId("user/a");
    const question = await persistedUserId("user?a");
    expect(slash).not.toBe(question);
  });

  it("neighbor-1: email-like and plus-form user ids do not collapse in persisted observation provenance", async () => {
    const emailLike = await persistedUserId("tolga@example.com");
    const plusForm = await persistedUserId("tolga+example.com");
    expect(emailLike).not.toBe(plusForm);
  });

  it("neighbor-2: colon and slash user ids do not collapse in persisted observation provenance", async () => {
    const colon = await persistedUserId("room:alice");
    const slash = await persistedUserId("room/alice");
    expect(colon).not.toBe(slash);
  });

  it("counterexample: legacy-safe user ids remain byte-compatible", async () => {
    expect(await persistedUserId("alice_01")).toBe("alice_01");
  });
});
