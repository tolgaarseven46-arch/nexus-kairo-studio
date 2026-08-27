import { describe, expect, it } from "vitest";
import {
  analyzeDialogueTurn,
  buildDialogueClaimLedger,
  buildDialogueBoardInstruction,
  findDialogueAttributionIssues,
} from "./kairoDialogueChaosEngine";

describe("Kaira complex dialogue engine", () => {
  it("recognizes a correction without turning it into a durable fact", () => {
    const result = analyzeDialogueTurn("yok lan o ben değildim");
    expect(result.acts).toContain("correction");
    expect(result.memoryScope).toBe("episodic");
  });

  it("keeps uncertainty below certain-fact confidence", () => {
    const result = analyzeDialogueTurn("Mert yarın müdürle konuşur herhalde");
    expect(result.acts).toContain("uncertain");
    expect(result.factConfidence).toBeLessThan(0.5);
    expect(result.memoryScope).toBe("episodic");
  });

  it("keeps obvious absurd banter in the current session", () => {
    const result = analyzeDialogueTurn("müdür aslında uzaylı 😂");
    expect(result.acts).toContain("banter");
    expect(result.isLikelyAbsurd).toBe(true);
    expect(result.memoryScope).toBe("session");
    expect(result.factConfidence).toBeLessThan(0.2);
  });

  it("marks stable personal information as a durable candidate", () => {
    const result = analyzeDialogueTurn("Benim mesleğim öğretmenlik");
    expect(result.memoryScope).toBe("durable_candidate");
    expect(result.factConfidence).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps parallel group-chat topics on the dialogue board", () => {
    const instruction = buildDialogueBoardInstruction(
      [
        {
          sender: "user",
          participantName: "Ali",
          text: "maaş zammını konuşacağım",
        },
        {
          sender: "user",
          participantName: "Mert",
          text: "yok lan o ben değildim",
        },
        {
          sender: "user",
          participantName: "Can",
          text: "bu arada maça gelceniz mi",
        },
      ],
      "müdür de maça gelsin 😂",
      "Ali",
    );

    expect(instruction).toContain("maaş");
    expect(instruction).toContain("maça");
    expect(instruction).toContain("Mert: [correction");
    expect(instruction).toContain("Birden fazla konu dalı açık kalabilir");
    expect(instruction).toContain(
      "Her ayrıntıya cevap vermek zorunda değilsin",
    );
  });

  it("keeps the claim source separate from the person doing the action", () => {
    const history = [
      {
        sender: "user",
        participantName: "Ali",
        text: "Mert yarın müdürle konuşup istifa edecekmiş.",
      },
      {
        sender: "user",
        participantName: "Mert",
        text: "yok lan o ben değildim, Ali maaş zammını konuşacaktı herhalde",
      },
    ];

    const ledger = buildDialogueClaimLedger(
      history,
      "neyse Mert yarın ne yapacaktı?",
      "Ali",
    );
    expect(ledger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "Ali",
          subject: "Mert",
          status: "denied",
        }),
        expect.objectContaining({
          source: "Mert",
          subject: "Ali",
          status: "uncertain",
        }),
      ]),
    );
  });

  it("rejects assigning Ali's salary discussion to Mert", () => {
    const history = [
      {
        sender: "user",
        participantName: "Ali",
        text: "Mert yarın müdürle konuşup istifa edecekmiş.",
      },
      {
        sender: "user",
        participantName: "Mert",
        text: "yok lan o ben değildim, Ali maaş zammını konuşacaktı herhalde",
      },
    ];
    const question = "neyse Mert yarın ne yapacaktı?";

    expect(
      findDialogueAttributionIssues(
        "Mert yarın maaş zammını konuşacak gibi duruyor.",
        history,
        question,
        "Ali",
      ),
    ).toContain(
      "maaş konusu Mert yerine başka bir kişiye ait kaynaktan yanlış aktarıldı",
    );
    expect(
      findDialogueAttributionIssues(
        "Mert için net bir plan kalmadı; istifa iddiasını reddetti. Maaş konusu Ali'nindi ve o da kesin değildi.",
        history,
        question,
        "Ali",
      ),
    ).toEqual([]);
  });
});
