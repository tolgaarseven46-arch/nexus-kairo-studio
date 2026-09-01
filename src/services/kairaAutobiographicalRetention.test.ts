import { describe, expect, it } from "vitest";
import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import {
  retainKairaAutobiographicalMemories,
} from "./kairaAutobiographicalRetention";

const lived = (
  id: string,
  salience: number,
  occurredAt: string,
): KairaAutobiographicalMemory => ({
  id,
  origin: "lived",
  occurredAt,
  participantIds: [],
  eventType: "general",
  facts: [id],
  emotions: [],
  salience,
  sensitivity: "ordinary",
  canonical: true,
  sourceWorldObservationIds: [`obs_${id}`],
  consolidationKey: `world:obs_${id}`,
});

const inherited = (id: string): KairaAutobiographicalMemory => ({
  id,
  origin: "inherited",
  participantIds: [],
  eventType: "seed",
  facts: [id],
  emotions: [],
  salience: 0.2,
  sensitivity: "ordinary",
  canonical: true,
});

describe("Kaira autobiographical retention", () => {
  it("never evicts inherited canonical memories", () => {
    const memories = [
      inherited("seed_a"),
      inherited("seed_b"),
      ...Array.from({ length: 8 }, (_, index) =>
        lived(
          `lived_${index}`,
          0.6 + index * 0.01,
          new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        ),
      ),
    ];

    const retained = retainKairaAutobiographicalMemories(memories, 4, 1);
    expect(retained.filter((memory) => memory.origin === "inherited").map((memory) => memory.id))
      .toEqual(["seed_a", "seed_b"]);
    expect(retained.filter((memory) => memory.origin === "lived")).toHaveLength(4);
  });

  it("protects recent continuity without blind FIFO forgetting", () => {
    const memories = [
      lived("old_important", 0.99, "2026-01-01T00:00:00.000Z"),
      lived("old_ordinary", 0.56, "2026-01-02T00:00:00.000Z"),
      lived("mid_important", 0.95, "2026-01-03T00:00:00.000Z"),
      lived("recent_low", 0.55, "2026-01-04T00:00:00.000Z"),
      lived("newest_low", 0.55, "2026-01-05T00:00:00.000Z"),
    ];

    const retained = retainKairaAutobiographicalMemories(memories, 3, 1);
    const ids = retained.map((memory) => memory.id);

    expect(ids).toContain("newest_low");
    expect(ids).toContain("old_important");
    expect(ids).toContain("mid_important");
    expect(ids).not.toContain("old_ordinary");
    expect(ids).not.toContain("recent_low");
  });

  it("does not alter identity order when no pruning is needed", () => {
    const memories = [
      inherited("seed"),
      lived("a", 0.7, "2026-01-01T00:00:00.000Z"),
      lived("b", 0.8, "2026-01-02T00:00:00.000Z"),
    ];
    expect(retainKairaAutobiographicalMemories(memories, 4, 1).map((memory) => memory.id))
      .toEqual(["seed", "a", "b"]);
  });
});
