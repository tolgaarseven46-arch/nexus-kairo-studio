import { describe, expect, it } from "vitest";
import {
  buildWorldEventMemoryInstruction,
  rankWorldEventObservations,
  shouldRetrieveWorldEvents,
} from "./worldEventRetrieval";
import type { WorldEventObservation } from "./worldModelEventStore";

const observation = (overrides: Partial<WorldEventObservation> = {}): WorldEventObservation => ({
  userId: "mert",
  sessionId: "s1",
  speakerName: "Mert",
  kind: "reported_claim",
  status: "grounded",
  createdAt: "2026-08-29T20:00:00.000Z",
  event: {
    raw: "Ayşe bana salak dedi",
    eventType: "insult",
    actor: { name: "Ayşe", source: "explicit_name", confidence: 0.95 },
    target: { name: "Mert", source: "first_person", confidence: 1 },
    reportedSpeech: true,
    certainty: 0.9,
    ambiguities: [],
    evidence: ["actor:Ayşe", "target:bana"],
  },
  ...overrides,
});

describe("world event retrieval", () => {
  it("only activates for recall-like queries", () => {
    expect(shouldRetrieveWorldEvents("Ayşe dün bana ne demişti?")).toBe(true);
    expect(shouldRetrieveWorldEvents("naber")).toBe(false);
  });

  it("ranks named relevant events above unrelated events", () => {
    const unrelated = observation({
      event: { ...observation().event, raw: "Ali bana destek oldu", actor: { name: "Ali", source: "explicit_name", confidence: 0.95 }, eventType: "support" },
    });
    const ranked = rankWorldEventObservations("Ayşe bana ne demişti?", [unrelated, observation()]);
    expect(ranked[0]?.observation.event.actor?.name).toBe("Ayşe");
  });

  it("preserves reported claim epistemics in prompt", () => {
    const text = buildWorldEventMemoryInstruction([{ observation: observation(), score: 8, reasons: ["name:ayşe"] }]);
    expect(text).toContain("KULLANICININ AKTARDIĞI İDDİA");
    expect(text).toContain("doğrulanmış dünya gerçeği gibi anlatma");
  });
});
