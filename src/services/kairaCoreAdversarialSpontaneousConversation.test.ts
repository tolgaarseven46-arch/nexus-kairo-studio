import { describe, expect, it } from "vitest";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";

const socialRoutineMessages = [
  "naber",
  "nasılsın",
  "ne yapıyorsun",
  "naber kanka",
  "nasılsın kank",
  "ne yapıyorsun ya",
] as const;

const standaloneAcknowledgements = [
  "evet",
  "aynen",
  "tamam",
  "peki",
  "olur",
  "tamamdır",
] as const;

const emotionalOpenings = [
  "hiç havamda değilim",
  "modum yok bugün",
  "kafam bozuk",
  "canım sıkkın",
  "bugün pek iyi değilim",
  "biraz moralim bozuk",
] as const;

const casualStatements = [
  "bugün çok yoruldum",
  "yine bütün işi son dakikaya bıraktım",
  "kahveyi seviyorum",
  "ben öğrenciyim",
  "bugün hava baya sıcak",
  "az önce Mert'le konuştum",
] as const;

const contextualAckHistory = [
  { sender: "droit", text: "bunları bi dön, sonra istersen biraz daha karışık atarım sana" } as any,
];

function expectBoundedPlan(plan: ReturnType<typeof planDialogueResponse>) {
  expect(plan.reason.trim().length).toBeGreaterThan(0);
  expect(plan.maxSentences).toBeGreaterThanOrEqual(1);
  expect(plan.maxSentences).toBeLessThanOrEqual(3);
  expect(typeof plan.allowFollowUpQuestion).toBe("boolean");
  expect(typeof plan.allowSpeculation).toBe("boolean");
  expect(typeof plan.hasSupportedTargetClaim).toBe("boolean");
}

describe("Core adversarial spontaneous conversation probes", () => {
  it.each(socialRoutineMessages)("keeps direct social routine bounded and non-speculative: %s", (message) => {
    const plan = planDialogueResponse([], message, "Mert");
    expectBoundedPlan(plan);
    expect(plan.move).toBe("natural_reaction");
    expect(plan.allowFollowUpQuestion).toBe(true);
    expect(plan.allowSpeculation).toBe(false);
  });

  it.each(standaloneAcknowledgements)("does not invent a new topic from standalone acknowledgement: %s", (message) => {
    const plan = planDialogueResponse([{ sender: "droit", text: "bugün hava baya sıcak" } as any], message, "Mert");
    expectBoundedPlan(plan);
    expect(plan.move).toBe("complete_social_routine");
    expect(plan.allowFollowUpQuestion).toBe(false);
    expect(plan.allowSpeculation).toBe(false);
  });

  it.each(emotionalOpenings)("keeps emotional opening non-speculative and bounded: %s", (message) => {
    const plan = planDialogueResponse([], message, "Mert");
    expectBoundedPlan(plan);
    expect(plan.allowSpeculation).toBe(false);
    expect(plan.maxSentences).toBeLessThanOrEqual(2);
  });

  it.each(casualStatements)("keeps ordinary casual statement decision finite and non-speculative: %s", (message) => {
    const plan = planDialogueResponse([], message, "Mert");
    expectBoundedPlan(plan);
    expect(plan.allowSpeculation).toBe(false);
  });

  it.each(["tamam", "evet", "aynen", "olur", "peki", "tamamdır"])(
    "binds short acknowledgement to an immediate explicit Kaira offer: %s",
    (message) => {
      const plan = planDialogueResponse(contextualAckHistory, message, "Mert");
      expectBoundedPlan(plan);
      expect(plan.move).toBe("follow_previous_answer");
      expect(plan.allowFollowUpQuestion).toBe(false);
      expect(plan.allowSpeculation).toBe(false);
      expect(plan.maxSentences).toBe(1);
      expect(plan.maxWords).toBeLessThanOrEqual(8);
    },
  );
});
