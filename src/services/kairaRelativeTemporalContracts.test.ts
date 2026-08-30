import { describe, expect, it } from "vitest";
import { detectWorldEventTemporalReference, type CanonicalWorldEvent } from "./worldEventEngine";
import { resolveTemporalReference } from "./temporalReferenceResolver";
import { validateWorldEventContract } from "./kairaArchitectureContracts";

const ANCHOR = "2026-08-30T02:00:00.000Z";

function baseEvent(raw: string): CanonicalWorldEvent {
  return {
    raw,
    eventType: "general",
    reportedSpeech: false,
    certainty: 0.9,
    ambiguities: [],
    evidence: [],
    proposition: { key: "current_user|general|?", predicate: "general", actorKey: "current_user" },
    polarity: "positive",
    temporal: detectWorldEventTemporalReference(raw),
  };
}

describe("Kaira relative temporal contracts", () => {
  it("resolves measurable hour offsets against observation time", () => {
    const temporal = detectWorldEventTemporalReference("Ayşe 3 saat önce aradı");
    expect(temporal.dependency).toMatchObject({
      anchor: "observation",
      direction: "before",
      offsetAmount: 3,
      offsetUnit: "hour",
    });
    const resolved = resolveTemporalReference("Ayşe 3 saat önce aradı", temporal, ANCHOR);
    expect(resolved?.startAt).toBe("2026-08-29T23:00:00.000Z");
    expect(resolved?.precision).toBe("hour");
    expect(resolved?.source).toBe("relative_offset");
  });

  it("resolves Turkish word day offsets against observation time", () => {
    const temporal = detectWorldEventTemporalReference("Ayşe iki gün sonra gelecek");
    expect(temporal.dependency).toMatchObject({
      anchor: "observation",
      direction: "after",
      offsetAmount: 2,
      offsetUnit: "day",
    });
    const resolved = resolveTemporalReference("Ayşe iki gün sonra gelecek", temporal, ANCHOR);
    expect(resolved?.startAt).toBe("2026-09-01T00:00:00.000Z");
    expect(resolved?.precision).toBe("day");
  });

  it("keeps previous-event relations unresolved without a reference event", () => {
    const temporal = detectWorldEventTemporalReference("Ertesi gün Ayşe özür diledi");
    expect(temporal.dependency).toMatchObject({
      anchor: "previous_event",
      direction: "after",
      offsetAmount: 1,
      offsetUnit: "day",
    });
    expect(resolveTemporalReference("Ertesi gün Ayşe özür diledi", temporal, ANCHOR)).toBeUndefined();
  });

  it("resolves ertesi gün only when the referenced event interval is supplied", () => {
    const temporal = detectWorldEventTemporalReference("Ertesi gün Ayşe özür diledi");
    const resolved = resolveTemporalReference(
      "Ertesi gün Ayşe özür diledi",
      temporal,
      ANCHOR,
      {
        startAt: "2026-08-20T00:00:00.000Z",
        endAt: "2026-08-20T23:59:59.999Z",
        precision: "day",
        anchorAt: "2026-08-20T12:00:00.000Z",
        source: "relative_marker",
      },
    );
    expect(resolved?.startAt).toBe("2026-08-21T00:00:00.000Z");
    expect(resolved?.source).toBe("referenced_event");
  });

  it("preserves unmeasured ondan sonra as a dependency instead of inventing an interval", () => {
    const temporal = detectWorldEventTemporalReference("Ondan sonra Ayşe gitti");
    expect(temporal.dependency).toEqual({
      anchor: "previous_event",
      direction: "after",
      marker: "ondan sonra",
    });
    expect(resolveTemporalReference("Ondan sonra Ayşe gitti", temporal, ANCHOR)).toBeUndefined();
  });

  it("accepts new canonical relative offset enums", () => {
    const raw = "Ayşe 3 saat önce aradı";
    const event = baseEvent(raw);
    const resolved = resolveTemporalReference(raw, event.temporal, ANCHOR);
    event.temporal = { ...event.temporal!, resolved };
    expect(validateWorldEventContract(raw, event).issues).toEqual([]);
  });

  it("rejects malformed temporal dependency pairs", () => {
    const raw = "Ondan sonra Ayşe gitti";
    const event = baseEvent(raw);
    event.temporal = {
      relation: "future",
      asksLatest: false,
      dependency: {
        anchor: "previous_event",
        direction: "after",
        offsetAmount: 2,
        marker: "ondan sonra",
      },
    };
    expect(validateWorldEventContract(raw, event).issues.map((issue) => issue.invariant))
      .toContain("world_event.v2_temporal_dependency");
  });
});
