import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import {
  buildActiveParticipantInstruction,
  buildKairoGroundingInstruction,
  findKairoGroundingIssues,
  formatKairoHistoryForModel,
  sanitizeKairoReplyText,
  sanitizeKairoChatHistory,
} from "./kairoConversationGrounding";

function semanticSnapshot(raw: string, uncertaintyOverall: number): SemanticInterpretation {
  return {
    schemaVersion: "semantic-interpretation@2",
    raw,
    normalized: raw.toLocaleLowerCase("tr-TR"),
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "unknown",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0,
    sincerityConfidence: 1,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    stopRequest: false,
    discourseFacets: {
      socialRoutine: "none",
      discourseAct: "none",
      repairSignal: "none",
      adviceRequested: false,
      knowledgeQuery: null,
      selfMemoryQuery: null,
      relationalAct: "none",
      relationalIntensity: 0,
      stopQuestions: false,
      stopTalking: false,
    },
    uncertainty: {
      overall: uncertaintyOverall,
      intent: uncertaintyOverall,
      target: 0,
      severity: 0,
    },
    evidence: [
      {
        source: "reconciled",
        cues: ["grounding_fixture"],
        confidence: 1,
      },
    ],
  };
}

const uncertainHistoryText = "Mert yarın istifa etmeyi düşünüyorum dedi.";
const history = [
  {
    sender: "user",
    text: uncertainHistoryText,
    semanticInterpretation: semanticSnapshot(uncertainHistoryText, 0.8),
  },
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

  it("places persisted uncertain evidence in the model instruction", () => {
    expect(
      buildKairoGroundingInstruction(history, "Mert ne yapacaktı?"),
    ).toContain(uncertainHistoryText);
  });

  it("removes a failed assistant turn together with its user message", () => {
    const failedHistory = [
      {
        sender: "user",
        text: "Mert bugün gerçekten çok saçmalıyor.",
        participantId: "ali",
        participantName: "Ali",
      },
      {
        sender: "droit",
        text: "[Hata]: OpenRouter boş yanıt döndürdü.",
        replyToParticipantId: "ali",
        replyToParticipantName: "Ali",
      },
      {
        sender: "user",
        text: "Ali haksız, ben saçmalamadım.",
        participantId: "mert",
        participantName: "Mert",
      },
      {
        sender: "droit",
        text: "Ali'nin neye takıldığını biliyor musun?",
        replyToParticipantId: "mert",
        replyToParticipantName: "Mert",
      },
    ];

    expect(sanitizeKairoChatHistory(failedHistory)).toEqual(
      failedHistory.slice(2),
    );
  });

  it("collapses only consecutive duplicate messages from the same person", () => {
    const duplicateHistory = [
      {
        sender: "user",
        text: "Aynı cümle",
        participantId: "ali",
        participantName: "Ali",
      },
      {
        sender: "user",
        text: "Aynı cümle",
        participantId: "ali",
        participantName: "Ali",
      },
      {
        sender: "user",
        text: "Aynı cümle",
        participantId: "mert",
        participantName: "Mert",
      },
    ];

    const clean = sanitizeKairoChatHistory(duplicateHistory);
    expect(clean).toHaveLength(2);
    expect(clean.map((turn) => turn.participantName)).toEqual(["Ali", "Mert"]);
  });

  it("labels both the speaker and Kaira's reply target in model history", () => {
    const modelHistory = formatKairoHistoryForModel([
      {
        sender: "user",
        text: "Maaş zammını konuşacağım.",
        participantId: "ali",
        participantName: "Ali",
      },
      {
        sender: "droit",
        text: "Kafanda bir oran var mı?",
        replyToParticipantId: "ali",
        replyToParticipantName: "Ali",
      },
      {
        sender: "user",
        text: "İstifa etmeyi düşünüyorum.",
        participantId: "mert",
        participantName: "Mert",
      },
      {
        sender: "droit",
        text: "Kararın net mi?",
        replyToParticipantId: "mert",
        replyToParticipantName: "Mert",
      },
    ]);

    expect(modelHistory.map((turn) => turn.content)).toEqual([
      "[Ali]: Maaş zammını konuşacağım.",
      "[Kairo → Ali]: Kafanda bir oran var mı?",
      "[Mert]: İstifa etmeyi düşünüyorum.",
      "[Kairo → Mert]: Kararın net mi?",
    ]);
  });

  it("binds first-person references to the active participant", () => {
    const instruction = buildActiveParticipantInstruction("Mert", "test_mert");
    expect(instruction).toContain("AKTİF KONUŞAN: Mert (test_mert)");
    expect(instruction).toContain('"Ben/bana/benim"');
    expect(instruction).toContain("ilişki ve kalıcı hafıza katmanı ayrıdır");
  });

  it("removes internal reply-target labels from the visible answer", () => {
    expect(
      sanitizeKairoReplyText("[Kairo → Ali]: Kanka son durum net değil."),
    ).toBe("Kanka son durum net değil.");
    expect(
      sanitizeKairoReplyText("[Kaira → Ali]: Kanka son durum net değil."),
    ).toBe("Kanka son durum net değil.");
    expect(
      sanitizeKairoReplyText("[Kaİra → Ali]: Tamam, soru yok."),
    ).toBe("Tamam, soru yok.");
    expect(sanitizeKairoReplyText("Kairo: Selam kanka.")).toBe("Selam kanka.");
    expect(sanitizeKairoReplyText("Kaira: Selam kanka.")).toBe("Selam kanka.");
  });
});
