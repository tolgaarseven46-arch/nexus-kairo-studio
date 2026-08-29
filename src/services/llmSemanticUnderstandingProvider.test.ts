import { describe, expect, it, vi } from "vitest";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";

describe("llm semantic understanding provider", () => {
  it("forces original raw text and accepts structured semantic JSON", async () => {
    const generate = vi.fn(async (_input: {
      system: string;
      prompt: string;
      temperature: number;
    }) =>
      JSON.stringify({
        raw: "model bunu değiştirmeye çalıştı",
        normalized: "kaira sen salaksın",
        intent: "insult",
        valence: "negative",
        target: "kaira",
        relationalAct: "none",
        relationalIntensity: 0,
        severity: 0.85,
        insult: true,
        redLine: false,
        disrespect: 0.9,
        coercion: 0,
        manipulation: 0,
        privacyViolation: 0,
        apology: false,
        repairAttempt: false,
        stopQuestions: false,
        stopTalking: false,
        frustration: 0.3,
        emotionalLoad: 0,
        affection: 0,
        support: 0,
        compliment: 0,
      }),
    );

    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const event = await provider.interpret({
      message: "Kaira sen salaksın",
      morphology: {
        provider: "zemberek",
        normalizedText: "kaira sen salaksın",
        tokens: [
          { surface: "salaksın", lemma: "salak", morphemes: ["A3sg", "Pnon", "Nom"] },
        ],
      },
      context: { characterName: "Kaira", userName: "Ali" },
    });

    expect(event.raw).toBe("Kaira sen salaksın");
    expect(event.intent).toBe("insult");
    expect(event.target).toBe("kaira");
    expect(event.insult).toBe(true);
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]![0].prompt).toContain("lemma=salak");
  });

  it("extracts JSON even if a provider wraps it in extra text", async () => {
    const generate = vi.fn(async (_input: {
      system: string;
      prompt: string;
      temperature: number;
    }) =>
      `sonuç: {"raw":"x","normalized":"mal aldım","intent":"general_chat","valence":"neutral","target":"unknown","relationalAct":"none","relationalIntensity":0,"severity":0,"insult":false,"redLine":false,"disrespect":0,"coercion":0,"manipulation":0,"privacyViolation":0,"apology":false,"repairAttempt":false,"stopQuestions":false,"stopTalking":false,"frustration":0,"emotionalLoad":0,"affection":0,"support":0,"compliment":0}`,
    );

    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const event = await provider.interpret({ message: "mal aldım" });

    expect(event.intent).toBe("general_chat");
    expect(event.insult).toBe(false);
  });
});
