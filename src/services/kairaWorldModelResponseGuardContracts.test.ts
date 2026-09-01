import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import { appraiseRetrievedWorldState } from "./worldStateAppraisal";
import { deriveWorldReasoningPolicy } from "./worldReasoningPolicy";
import {
  enforceWorldModelRecallResponse,
  findWorldModelResponseIssues,
} from "./worldModelResponseGuard";

function row(input: {
  id: string;
  raw: string;
  at: string;
  polarity?: "positive" | "negative";
  status?: "grounded" | "ambiguous";
  kind?: "reported_claim" | "direct_interaction";
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "u",
    kairaInstanceId: "kaira_a",
    sessionId: "s",
    speakerName: "Mert",
    kind: input.kind || "reported_claim",
    status: input.status || "grounded",
    createdAt: input.at,
    event: {
      raw: input.raw,
      eventType: "general",
      actor: { name: "Ali", source: "explicit_name", confidence: 0.95 },
      target: { name: "Mert", id: "current_user", source: "first_person", confidence: 1 },
      reportedSpeech: (input.kind || "reported_claim") === "reported_claim",
      certainty: input.status === "ambiguous" ? 0.4 : 0.9,
      ambiguities: [],
      evidence: [],
      polarity: input.polarity || "positive",
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

function reasoningContext(items: ReturnType<typeof rankWorldEventObservations>) {
  const appraisal = appraiseRetrievedWorldState(items);
  return { appraisal, policy: deriveWorldReasoningPolicy(appraisal) };
}

describe("world-model response guard contracts", () => {
  it("cannot deny memory existence when grounded retrieval exists", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne demişti?",
      [row({ id: "a", raw: "Ali yarın istifa edeceğini söyledi", at: "2026-08-30T10:00:00.000Z" })],
      5,
    );

    const guarded = enforceWorldModelRecallResponse("Valla hatırlamıyorum, kaydım yok.", retrieved, reasoningContext(retrieved));

    expect(guarded.changed).toBe(true);
    expect(guarded.reason).toBe("world_reasoning_policy_guard");
    expect(guarded.reply).toContain("Ali yarın istifa edeceğini söyledi");
  });

  it("preserves conflict deterministically even if the model picks one side", () => {
    const retrieved = rankWorldEventObservations(
      "Ali hakkında ne biliyorsun?",
      [
        row({ id: "yes", raw: "Ali istifa edecek", at: "2026-08-30T10:00:00.000Z", polarity: "positive" }),
        row({ id: "no", raw: "Ali istifa etmeyecek", at: "2026-08-30T10:05:00.000Z", polarity: "negative" }),
      ],
      2,
    );

    expect(findWorldModelResponseIssues("Emin değilim, iki farklı şey söylemişsin.", retrieved, reasoningContext(retrieved))).toEqual([]);

    const guarded = enforceWorldModelRecallResponse("Ali istifa edecek.", retrieved, reasoningContext(retrieved));
    expect(guarded.changed).toBe(true);
    expect(guarded.issues.some((issue) => issue.code === "conflict_collapsed")).toBe(true);
    expect(guarded.reply).toMatch(/çelişen/iu);
    expect(guarded.reply).toContain("Ali istifa edecek");
    expect(guarded.reply).toContain("Ali istifa etmeyecek");
  });

  it("allows uncertainty for conflicting evidence but still forbids claiming no record exists", () => {
    const retrieved = rankWorldEventObservations(
      "Ali hakkında ne biliyorsun?",
      [
        row({ id: "yes", raw: "Ali istifa edecek", at: "2026-08-30T10:00:00.000Z", polarity: "positive" }),
        row({ id: "no", raw: "Ali istifa etmeyecek", at: "2026-08-30T10:05:00.000Z", polarity: "negative" }),
      ],
      2,
    );

    expect(findWorldModelResponseIssues("Emin değilim, iki farklı şey söylemişsin.", retrieved, reasoningContext(retrieved))).toEqual([]);

    const guarded = enforceWorldModelRecallResponse("Bununla ilgili kaydım yok.", retrieved, reasoningContext(retrieved));
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toMatch(/çelişen/iu);
  });

  it("does not allow a reported claim to lose its source attribution", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne yapacaktı?",
      [row({ id: "reported", raw: "Ali yarın istifa edecek", at: "2026-08-30T10:00:00.000Z" })],
      5,
    );

    const issues = findWorldModelResponseIssues("Ali yarın istifa edecek.", retrieved, reasoningContext(retrieved));
    expect(issues.some((issue) => issue.code === "reported_attribution_lost")).toBe(true);

    const guarded = enforceWorldModelRecallResponse("Ali yarın istifa edecek.", retrieved, reasoningContext(retrieved));
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toMatch(/Bana daha önce/iu);
  });

  it("accepts a properly qualified reported recall", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne yapacaktı?",
      [row({ id: "reported-ok", raw: "Ali yarın istifa edecek", at: "2026-08-30T10:00:00.000Z" })],
      5,
    );

    expect(findWorldModelResponseIssues("Bana daha önce Ali yarın istifa edecek demiştin.", retrieved, reasoningContext(retrieved))).toEqual([]);
  });

  it("does not invent user-source attribution for direct interaction evidence", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne yapacaktı?",
      [row({
        id: "direct",
        raw: "Ali yarın istifa edecek",
        at: "2026-08-30T10:00:00.000Z",
        kind: "direct_interaction",
      })],
      5,
    );

    const issues = findWorldModelResponseIssues("Ali yarın istifa edecek.", retrieved, reasoningContext(retrieved));
    expect(issues.some((issue) => issue.code === "reported_attribution_lost")).toBe(false);
    expect(issues.some((issue) => issue.code === "epistemic_qualifier_lost")).toBe(true);

    const guarded = enforceWorldModelRecallResponse("Ali yarın istifa edecek.", retrieved, reasoningContext(retrieved));
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toMatch(/Hatırladığım kayda göre/iu);
    expect(guarded.reply).not.toMatch(/Bana daha önce/iu);
  });

  it("accepts qualified direct interaction recall without reported attribution", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne yapacaktı?",
      [row({
        id: "direct-ok",
        raw: "Ali yarın istifa edecek",
        at: "2026-08-30T10:00:00.000Z",
        kind: "direct_interaction",
      })],
      5,
    );

    expect(findWorldModelResponseIssues("Hatırladığım kayda göre Ali yarın istifa edecek.", retrieved, reasoningContext(retrieved))).toEqual([]);
  });

  it("uses appraisal conflict posture for historical recall without projected state", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne demişti?",
      [
        row({ id: "yes-h", raw: "Ali istifa edecek", at: "2026-08-30T10:00:00.000Z", polarity: "positive" }),
        row({ id: "no-h", raw: "Ali istifa etmeyecek", at: "2026-08-30T10:05:00.000Z", polarity: "negative" }),
      ],
      2,
    );

    expect(retrieved.every((item) => item.projectedState === undefined)).toBe(true);
    expect(findWorldModelResponseIssues("Emin değilim, iki çelişen kayıt var.", retrieved, reasoningContext(retrieved))).toEqual([]);

    const guarded = enforceWorldModelRecallResponse("Hatırlamıyorum, kaydım yok.", retrieved, reasoningContext(retrieved));
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toMatch(/çelişen/iu);
  });

  it("does not force recall from ambiguous-only evidence", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne demişti?",
      [row({
        id: "amb",
        raw: "Ali bir şey söylemiş olabilir",
        at: "2026-08-30T10:00:00.000Z",
        status: "ambiguous",
      })],
      5,
    );

    const guarded = enforceWorldModelRecallResponse("Hatırlamıyorum.", retrieved, reasoningContext(retrieved));
    expect(guarded.changed).toBe(false);
  });
});