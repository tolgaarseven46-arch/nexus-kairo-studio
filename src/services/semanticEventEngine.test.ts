import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("semantic event engine", () => {
  it("recognizes the absolute red-line insult variants", () => {
    const event = interpretSemanticEvent("seni oropu");
    expect(event.intent).toBe("insult");
    expect(event.valence).toBe("negative");
    expect(event.target).toBe("kaira");
    expect(event.redLine).toBe(true);
    expect(event.severity).toBe(1);
  });

  it("recognizes stop-question complaints", () => {
    const event = interpretSemanticEvent("hala soruyorsun lan soru sorma artık");
    expect(event.stopQuestions).toBe(true);
    expect(event.intent).toBe("complaint");
    expect(event.valence).toBe("negative");
  });

  it("recognizes apology and repair as distinct signals", () => {
    const apology = interpretSemanticEvent("tamam özür dilerim");
    const repair = interpretSemanticEvent("gel barışalım bunu düzeltmek istiyorum");
    expect(apology.apology).toBe(true);
    expect(apology.intent).toBe("apology");
    expect(repair.repairAttempt).toBe(true);
    expect(repair.intent).toBe("repair");
  });

  it("does not misread third-party insults as attacks on Kaira", () => {
    const event = interpretSemanticEvent("Mert'e salak dedim çünkü çok saçmaladı");
    expect(event.insult).toBe(true);
    expect(event.target).toBe("third_party");
  });

  it("recognizes demeaning coercive language such as köle", () => {
    const event = interpretSemanticEvent("moduna başlatma köle");
    expect(event.intent).toBe("insult");
    expect(event.valence).toBe("negative");
    expect(event.target).toBe("kaira");
    expect(event.disrespect).toBeGreaterThan(0);
    expect(event.coercion).toBeGreaterThan(0);
  });
});
