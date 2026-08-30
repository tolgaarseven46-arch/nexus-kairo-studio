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
    expect(shouldRetrieveWorldEvents("Ayşe mi Merve mi bana salak demişti?")).toBe(true);
    expect(shouldRetrieveWorldEvents("naber")).toBe(false);
  });

  it("ranks named relevant events above unrelated events", () => {
    const unrelated = observation({
      event: { ...observation().event, raw: "Ali bana destek oldu", actor: { name: "Ali", source: "explicit_name", confidence: 0.95 }, eventType: "support" },
    });
    const ranked = rankWorldEventObservations("Ayşe bana ne demişti?", [unrelated, observation()]);
    expect(ranked[0]?.observation.event.actor?.name).toBe("Ayşe");
  });

  it("keeps a named reported claim above old grounded direct interactions", () => {
    const oldMatchEvent = observation({
      sessionId: "old-session",
      kind: "direct_interaction",
      status: "grounded",
      event: {
        raw: "ya boşver maç var",
        eventType: "rejection",
        actor: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
        target: { id: "kaira", name: "KAIRO", source: "semantic_target", confidence: 0.98 },
        reportedSpeech: false,
        certainty: 0.96,
        ambiguities: [],
        evidence: ["actor:current_speaker", "target:kaira"],
      },
    });

    const ranked = rankWorldEventObservations(
      "Ayşe bana ne demişti?",
      [oldMatchEvent, observation()],
    );

    expect(ranked[0]?.observation.kind).toBe("reported_claim");
    expect(ranked[0]?.observation.event.actor?.name).toBe("Ayşe");
    expect(ranked[0]?.reasons).toContain("name:ayşe");
  });

  it("filters legacy recall questions that were accidentally stored as world events", () => {
    const pollutedQuestion = observation({
      createdAt: "2026-08-29T22:00:00.000Z",
      event: {
        ...observation().event,
        raw: "Ayşe bana ne demişti?",
        eventType: "general",
      },
    });
    const actualEvent = observation({
      createdAt: "2026-08-29T21:00:00.000Z",
      event: {
        ...observation().event,
        raw: "Ayşe bana yine salak dedi",
      },
    });

    const ranked = rankWorldEventObservations(
      "Ayşe en son bana ne demişti?",
      [pollutedQuestion, actualEvent],
    );

    expect(ranked[0]?.observation.event.raw).toBe("Ayşe bana yine salak dedi");
    expect(ranked.some((item) => item.observation.event.raw.endsWith("?"))).toBe(false);
  });

  it("prefers the newest event when the same person has multiple equally relevant claims", () => {
    const older = observation({ createdAt: "2026-08-29T20:00:00.000Z" });
    const newer = observation({
      createdAt: "2026-08-29T21:00:00.000Z",
      event: { ...observation().event, raw: "Ayşe bana özür dilerim dedi", eventType: "apology" },
    });

    const ranked = rankWorldEventObservations("Ayşe bana ne demişti?", [older, newer]);
    expect(ranked[0]?.observation.event.raw).toBe("Ayşe bana özür dilerim dedi");
  });

  it("retrieves two explicitly named people without unrelated noise", () => {
    const ayse = observation();
    const merve = observation({
      event: { ...observation().event, raw: "Merve bana aptal dedi", actor: { name: "Merve", source: "explicit_name", confidence: 0.95 } },
    });
    const ali = observation({
      event: { ...observation().event, raw: "Ali bana destek oldu", actor: { name: "Ali", source: "explicit_name", confidence: 0.95 }, eventType: "support" },
    });

    const ranked = rankWorldEventObservations("Ayşe mi Merve mi bana bir şey demişti?", [ali, merve, ayse]);
    const names = ranked.map((item) => item.observation.event.actor?.name);
    expect(names).toContain("Ayşe");
    expect(names).toContain("Merve");
    expect(names).not.toContain("Ali");
  });

  it("keeps conflicting claims separate and orders the newest first", () => {
    const older = observation({
      createdAt: "2026-08-29T20:00:00.000Z",
      event: { ...observation().event, raw: "Ayşe bana salak dedi", eventType: "insult" },
    });
    const newer = observation({
      createdAt: "2026-08-29T21:00:00.000Z",
      event: { ...observation().event, raw: "Ayşe bana salak demediğini söyledi", eventType: "general" },
    });

    const ranked = rankWorldEventObservations("Ayşe bana ne demişti?", [older, newer]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.observation.event.raw).toBe("Ayşe bana salak demediğini söyledi");
    expect(ranked[1]?.observation.event.raw).toBe("Ayşe bana salak dedi");
  });

  it("preserves reported claim epistemics and contradiction policy in prompt", () => {
    const text = buildWorldEventMemoryInstruction([{ observation: observation(), score: 8, reasons: ["name:ayşe"] }]);
    expect(text).toContain("KULLANICININ AKTARDIĞI İDDİA");
    expect(text).toContain("doğrulanmış dünya gerçeği gibi anlatma");
    expect(text).toContain("çelişen kayıtlar");
  });
});
