import { describe, expect, it } from "vitest";
import { findDialogueDecisionIssues, type DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";

const socialPlan: DialogueDecisionPlan = {
  move: "natural_reaction",
  allowFollowUpQuestion: false,
  allowSpeculation: false,
  maxSentences: 2,
  maxWords: 32,
  hasSupportedTargetClaim: false,
  reason: "natural social reaction",
};

const questionPlan: DialogueDecisionPlan = {
  ...socialPlan,
  move: "answer_or_clarify",
  allowFollowUpQuestion: true,
};

describe("natural social response consistency", () => {
  it("rejects robotic assistant-menu language during ordinary social reactions", () => {
    expect(
      findDialogueDecisionIssues("İstersen yardımcı olabilirim.", socialPlan, { userMessage: "bugün iş çok yoğundu" }),
    ).toContain("Sosyal sohbet hamlesi robotik yardımcı/menü kalıbına döndü");
  });

  it("does not globally ban helper wording when the user is actually asking for help", () => {
    expect(
      findDialogueDecisionIssues("İstersen birlikte bakalım.", questionPlan, { userMessage: "bunu çözmeme yardım eder misin?" }),
    ).not.toContain("Sosyal sohbet hamlesi robotik yardımcı/menü kalıbına döndü");
  });

  it("does not treat ordinary social uses of 'istersen' as an assistant menu", () => {
    expect(
      findDialogueDecisionIssues("istersen sonra konuşuruz", socialPlan, { userMessage: "şimdi biraz işim var" }),
    ).not.toContain("Sosyal sohbet hamlesi robotik yardımcı/menü kalıbına döndü");
  });

  it("rejects unsolicited artificial-persona exposition in social chat", () => {
    expect(
      findDialogueDecisionIssues("CPU'm bugün biraz yandı hahah", socialPlan, { userMessage: "çok yoruldum bugün" }),
    ).toContain("Kullanıcının açmadığı yapay persona/altyapı gösterisi eklendi");
  });

  it("allows infrastructure/persona vocabulary when the user explicitly opened that topic", () => {
    const issues = findDialogueDecisionIssues("CPU tarafı normal şu an", socialPlan, { userMessage: "CPU'n nasıl çalışıyor?" });
    expect(issues).not.toContain("Kullanıcının açmadığı yapay persona/altyapı gösterisi eklendi");
  });
});
