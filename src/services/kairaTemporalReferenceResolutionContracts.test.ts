import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent } from "./worldEventEngine";
import { enrichWorldEventTemporalAtPersistence } from "./worldModelEventStore";
import { resolveTemporalReference, temporalIntervalContains } from "./temporalReferenceResolver";

const ANCHOR = "2026-08-30T02:21:00.000Z";

function canonical(message: string) {
  return buildCanonicalWorldEvent(
    message,
    interpretSemanticEvent(message),
    resolveMessageEntities(message, { userName: "Mert", characterName: "KAIRO" }),
  );
}

describe("Kaira temporal reference resolution contracts", () => {
  it("resolves yesterday/today/tomorrow into deterministic day intervals", () => {
    const yesterday = resolveTemporalReference("Ayşe dün bana salak dedi", canonical("Ayşe dün bana salak dedi").temporal, ANCHOR);
    const today = resolveTemporalReference("Ayşe bugün bana yazdı", canonical("Ayşe bugün bana yazdı").temporal, ANCHOR);
    const tomorrow = resolveTemporalReference("Ayşe yarın bana yazacak", canonical("Ayşe yarın bana yazacak").temporal, ANCHOR);

    expect(yesterday?.startAt).toBe("2026-08-29T00:00:00.000Z");
    expect(today?.startAt).toBe("2026-08-30T00:00:00.000Z");
    expect(tomorrow?.startAt).toBe("2026-08-31T00:00:00.000Z");
    expect(yesterday?.precision).toBe("day");
  });

  it("resolves previous week as the full prior Monday-Sunday UTC interval", () => {
    const interval = resolveTemporalReference("Ayşe geçen hafta bana yazdı", canonical("Ayşe geçen hafta bana yazdı").temporal, ANCHOR);
    expect(interval?.startAt).toBe("2026-08-17T00:00:00.000Z");
    expect(interval?.endAt).toBe("2026-08-23T23:59:59.999Z");
    expect(interval?.precision).toBe("week");
  });

  it("resolves explicit dd.mm.yyyy dates without locale guessing", () => {
    const interval = resolveTemporalReference("Ayşe 12.08.2026 bana yazdı", canonical("Ayşe 12.08.2026 bana yazdı").temporal, ANCHOR);
    expect(interval?.startAt).toBe("2026-08-12T00:00:00.000Z");
    expect(interval?.source).toBe("explicit_date");
    expect(temporalIntervalContains(interval!, "2026-08-12T12:30:00.000Z")).toBe(true);
    expect(temporalIntervalContains(interval!, "2026-08-13T00:00:00.000Z")).toBe(false);
  });

  it("does not invent a timestamp for vague before/after expressions", () => {
    expect(resolveTemporalReference("Ayşe daha önce bana yazdı", canonical("Ayşe daha önce bana yazdı").temporal, ANCHOR)).toBeUndefined();
    expect(resolveTemporalReference("Ayşe ondan sonra bana yazdı", canonical("Ayşe ondan sonra bana yazdı").temporal, ANCHOR)).toBeUndefined();
  });

  it("attaches resolved temporal data exactly at the persistence boundary", () => {
    const event = canonical("Ayşe dün bana salak dedi");
    expect(event.temporal?.resolved).toBeUndefined();
    const persisted = enrichWorldEventTemporalAtPersistence(event, ANCHOR);
    expect(persisted.temporal?.resolved?.anchorAt).toBe(ANCHOR);
    expect(persisted.temporal?.resolved?.startAt).toBe("2026-08-29T00:00:00.000Z");
    expect(event.temporal?.resolved).toBeUndefined();
  });

  it("fails closed for invalid anchor timestamps", () => {
    const event = canonical("Ayşe dün bana salak dedi");
    expect(resolveTemporalReference(event.raw, event.temporal, "not-a-date")).toBeUndefined();
  });
});
