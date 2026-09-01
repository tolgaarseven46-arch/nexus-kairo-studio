import { describe, expect, it } from "vitest";
import { enforceKairaAutobiographicalResponse } from "./kairaAutobiographicalResponseGuard";
import type { KairaAutobiographicalRecallRuntimeResult } from "./kairaAutobiographicalRecallRuntime";

const query = {
  surface: "senin geçmişindeki olay",
  scope: "autobiographical_memory" as const,
  confidence: 0.95,
};

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

  it("preserves a response when canonical evidence exists", () => {
    const runtime: KairaAutobiographicalRecallRuntimeResult = {
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
              eventType: "storm",
              facts: ["yağmura yakalandı"],
              emotions: [],
              salience: 0.7,
              sensitivity: "ordinary",
              canonical: true,
            },
          },
        ],
        withheldSensitiveCount: 0,
      },
      instruction: "grounded",
    };
    expect(enforceKairaAutobiographicalResponse("evet yağmura yakalanmıştım", runtime)).toEqual({
      reply: "evet yağmura yakalanmıştım",
      changed: false,
    });
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
