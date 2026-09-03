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
import { buildKairaResponsePlan, type KairaResponsePlan } from "./kairaResponsePlan";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import type { WorldEventObservation } from "./worldModelEventStore";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import { appraiseRetrievedWorldState } from "./worldStateAppraisal";
import { deriveWorldReasoningPolicy } from "./worldReasoningPolicy";
import { enforceWorldModelRecallResponse } from "./worldModelResponseGuard";

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

function reportedMertPlan(): WorldEventObservation {
  return {
    id: "mert-plan",
    userId: "mixed_quality_user",
    kairaInstanceId: "kaira_a",
    sessionId: "mixed_quality_session",
    speakerName: "current_user",
    kind: "reported_claim",
    status: "grounded",
    createdAt: "2026-08-31T18:00:00.000Z",
    event: {
      raw: "Mert yarın istifa edeceğini söyledi",
      eventType: "general",
      actor: { name: "Mert", source: "explicit_name", confidence: 0.99 },
      target: { name: "Mert", source: "explicit_name", confidence: 0.99 },
      reportedSpeech: true,
      certainty: 0.95,
      ambiguities: [],
      evidence: [],
      polarity: "positive",
      temporal: { relation: "future", asksLatest: false },
      proposition: {
        key: "mert|general|mert|istifa",
        predicate: "general",
        actorKey: "mert",
        targetKey: "mert",
        contentKey: "istifa",
      },
      modality: { kind: "plan", strength: 0.8 },
      lifecycle: { kind: "unspecified", strength: 0 },
    },
  };
}

function deterministicAiReply(message: string): string {
  if (message === "sen salaksın") return "böyle konuşma";
  if (message === "kusura bakma" || message === "özür dilerim") return "tamam";
  if (message.includes("Mert") && message.includes("ne yapacaktı")) {
    return "Bana daha önce Mert'in yarın istifa edeceği söylendi.";
  }
  if (message === "bugün iş çok yoğundu") return "of yorucuymuş";
  return "he anladım";
}

describe("mixed canonical local/AI + recall + relationship repair quality regression", () => {
  it("keeps the real canonical semantic gateway, KDM, discourse, response plan and routing coherent across one 20-turn flow", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-08-31T18:00:00.000Z").getTime());

    let state: DroitDynamicState | undefined;
    const history: ConversationTurn[] = [];
    const routes: Array<"local_language" | "ai"> = [];
    const replies: string[] = [];
    const states: DroitDynamicState[] = [];
    const responsePlans: KairaResponsePlan[] = [];
    const semanticSources: string[] = [];
    const worldEvents: WorldEventObservation[] = [];
    const recallGuards: ReturnType<typeof enforceWorldModelRecallResponse>[] = [];

    for (const message of messages) {
      const semantic = await understandTurkishMessage(message, {
        incomingSemanticInterpretation: semanticSnapshot(message),
        context: { userName: "Ali", characterName: "Kaira" },
      });
      semanticSources.push(semantic.semanticSource);

      const result = analyzeKdmInteractionCanonicalTurn(
        message,
        NEUTRAL_DROIT_PERSONALITY,
        state,
        semantic.interpretation,
        semantic.event,
      );
      state = result.nextDynamicState;
      states.push(structuredClone(state));

      const currentUserTurn: ConversationTurn = {
        sender: "user",
        text: message,
        participantId: "mixed_quality_user",
        participantName: "Ali",
        semanticInterpretation: semantic.interpretation,
        semanticSource: semantic.semanticSource,
      };
      const discourse = deriveDiscourseState([...history, currentUserTurn]);
      const behaviorContract = buildBehaviorContract(state, result.trace, semantic.event);
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
        result.trace,
      );
      const responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech);
      responsePlans.push(responsePlan);

      const local = tryLocalKairoReply(
        message,
        NEUTRAL_DROIT_PERSONALITY,
        state,
        result.trace,
        "mixed_quality_user",
        dialogueDecision.move,
        responsePlan,
        semantic.event,
        false,
      );
      const route: "local_language" | "ai" = local.handled ? "local_language" : "ai";
      const reply = local.handled && local.reply ? local.reply : deterministicAiReply(message);
      routes.push(route);
      replies.push(reply);

      history.push(currentUserTurn);
      history.push({
        sender: "droit",
        text: reply,
        participantId: "kaira_a",
        participantName: "Kaira",
        replyToParticipantId: "mixed_quality_user",
        replyToParticipantName: "Ali",
      });

      if (message === "Mert yarın istifa edeceğini söyledi") worldEvents.push(reportedMertPlan());
      if (message.includes("Mert") && (message.includes("ne yapacaktı") || message.includes("hatırlıyor musun"))) {
        const retrieved = rankWorldEventObservations(message, worldEvents, 5);
        const appraisal = appraiseRetrievedWorldState(retrieved);
        const policy = deriveWorldReasoningPolicy(appraisal);
        expect(policy.mustPreserveReportedAttribution).toBe(true);
        recallGuards.push(
          enforceWorldModelRecallResponse("Mert yarın istifa edecek.", retrieved, { appraisal, policy }),
        );
      }
    }

    expect(states).toHaveLength(20);
    expect(responsePlans).toHaveLength(20);
    expect(history).toHaveLength(40);
    expect(semanticSources).toEqual(Array(20).fill("client_shared"));
    expect(routes).toContain("local_language");
    expect(routes).toContain("ai");

    const byMessage = new Map(messages.map((message, index) => [message, routes[index]]));
    expect(byMessage.get("selam kaira")).toBe("local_language");
    expect(byMessage.get("naber")).toBe("local_language");
    expect(byMessage.get("teşekkürler")).toBe("local_language");
    expect(byMessage.get("görüşürüz")).toBe("local_language");
    expect(byMessage.get("Mert yarın istifa edeceğini söyledi")).toBe("ai");
    expect(byMessage.get("Mert yarın ne yapacaktı")).toBe("ai");
    expect(byMessage.get("Mert ne yapacaktı hatırlıyor musun")).toBe("ai");
    expect(byMessage.get("sen salaksın")).toBe("ai");
    expect(byMessage.get("kusura bakma")).toBe("ai");
    expect(byMessage.get("özür dilerim")).toBe("ai");

    expect(responsePlans[10].move).toBe("grounded_recall");
    expect(responsePlans[10].allowQuestion).toBe(false);
    expect(responsePlans[18].move).toBe("grounded_recall");
    expect(responsePlans[18].allowQuestion).toBe(false);

    const insultState = states[8];
    const postInsultGreetingState = states[9];
    const postInsultGreetingPlan = responsePlans[9];
    const firstApologyState = states[13];
    const secondApologyState = states[14];
    expect(insultState.reactionMode).not.toBe("neutral");
    expect(postInsultGreetingState.reactionMode).not.toBe("neutral");
    expect(postInsultGreetingPlan.continueConversation).toBe(true);
    expect(replies[9].toLocaleLowerCase("tr-TR")).not.toContain("kanka");
    expect([firstApologyState.reactionMode, secondApologyState.reactionMode]).toEqual(
      expect.arrayContaining([expect.stringMatching(/repairing|neutral/)]),
    );

    expect(recallGuards).toHaveLength(2);
    for (const guard of recallGuards) {
      expect(guard.changed).toBe(true);
      expect(guard.reply).toMatch(/Bana daha önce/iu);
      expect(guard.reply).toContain("Mert");
    }

    const interactionCounts = states.map((item) => item.relationship?.interactionCount ?? 0);
    for (let index = 1; index < interactionCounts.length; index += 1) {
      expect(interactionCounts[index]).toBeGreaterThan(interactionCounts[index - 1]);
    }

    vi.restoreAllMocks();
  });
});
