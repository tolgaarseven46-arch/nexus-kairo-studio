import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import type { WorldEventObservation } from "./worldModelEventStore";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import { appraiseRetrievedWorldState } from "./worldStateAppraisal";
import { deriveWorldReasoningPolicy } from "./worldReasoningPolicy";
import { enforceWorldModelRecallResponse } from "./worldModelResponseGuard";

const messages = [
  "selam kaira naber",
  "bugün biraz yorgunum",
  "Mert yarın istifa edeceğini söyledi",
  "haklı bence",
  "müdürle konuşacakmış",
  "neyse sen nasılsın",
  "saçmalama ya",
  "tamam kızma",
  "özür dilerim",
  "Mert yarın ne yapacaktı",
  "Ali de istifa edecek dedi",
  "sonra Ali istifa etmeyeceğini söyledi",
  "hangisi doğru şimdi",
  "tamam bunu unutma",
  "bugün modum yok",
  "niye bu kadar ciddisin",
  "şaka yaptım",
  "tamam anladım",
  "Mert ne yapacaktı hatırlıyor musun",
  "görüşürüz sonra",
] as const;

function observation(input: {
  id: string;
  raw: string;
  at: string;
  kind?: "reported_claim" | "direct_interaction";
  polarity?: "positive" | "negative";
}): WorldEventObservation {
  const kind = input.kind ?? "reported_claim";
  return {
    id: input.id,
    userId: "test_user_x",
    kairaInstanceId: "kaira_a",
    sessionId: "session_20_turn",
    speakerName: "Mert",
    kind,
    status: "grounded",
    createdAt: input.at,
    event: {
      raw: input.raw,
      eventType: "general",
      actor: { name: "Ali", source: "explicit_name", confidence: 0.95 },
      target: { name: "Mert", id: "current_user", source: "first_person", confidence: 1 },
      reportedSpeech: kind === "reported_claim",
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      polarity: input.polarity ?? "positive",
      temporal: { relation: "unspecified", asksLatest: false },
      proposition: {
        key: "ali|general|mert|istifa",
        predicate: "general",
        actorKey: "ali",
        targetKey: "mert",
        contentKey: "istifa",
      },
      modality: { kind: "unspecified", strength: 0 },
      lifecycle: { kind: "unspecified", strength: 0 },
    },
  };
}

function runTwentyTurns() {
  let state: DroitDynamicState | undefined;
  const snapshots: Array<{
    turn: number;
    message: string;
    state: DroitDynamicState;
    interactionCount: number;
    intent: string;
    sentiment: string;
  }> = [];

  for (const [index, message] of messages.entries()) {
    const result = analyzeKdmInteraction(message, undefined, state);
    state = result.nextDynamicState;
    snapshots.push({
      turn: index + 1,
      message,
      state: structuredClone(result.nextDynamicState),
      interactionCount: result.nextDynamicState.relationship?.interactionCount ?? 0,
      intent: result.trace.messageInterpretation.intent,
      sentiment: result.trace.messageInterpretation.sentiment,
    });
  }

  return snapshots;
}

describe("KAIRA 20-turn end-to-end contracts", () => {
  it("keeps a real per-turn state snapshot instead of repeating final state", () => {
    const turns = runTwentyTurns();

    expect(turns).toHaveLength(20);
    expect(turns.map((turn) => turn.turn)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));

    for (let i = 1; i < turns.length; i += 1) {
      expect(turns[i].interactionCount).toBeGreaterThan(turns[i - 1].interactionCount);
    }

    const finalInteractionCount = turns.at(-1)!.interactionCount;
    expect(turns[0].interactionCount).toBeLessThan(finalInteractionCount);
    expect(turns[9].interactionCount).toBeLessThan(finalInteractionCount);
    expect(new Set(turns.map((turn) => turn.interactionCount)).size).toBe(20);
  });

  it("preserves earlier snapshots after later turns mutate the active state", () => {
    const turns = runTwentyTurns();
    const early = turns[2];
    const late = turns[18];

    expect(early.message).toBe("Mert yarın istifa edeceğini söyledi");
    expect(late.message).toBe("Mert ne yapacaktı hatırlıyor musun");
    expect(early.interactionCount).toBeLessThan(late.interactionCount);
    expect(early.state).not.toBe(late.state);
    expect(early.state.relationship?.interactionCount).toBe(early.interactionCount);
    expect(late.state.relationship?.interactionCount).toBe(late.interactionCount);
  });

  it("does not let a later apology rewrite the earlier negative-turn state", () => {
    const turns = runTwentyTurns();
    const negative = turns[6];
    const apology = turns[8];

    expect(negative.state.relationship?.negativeEvents ?? 0).toBeGreaterThanOrEqual(1);
    expect(apology.interactionCount).toBeGreaterThan(negative.interactionCount);
    expect(negative.state.relationship?.interactionCount).toBe(negative.interactionCount);
  });

  it("keeps reported world-memory qualified at the recall seam", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne demişti?",
      [observation({ id: "reported", raw: "Ali yarın istifa edeceğini söyledi", at: "2026-08-30T10:00:00.000Z" })],
      5,
    );
    const appraisal = appraiseRetrievedWorldState(retrieved);
    const policy = deriveWorldReasoningPolicy(appraisal);
    const guard = enforceWorldModelRecallResponse("Ali yarın istifa edecek.", retrieved);

    expect(appraisal.evidencePosture).toBe("grounded_reported");
    expect(policy.mustQualify).toBe(true);
    expect(policy.mustPreserveReportedAttribution).toBe(true);
    expect(guard.changed).toBe(true);
    expect(guard.reply).toMatch(/Bana daha önce/iu);
  });

  it("preserves contradictions instead of collapsing them into one truth", () => {
    const retrieved = rankWorldEventObservations(
      "Ali istifa edecek mi?",
      [
        observation({ id: "yes", raw: "Ali istifa edecek", at: "2026-08-30T10:00:00.000Z", polarity: "positive" }),
        observation({ id: "no", raw: "Ali istifa etmeyecek", at: "2026-08-30T10:05:00.000Z", polarity: "negative" }),
      ],
      5,
    );
    const appraisal = appraiseRetrievedWorldState(retrieved);
    const policy = deriveWorldReasoningPolicy(appraisal);
    const guard = enforceWorldModelRecallResponse("Ali istifa edecek.", retrieved);

    expect(appraisal.truthPosture).toBe("conflicting");
    expect(policy.mode).toBe("preserve_conflict");
    expect(policy.mustPreserveConflict).toBe(true);
    expect(guard.changed).toBe(true);
    expect(guard.reply).toMatch(/çelişen/iu);
    expect(guard.reply).toContain("Ali istifa edecek");
    expect(guard.reply).toContain("Ali istifa etmeyecek");
  });

  it("keeps direct interaction separate from user-reported attribution", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne yapacaktı?",
      [observation({ id: "direct", raw: "Ali yarın istifa edecek", at: "2026-08-30T10:00:00.000Z", kind: "direct_interaction" })],
      5,
    );
    const appraisal = appraiseRetrievedWorldState(retrieved);
    const policy = deriveWorldReasoningPolicy(appraisal);
    const guard = enforceWorldModelRecallResponse("Ali yarın istifa edecek.", retrieved);

    expect(appraisal.evidencePosture).toBe("grounded_direct");
    expect(policy.mustPreserveReportedAttribution).toBe(false);
    expect(guard.reply).not.toMatch(/Bana daha önce/iu);
    expect(guard.reply).toMatch(/Hatırladığım kayda göre/iu);
  });
});
