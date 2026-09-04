import { describe, expect, it, vi } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { buildBehaviorContract } from "./behaviorContract";
import { deriveDiscourseState } from "./discourseStateReducer";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import type { ConversationTurn } from "./kairoConversationGrounding";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { tryLocalKairoReply } from "./kairoLocalLanguageEngine";
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from "./kairaResponsePlan";
import { enforceKairoResponse } from "./kairoResponseConsistency";
import { findKairoResponseRhythmIssues } from "./kairoResponseRhythm";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

const messages = [
  "selam kaira",
  "naber",
  "Mert yarın istifa edeceğini söyledi",
  "haklı bence",
  "müdürle konuşacakmış",
  "teşekkürler",
  "bugün iş çok yoğundu",
  "neyse hallederiz",
  "sen salaksın",
  "selam tekrar",
  "Mert yarın ne yapacaktı",
  "tamam",
  "dün biraz sert konuştum",
  "kusura bakma",
  "özür dilerim",
  "naber şimdi",
  "iyi geceler",
  "teşekkürler",
  "Mert ne yapacaktı hatırlıyor musun",
  "görüşürüz",
] as const;

function semanticSnapshot(message: string): SemanticInterpretation {
  const base = interpretationFromRegexFloor(message);
  if (message === "Mert yarın ne yapacaktı" || message === "Mert ne yapacaktı hatırlıyor musun") {
    return {
      ...base,
      primaryIntent: "question",
      target: "third_party",
      discourseFacets: {
        ...base.discourseFacets,
        discourseAct: "recall_request",
      },
    };
  }
  if (message === "Mert yarın istifa edeceğini söyledi" || message === "müdürle konuşacakmış") {
    return { ...base, target: "third_party" };
  }
  return base;
}

function deterministicAiDraft(message: string, turn: number): string {
  if (message === "sen salaksın") return "hahaha kanka sorun yok ya 😂";
  if (message === "selam tekrar") return "hahaha kanka ne var ne yok 😂";
  if (message === "kusura bakma" || message === "özür dilerim") return "tamam kanka sorun yok ya 😂";
  if (message.includes("Mert") && (message.includes("ne yapacaktı") || message.includes("hatırlıyor musun"))) {
    return "Bana daha önce Mert'in yarın istifa edeceği söylendi.";
  }
  if (message === "Mert yarın istifa edeceğini söyledi") return "hmm, bunu aklımda tutarım";
  if (message === "müdürle konuşacakmış") return "işi baya ciddiye bindirmiş";
  if (message === "bugün iş çok yoğundu") return "of yorucu geçmiş belli";
  if (message === "neyse hallederiz") return "aynen, toparlanır";
  if (message === "dün biraz sert konuştum") return "fark ettim, biraz mesafe iyi geldi";
  const neutral = ["he anladım", "aynen öyle", "hmm tamam", "iyi bari", "tamamdır"] as const;
  return neutral[turn % neutral.length];
}

describe("Kaira 20-turn canonical final-delivery quality regression", () => {
  it("keeps canonical semantics, speech identity and delivered replies coherent across the full mixed session", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-09-04T15:00:00.000Z").getTime());

    try {
      let state: DroitDynamicState | undefined;
      const history: ConversationTurn[] = [];
      const deliveredReplies: string[] = [];
      const semanticSources: string[] = [];
      const routes: Array<"local_language" | "ai"> = [];
      const speechRhythms: string[] = [];
      const reactionModes: string[] = [];

      for (const [index, message] of messages.entries()) {
        const semantic = await understandTurkishMessage(message, {
          incomingSemanticInterpretation: semanticSnapshot(message),
          context: { userName: "Ali", characterName: "Kaira" },
        });
        semanticSources.push(semantic.semanticSource);

        const kdm = analyzeKdmInteractionCanonicalTurn(
          message,
          NEUTRAL_DROIT_PERSONALITY,
          state,
          semantic.interpretation,
          semantic.event,
        );
        state = kdm.nextDynamicState;
        reactionModes.push(state.reactionMode);

        const currentUserTurn: ConversationTurn = {
          sender: "user",
          text: message,
          participantId: "final_delivery_quality_user",
          participantName: "Ali",
          semanticInterpretation: semantic.interpretation,
          semanticSource: semantic.semanticSource,
        };
        const discourse = deriveDiscourseState([...history, currentUserTurn]);
        const behaviorContract = buildBehaviorContract(state, kdm.trace, semantic.event);
        const dialogueDecision = planDialogueResponse(
          history,
          message,
          "Ali",
          semantic.event,
          undefined,
          discourse,
        );
        const speech = computeKairoSpeechIdentity(
          NEUTRAL_DROIT_PERSONALITY,
          state,
          kdm.trace,
        );
        speechRhythms.push(JSON.stringify(speech.rhythm));
        const responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech);

        const local = tryLocalKairoReply(
          message,
          NEUTRAL_DROIT_PERSONALITY,
          state,
          kdm.trace,
          "final_delivery_quality_user",
          dialogueDecision.move,
          responsePlan,
          semantic.event,
          false,
          discourse,
        );

        let route: "local_language" | "ai" = "ai";
        let draft = deterministicAiDraft(message, index);
        if (local.handled && local.reply) {
          const localIssues = [
            ...findKairaResponsePlanIssues(local.reply, responsePlan),
            ...findKairoResponseRhythmIssues(
              local.reply,
              history,
              dialogueDecision.move,
              speech.relationshipLevel,
            ),
          ];
          if (localIssues.length === 0) {
            route = "local_language";
            draft = local.reply;
          }
        }

        const enforced = enforceKairoResponse(draft, kdm.trace, {
          continueConversation: responsePlan.continueConversation,
          humorAllowed: responsePlan.allowHumor,
          askQuestion: responsePlan.allowQuestion,
          emojiBudget: responsePlan.emojiBudget,
          maxSentences: responsePlan.maxSentences,
          maxWords: responsePlan.maxWords,
          conversationState: behaviorContract.conversationState,
          behaviorContract,
        });
        const reply = enforced.reply;
        const finalIssues = [
          ...findKairaResponsePlanIssues(reply, responsePlan),
          ...findKairoResponseRhythmIssues(
            reply,
            history,
            dialogueDecision.move,
            speech.relationshipLevel,
          ),
        ];

        expect(finalIssues, `turn ${index + 1}: ${message} -> ${reply}`).toEqual([]);
        expect(reply).not.toMatch(/\b(?:elbette|memnuniyetle|nasıl yardımcı olabilirim|dilerseniz|özetlemek gerekirse)\b/iu);
        expect(reply).not.toMatch(/(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+/u);

        routes.push(route);
        deliveredReplies.push(reply);
        history.push(currentUserTurn);
        history.push({
          sender: "droit",
          text: reply,
          participantId: "kaira_a",
          participantName: "Kaira",
          replyToParticipantId: "final_delivery_quality_user",
          replyToParticipantName: "Ali",
        });
      }

      expect(deliveredReplies).toHaveLength(20);
      expect(history).toHaveLength(40);
      expect(semanticSources).toEqual(Array(20).fill("client_shared"));
      expect(routes).toContain("local_language");
      expect(routes).toContain("ai");

      expect(new Set(speechRhythms).size).toBe(1);
      expect(JSON.parse(speechRhythms[0]).messageLength).toBe("short_first");

      expect(reactionModes[8]).not.toBe("neutral");
      expect(reactionModes[9]).not.toBe("neutral");
      expect(deliveredReplies[9].toLocaleLowerCase("tr-TR")).not.toContain("kanka");
      expect(deliveredReplies[9].toLocaleLowerCase("tr-TR")).not.toContain("hahaha");
      expect(deliveredReplies[9]).not.toContain("😂");

      expect([reactionModes[13], reactionModes[14]]).toEqual(
        expect.arrayContaining([expect.stringMatching(/repairing|neutral/)]),
      );
      expect(deliveredReplies[13].toLocaleLowerCase("tr-TR")).not.toContain("sorun yok");
      expect(deliveredReplies[14].toLocaleLowerCase("tr-TR")).not.toContain("sorun yok");

      const meaningfulReplies = deliveredReplies
        .map((reply) => reply.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9\s]/giu, " ").replace(/\s+/gu, " ").trim())
        .filter((reply) => reply.split(/\s+/u).length >= 4);
      for (let index = 3; index < meaningfulReplies.length; index += 1) {
        expect(meaningfulReplies.slice(index - 3, index)).not.toContain(meaningfulReplies[index]);
      }
    } finally {
      vi.restoreAllMocks();
    }
  });
});
