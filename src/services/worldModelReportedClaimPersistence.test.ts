import { describe, expect, it } from "vitest";
import { classifyWorldEventObservation } from "./worldModelEventStore";
import type { CanonicalWorldEvent } from "./worldEventEngine";

describe("Claim versus WorldEvent persistence boundary", () => {
  it("does not automatically persist raw reported speech as world truth", () => {
    const event: CanonicalWorldEvent = {
      raw: "Emre yarın işi bırakacakmış.",
      eventType: "general",
      reportedSpeech: true,
      certainty: 0.92,
      ambiguities: [],
      evidence: ["reported_by:Mert"],
      proposition: {
        key: "emre|general|?|leave_job",
        predicate: "general",
        actorKey: "emre",
        contentKey: "leave_job",
      },
      temporal: { relation: "future", asksLatest: false },
    };
    const result = classifyWorldEventObservation(event);
    expect(result.kind).toBe("reported_claim");
    expect(result.persist).toBe(false);
  });

  it("still allows grounded direct interactions to enter the world model", () => {
    const event: CanonicalWorldEvent = {
      raw: "Mert bana aptal dedi.",
      eventType: "insult",
      reportedSpeech: false,
      certainty: 0.9,
      ambiguities: [],
      evidence: ["direct"],
      actor: { name: "Mert", source: "explicit_name", confidence: 0.9 },
      target: { id: "kaira", name: "Kaira", source: "semantic_target", confidence: 0.98 },
    };
    expect(classifyWorldEventObservation(event).persist).toBe(true);
  });
});
