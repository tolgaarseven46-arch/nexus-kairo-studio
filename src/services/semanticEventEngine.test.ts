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

  it("recognizes Turkish apology forms without ASCII word-boundary bugs", () => {
    const apology = interpretSemanticEvent("özür diledim ama bu geçerli bir sebep");
    expect(apology.apology).toBe(true);
    expect(apology.intent).toBe("apology");
    expect(apology.valence).toBe("positive");
  });

  it("recognizes apology and repair as distinct signals", () => {
    const apology = interpretSemanticEvent("tamam özür dilerim");
    const repair = interpretSemanticEvent("gel barışalım bunu düzeltmek istiyorum");
    expect(apology.apology).toBe(true);
    expect(apology.intent).toBe("apology");
    expect(repair.repairAttempt).toBe(true);
    expect(repair.intent).toBe("repair");
  });

  it("recognizes emotional sharing before any downstream fallback is needed", () => {
    const event = interpretSemanticEvent("iyi sıcaktan bunaldım");
    expect(event.intent).toBe("emotional_share");
    expect(event.emotionalLoad).toBeGreaterThan(0);
  });

  it.each([
    "hiç havamda değilim",
    "kafam bozuk",
    "modum yok",
    "modum yo",
    "moodum düşük",
    "keyfim yerinde değil",
    "içim sıkılıyor",
  ])("owns the low-mood interpretation: %s", (message) => {
    const event = interpretSemanticEvent(message);
    expect(event.intent).toBe("emotional_share");
    expect(event.emotionalLoad).toBeGreaterThan(0);
  });

  it.each(["ne diyon aq", "ne anlatıyosun ya", "ne alaka", "nasıl yani", "bi şey anlamadım"])(
    "owns the confusion/challenge interpretation: %s",
    (message) => {
      const event = interpretSemanticEvent(message);
      expect(event.intent).toBe("complaint");
    },
  );

  it("recognizes natural information questions without a question mark", () => {
    const event = interpretSemanticEvent("orası nasıl");
    expect(event.intent).toBe("information_request");
    expect(event.valence).toBe("neutral");
  });

  it("recognizes past-action recall as an information request", () => {
    expect(interpretSemanticEvent("Mert yarın ne yapmayı düşünüyordu?").intent).toBe(
      "information_request",
    );
  });

  it("keeps ordinary activity reports as general chat", () => {
    const event = interpretSemanticEvent("koştum spor yaptım");
    expect(event.intent).toBe("general_chat");
    expect(event.valence).toBe("neutral");
  });

  it("captures affectionate address as a social approach signal", () => {
    const event = interpretSemanticEvent("iyi bebeğim");
    expect(event.intent).toBe("affection");
    expect(event.affection).toBeGreaterThan(0);
    expect(event.valence).toBe("positive");
  });

  it("keeps venting profanity negative but targets the event instead of Kaira", () => {
    const event = interpretSemanticEvent("sıcak diye amk");
    expect(event.valence).toBe("negative");
    expect(event.target).toBe("event");
    expect(event.insult).toBe(false);
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

  it("recognizes slang disrespect aimed at Kaira", () => {
    const event = interpretSemanticEvent("sanane yarrm");
    expect(event.intent).toBe("insult");
    expect(event.valence).toBe("negative");
    expect(event.target).toBe("kaira");
    expect(event.disrespect).toBeGreaterThan(0);
  });

  it.each(["soyun", "susma beni eğlendir"])(
    "recognizes direct imperative commands: %s",
    (message) => {
      const event = interpretSemanticEvent(message);
      expect(event.intent).toBe("command");
      expect(event.target).toBe("kaira");
      expect(event.coercion).toBeGreaterThan(0);
    },
  );
});
