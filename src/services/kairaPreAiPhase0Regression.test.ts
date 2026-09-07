import { describe, expect, it } from "vitest";
import matrix from "../../config/kairaPreAiPhase0Scenarios.json";

describe("Kaira Phase 0 scenario regression controls", () => {
  it("locks the positive-grounding control against over-cautious future fixes", () => {
    const a5 = matrix.scenarios.find((item) => item.scenarioId === "A5");
    expect(a5).toBeTruthy();
    expect(a5?.messages).toContain("bugün selamiyle buluşacam");
    expect(a5?.messages).toContain("bugün kiminle buluşacaktım ben");
    expect(a5?.messages).toContain("söylemediysem uydurma he");
    expect(a5?.failureClasses).toContain("grounded_fact_false_negative");
  });

  it("locks the first-person fact-revision control separately from third-party correction", () => {
    const b3 = matrix.scenarios.find((item) => item.scenarioId === "B3");
    expect(b3).toBeTruthy();
    expect(b3?.messages).toContain("ben aslında mühendis değilim, öğretmenim");
    expect(b3?.messages).toContain("mühendis diye kaydetme");
    expect(b3?.messages).toContain("benim mesleğim neydi");
    expect(b3?.failureClasses).toContain("self_fact_revision_miss");
  });
});
