import { describe, expect, it } from "vitest";
import {
  buildKairoGroundingInstruction,
  findKairoGroundingIssues,
} from "./kairoConversationGrounding";

const history = [
  { sender: "user", text: "Mert yarın istifa etmeyi düşünüyorum dedi." },
  { sender: "droit", text: "O iş ciddiymiş." },
];

describe("Kaira conversation grounding", () => {
  it("detects certainty inflation", () => {
    expect(
      findKairoGroundingIssues(
        "Mert yarın istifa edecekti.",
        history,
        "Mert ne yapacaktı?",
      ),
    ).toContain(
      "Belirsiz/niyet bildiren bilgi kesin gelecek olayı gibi aktarıldı",
    );
  });

  it("accepts preserved uncertainty", () => {
    expect(
      findKairoGroundingIssues(
        "Mert yarın istifa etmeyi düşünüyordu.",
        history,
        "Mert ne yapacaktı?",
      ),
    ).toEqual([]);
  });

  it("detects an unsolicited verdict", () => {
    expect(
      findKairoGroundingIssues(
        "Bence sen %70 haklıydın.",
        [],
        "Mert bana salak dedi.",
      ),
    ).toContain(
      "Yeterli kanıt veya açık görüş talebi olmadan haklı/haksız yargısı üretildi",
    );
  });

  it("allows attributed speech without treating it as Kaira judgement", () => {
    expect(
      findKairoGroundingIssues(
        "Sen Mert’e haklısın dedin.",
        [],
        "Ben ne demiştim?",
      ),
    ).toEqual([]);
  });

  it("places uncertain evidence in the model instruction", () => {
    expect(
      buildKairoGroundingInstruction(history, "Mert ne yapacaktı?"),
    ).toContain("Mert yarın istifa etmeyi düşünüyorum dedi.");
  });
});
