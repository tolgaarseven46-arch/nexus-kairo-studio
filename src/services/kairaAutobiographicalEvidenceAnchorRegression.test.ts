import { describe, expect, it } from "vitest";
import { enforceKairaAutobiographicalResponse } from "./kairaAutobiographicalResponseGuard";
import type { KairaAutobiographicalRecallRuntimeResult } from "./kairaAutobiographicalRecallRuntime";

const runtime: KairaAutobiographicalRecallRuntimeResult = {
  status: "resolved",
  recall: {
    query: {
      surface: "geçmişinde yaşadığın o olayı hatırlıyor musun",
      scope: "autobiographical_memory",
      retrievalMode: "targeted",
      confidence: 0.95,
    },
    selfFacts: [],
    memories: [
      {
        score: 0.92,
        reasons: ["fact_overlap"],
        memory: {
          id: "mem_fixture_storm",
          origin: "inherited",
          lifeStage: "erken dönem",
          participantIds: ["fixture_friend_01"],
          eventType: "storm_shelter",
          facts: [
            "şiddetli yağmura yakalandılar",
            "bir sığınak buldular",
            "olayı sonradan komik hatırlıyor",
          ],
          emotions: [
            { label: "kaygı", intensity: 0.55 },
            { label: "eğlence", intensity: 0.7 },
          ],
          salience: 0.72,
          sensitivity: "ordinary",
          canonical: true,
        },
      },
    ],
    withheldSensitiveCount: 0,
  },
  instruction: "grounded",
};

describe("autobiographical canonical evidence anchor regression", () => {
  it("does not let a wholly unrelated invented memory replace a resolved canonical memory", () => {
    const guarded = enforceKairaAutobiographicalResponse(
      "Ali'yle Paris'te çocukken kaybolmuştum.",
      runtime,
    );

    expect(guarded.changed).toBe(true);
    expect(guarded.reason).toBe("self_memory_resolved_memory_anchor_missing");
    expect(guarded.reply).toContain("şiddetli yağmura yakalandılar");
    expect(guarded.reply).toContain("bir sığınak buldular");
    expect(guarded.reply).not.toMatch(/Paris|Ali/i);
  });

  it("keeps natural realization when it is anchored in the resolved memory", () => {
    expect(
      enforceKairaAutobiographicalResponse(
        "Şiddetli yağmura yakalanmıştık, sonra sığınak bulmuştuk.",
        runtime,
      ),
    ).toEqual({
      reply: "Şiddetli yağmura yakalanmıştık, sonra sığınak bulmuştuk.",
      changed: false,
    });
  });
});
