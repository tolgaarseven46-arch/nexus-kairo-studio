import { describe, expect, it } from "vitest";
import {
  buildDialogueDecisionInstruction,
  buildGroundedDialogueFallback,
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

const mixedHistory = [
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
const recallQuestion = "neyse Mert yarın ne yapacaktı?";

describe("Kaira dialogue decision engine", () => {
  it("chooses one bounded recall move when the target has no active claim", () => {
    const plan = planDialogueResponse(mixedHistory, recallQuestion, "Ali");
    expect(plan).toMatchObject({
      move: "grounded_recall",
      target: "Mert",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 2,
      hasSupportedTargetClaim: false,
    });
    expect(buildDialogueDecisionInstruction(plan)).toContain(
      "Takip sorusu: yasak",
    );
  });

  it("rejects the contradictory question tail from the real debug report", () => {
    const plan = planDialogueResponse(mixedHistory, recallQuestion, "Ali");
    const reply =
      "Elimizde kesin bilgi yok. Mert söylesin: istifa mı, zam mı, yoksa hiçbir şey mi?";
    expect(findDialogueDecisionIssues(reply, plan)).toContain(
      "Diyalog kararı takip sorusunu yasakladığı halde soru eklendi",
    );
  });

  it("builds a grounded fallback without reviving the denied plan", () => {
    const plan = planDialogueResponse(mixedHistory, recallQuestion, "Ali");
    const fallback = buildGroundedDialogueFallback(
      plan,
      mixedHistory,
      recallQuestion,
      "Ali",
    );
    expect(fallback).toBe(
      "Mert için yarına dair net bir plan yok. İstifa iddiasını reddetti.",
    );
    expect(findDialogueDecisionIssues(fallback!, plan)).toEqual([]);
  });

  it("does not force a question after a normal social reaction", () => {
    const plan = planDialogueResponse([], "bugün hava çok sıcak ya", "Ali");
    expect(plan.move).toBe("natural_reaction");
    expect(plan.allowFollowUpQuestion).toBe(false);
  });

  it.each([
    "ne diyon aq",
    "ne anlatıyosun ya",
    "ne alaka",
    "nasıl yani",
    "bi şey anlamadım",
  ])("uses one bounded repair move for confusion or challenge: %s", (message) => {
    const plan = planDialogueResponse(
      [{ sender: "droit", text: "gereksiz uzun bir şey anlattım" }],
      message,
      "Mert",
    );

    expect(plan).toMatchObject({
      move: "repair_or_rephrase",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 8,
    });
    expect(findDialogueDecisionIssues("neyse bugün ne yapıyorsun?", plan)).toContain(
      "Diyalog kararı takip sorusunu yasakladığı halde soru eklendi",
    );
  });

  it("does not invent an other-repair sequence when there is no immediately prior Kaira turn", () => {
    const withoutPriorKaira = planDialogueResponse([], "ne alaka", "Mert");
    const afterUserTurn = planDialogueResponse(
      [{ sender: "user", text: "Mert böyle dedi", participantName: "Ali" }],
      "ne alaka",
      "Mert",
    );

    expect(withoutPriorKaira.move).not.toBe("repair_or_rephrase");
    expect(afterUserTurn.move).not.toBe("repair_or_rephrase");
  });

  it.each(["hiç biri", "hiçbiri", "yok", "ikisi de", "olmadı"])(
    "binds a short answer to Kaira's previous prompt: %s",
    (message) => {
      const plan = planDialogueResponse(
        [
          {
            sender: "droit",
            text: "ders mi iş mi, hangisi canını sıkıyor?",
          },
        ],
        message,
        "Mert",
      );

      expect(plan).toMatchObject({
        move: "follow_previous_answer",
        allowFollowUpQuestion: false,
        allowSpeculation: false,
        maxSentences: 1,
      });
    },
  );

  it("applies the speech emoji budget and canned-language gate globally", () => {
    const plan = planDialogueResponse([], "bugün hava iyi", "Mert");
    const issues = findDialogueDecisionIssues(
      "level atlamış bu 😄",
      plan,
      { emojiLevel: 10, userMessage: "bugün hava iyi" },
    );

    expect(issues).toContain(
      "Konuşma kimliği bu turda en fazla 0 emojiye izin veriyor",
    );
    expect(issues).toContain(
      "Kullanıcının başlatmadığı hazır internet esprisi veya oyun metaforu eklendi",
    );
  });

  it("uses final ResponsePlan output budgets in dialogue validation", () => {
    const plan = planDialogueResponse([], "bu konuda detaylı anlatır mısın?", "Mert");
    const issues = findDialogueDecisionIssues(
      "bir iki üç dört beş altı yedi 😄",
      plan,
      {
        emojiLevel: 100,
        emojiBudget: 0,
        maxSentences: 1,
        maxWords: 6,
      },
    );
    expect(issues).toContain("Konuşma kimliği bu turda en fazla 0 emojiye izin veriyor");
    expect(issues).toContain("Diyalog kararı 6 kelime sınırını aştı");
  });

  it("bounds self-deprecating banter to one short everyday reaction", () => {
    const message = "yine bütün işi son dakikaya bıraktım hahah";
    const plan = planDialogueResponse([], message, "Mert");
    const failedReply =
      "klasik erteleme speedrun’u açılmış 🏃‍♂️\npanik seviyen kaç şu an, ılımlı stres mi full kaos mu 😄";

    expect(plan).toMatchObject({
      move: "join_banter",
      allowFollowUpQuestion: false,
      maxSentences: 1,
      maxWords: 7,
    });
    expect(findDialogueDecisionIssues(failedReply, plan).length).toBeGreaterThan(
      0,
    );
    expect(buildGroundedDialogueFallback(plan, [], message, "Mert")).toBe(
      "yine şaşırtmadın hahah",
    );
    expect(
      findDialogueDecisionIssues("yine şaşırtmadın hahah", plan),
    ).toEqual([]);
  });

  it("uses a bounded curiosity move for a first emotional opening", () => {
    const plan = planDialogueResponse(
      [],
      "bugün moralim biraz bozuk ya",
      "Ali",
    );

    expect(plan).toMatchObject({
      move: "invite_emotional_context",
      allowFollowUpQuestion: true,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 4,
    });
    expect(buildDialogueDecisionInstruction(plan)).toContain(
      "ilişki seviyesini bu turda zorla sergileme",
    );
  });

  it("renders the dialogue prompt from the effective final question permission", () => {
    const plan = planDialogueResponse([], "moralim bozuk", "Ali");
    const instruction = buildDialogueDecisionInstruction(plan, false);

    expect(plan.allowFollowUpQuestion).toBe(true);
    expect(instruction).toContain("Takip sorusu: yasak");
    expect(instruction).not.toContain("Takip sorusu: gerekiyorsa en fazla bir tane");
    expect(instruction).not.toContain("hmm niye");
    expect(instruction).not.toContain("ne oldu");
    expect(instruction).toContain("hmm, anladım veya hee");
  });

  it("renders final ResponsePlan sentence and word budgets instead of wider dialogue budgets", () => {
    const plan = planDialogueResponse([], "bu konuda detaylı ne düşünüyorsun?", "Ali");
    expect(plan.maxSentences).toBe(3);
    const instruction = buildDialogueDecisionInstruction(plan, true, 1, 6);

    expect(instruction).toContain("Uzunluk bütçesi: en fazla 1 kısa cümle");
    expect(instruction).toContain("Kelime bütçesi: en fazla 6 kelime");
    expect(instruction).not.toContain("Uzunluk bütçesi: en fazla 3 kısa cümle");
  });

  it("rejects all three failed real emotional-opening replies", () => {
    const plan = planDialogueResponse(
      [],
      "bugün moralim biraz bozuk ya",
      "Ali",
    );
    const failedReplies = [
      "Hmm canım sıkıldı bak şimdi. Ne oldu, moralini kim kırdı bugün böyle 😕",
      "Off, geçmiş olsun ya. Canını sıkan ne olursa olsun, şu an resmi olarak bugünlük salma hakkın var bence.",
      "off canım üzüldüm bak şimdi. sarılıyormuş gibi düşün beni 🤍",
    ];

    for (const reply of failedReplies) {
      expect(findDialogueDecisionIssues(reply, plan).length).toBeGreaterThan(0);
    }
  });

  it("accepts the agreed minimal emotional-opening target", () => {
    const plan = planDialogueResponse(
      [],
      "bugün moralim biraz bozuk ya",
      "Ali",
    );

    expect(findDialogueDecisionIssues("hmm niye", plan)).toEqual([]);
    expect(
      buildGroundedDialogueFallback(
        plan,
        [],
        "bugün moralim biraz bozuk ya",
        "Ali",
      ),
    ).toBe("hmm niye");
  });

  it("rejects a short but artificial second phrase", () => {
    const plan = planDialogueResponse(
      [],
      "bugün moralim biraz bozuk ya",
      "Mert",
    );

    expect(
      findDialogueDecisionIssues(
        "Ne oldu, nereden koptu moral?",
        plan,
      ),
    ).toContain("İlk duygusal açılış tek kısa merak tepkisinin dışına çıktı");
  });

  it("does not override an explicit request for advice", () => {
    const plan = planDialogueResponse(
      [],
      "moralim bozuk ne yapmalıyım",
      "Ali",
    );

    expect(plan.move).not.toBe("invite_emotional_context");
  });

  it.each([
    "hiç havamda değilim",
    "kafam bozuk",
    "modum yok",
    "modum yo",
    "moodum düşük",
    "keyfim yerinde değil",
    "içim sıkılıyor",
  ])("groups the local low-mood variant: %s", (message) => {
    expect(planDialogueResponse([], message, "Mert").move).toBe(
      "invite_emotional_context",
    );
  });
});