import { describe, expect, it } from "vitest";
import { enforceKairaAutobiographicalResponse } from "./kairaAutobiographicalResponseGuard";
import type { KairaAutobiographicalRecallRuntimeResult } from "./kairaAutobiographicalRecallRuntime";

const query = {
  surface: "senin geçmişindeki olay",
  scope: "autobiographical_memory" as const,
  confidence: 0.95,
};

const resolvedMemory = (): KairaAutobiographicalRecallRuntimeResult => ({
  status: "resolved",
  recall: {
    query,
    selfFacts: [],
    memories: [
      {
        score: 0.8,
        reasons: ["fact_overlap"],
        memory: {
          id: "mem_1",
          origin: "lived",
          participantIds: [],
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
          salience: 0.7,
          sensitivity: "ordinary",
          canonical: true,
        },
      },
    ],
    withheldSensitiveCount: 0,
  },
  instruction: "grounded",
});

const resolvedFlowerFact = (): KairaAutobiographicalRecallRuntimeResult => ({
  status: "resolved",
  recall: {
    query: {
      surface: "senin en sevdiğin çiçek ne",
      scope: "self_fact",
      factKey: "favorite_flower",
      confidence: 0.95,
    },
    selfFacts: [
      {
        score: 1,
        reasons: ["canonical_fact_key_match"],
        fact: {
          id: "sf_flower",
          domain: "preference",
          key: "favorite_flower",
          value: "krizantem",
          canonical: true,
          confidence: 1,
          source: "identity_seed",
        },
      },
    ],
    memories: [],
    withheldSensitiveCount: 0,
  },
  instruction: "grounded",
});

describe("Kaira autobiographical response guard", () => {
  it("does nothing when self-memory was not requested", () => {
    expect(
      enforceKairaAutobiographicalResponse("normal cevap", {
        status: "not_requested",
        recall: null,
        instruction: "",
      }),
    ).toEqual({ reply: "normal cevap", changed: false });
  });

  it("preserves a response when it carries a canonical autobiographical anchor", () => {
    expect(
      enforceKairaAutobiographicalResponse(
        "evet yağmura yakalanmıştım",
        resolvedMemory(),
      ),
    ).toEqual({
      reply: "evet yağmura yakalanmıştım",
      changed: false,
    });
  });

  it("rejects a resolved autobiographical reply with no canonical evidence anchor", () => {
    const guarded = enforceKairaAutobiographicalResponse(
      "Paris'te çocukken kaybolmuştum.",
      resolvedMemory(),
    );
    expect(guarded).toEqual({
      reply:
        "Buna dair net kaydım şu: şiddetli yağmura yakalandılar; bir sığınak buldular; olayı sonradan komik hatırlıyor.",
      changed: true,
      reason: "self_memory_resolved_memory_anchor_missing",
    });
  });

  it("preserves a resolved self-fact reply that states the canonical value", () => {
    expect(
      enforceKairaAutobiographicalResponse(
        "En sevdiğim çiçek krizantem.",
        resolvedFlowerFact(),
      ),
    ).toEqual({
      reply: "En sevdiğim çiçek krizantem.",
      changed: false,
    });
  });

  it("replaces a resolved self-fact reply that contradicts the canonical value", () => {
    const guarded = enforceKairaAutobiographicalResponse(
      "En sevdiğim çiçek güldür.",
      resolvedFlowerFact(),
    );
    expect(guarded).toEqual({
      reply: "Buna dair net kaydım: krizantem.",
      changed: true,
      reason: "self_memory_resolved_fact_conformance",
    });
  });

  it("does not accept mentioning the canonical value only to negate it", () => {
    const guarded = enforceKairaAutobiographicalResponse(
      "Krizantem değil, gül.",
      resolvedFlowerFact(),
    );
    expect(guarded.reply).toBe("Buna dair net kaydım: krizantem.");
    expect(guarded.changed).toBe(true);
    expect(guarded.reason).toBe("self_memory_resolved_fact_conformance");
  });

  it("replaces model-prior autobiography when no canonical record matched", () => {
    const runtime: KairaAutobiographicalRecallRuntimeResult = {
      status: "resolved",
      recall: {
        query,
        selfFacts: [],
        memories: [],
        withheldSensitiveCount: 0,
      },
      instruction: "MATCHED_RECORDS=none",
    };
    const guarded = enforceKairaAutobiographicalResponse(
      "Mars'ta çocukken bir koloniye gitmiştim.",
      runtime,
    );
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toBe("Buna dair net bir anım yok.");
  });

  it("fails closed when persistence is unavailable", () => {
    const guarded = enforceKairaAutobiographicalResponse("En sevdiğim çiçek güldür.", {
      status: "unavailable",
      recall: null,
      instruction: "store unavailable",
    });
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toContain("uydurmak istemem");
  });

  it("does not invent a persistent past for Welcome Kaira", () => {
    const guarded = enforceKairaAutobiographicalResponse("Eskiden şöyle yaşamıştım...", {
      status: "ephemeral",
      recall: null,
      instruction: "ephemeral",
    });
    expect(guarded.reply).toBe("Buna dair kalıcı bir anı kaydım yok.");
  });
});
