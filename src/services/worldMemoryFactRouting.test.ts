import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import { buildCanonicalWorldEvent } from "./worldEventEngine";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import { enforceWorldModelRecallResponse } from "./worldModelResponseGuard";
import type { WorldEventObservation } from "./worldModelEventStore";

const query = { subjectId: "current_user.partner", attributeKey: "eye_color", confidence: 0.96 } as const;

function row(raw: string, memoryFacts: any[] = []): WorldEventObservation {
  return {
    userId: "mert",
    kairaInstanceId: "kaira_reference_001",
    sessionId: "s1",
    speakerName: "Mert",
    kind: "direct_interaction",
    status: "grounded",
    createdAt: "2026-09-05T14:00:00.000Z",
    event: {
      raw,
      eventType: "general",
      actor: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
      target: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
      reportedSpeech: false,
      certainty: 0.96,
      ambiguities: [],
      evidence: ["actor:current_speaker"],
      memoryFacts,
    },
  };
}

describe("canonical world-memory fact routing", () => {
  it("projects typed claims from SemanticInterpretation without reparsing raw text", () => {
    const base = interpretationFromRegexFloor("sarışın mavi gözlü");
    const event = projectSemanticEvent({
      ...base,
      worldMemory: {
        claims: [{ subjectId: "current_user.partner", attributeKey: "eye_color", value: "mavi", confidence: 0.97 }],
        query: null,
      },
    });
    expect(event.worldMemory?.claims[0]).toMatchObject({ attributeKey: "eye_color", value: "mavi" });
  });

  it("persists typed claims on canonical world events", () => {
    const semantic = projectSemanticEvent({
      ...interpretationFromRegexFloor("sarışın mavi gözlü"),
      worldMemory: {
        claims: [{ subjectId: "current_user.partner", attributeKey: "eye_color", value: "mavi", confidence: 0.97 }],
        query: null,
      },
    });
    const event = buildCanonicalWorldEvent("sarışın mavi gözlü", semantic, {
      speaker: { id: "current_user", name: "Mert" },
      addressee: { id: "kaira", name: "KAIRO" },
      references: [{ surface: "ben", normalized: "ben", role: "first_person", resolvedId: "current_user", resolvedName: "Mert", confidence: 1 }],
      namedPeople: [], ambiguities: [], confidence: 0.96,
    } as any);
    expect(event.memoryFacts?.[0]).toMatchObject({ subjectId: "current_user.partner", attributeKey: "eye_color", value: "mavi" });
  });

  it("makes exact typed fact identity an eligibility gate", () => {
    const wrong = row("benim manit var");
    const noise = row("tamam boşver onu sen bana bir şarkı öner rap");
    const exact = row("sarışın mavi gözlü rus asıllı 19 yaşında çok tatlı", [
      { subjectId: "current_user.partner", attributeKey: "eye_color", value: "mavi", confidence: 0.97 },
      { subjectId: "current_user.partner", attributeKey: "hair_color", value: "sarışın", confidence: 0.97 },
    ]);
    const ranked = rankWorldEventObservations("benim manitin gözleri ne renkti", [wrong, noise, exact], 5, undefined, query);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.observation.event.raw).toContain("mavi gözlü");
    expect(ranked[0]?.reasons).toContain("memory_fact:current_user.partner:eye_color");
  });

  it("deterministically restores the matched fact value if generation drifts", () => {
    const exact = row("sarışın mavi gözlü rus asıllı 19 yaşında çok tatlı", [
      { subjectId: "current_user.partner", attributeKey: "eye_color", value: "mavi", confidence: 0.97 },
    ]);
    const result = enforceWorldModelRecallResponse(
      "Hatırladığım kadarıyla sarışındı.",
      [{ observation: exact, score: 12, reasons: ["memory_fact:current_user.partner:eye_color"] }],
      {
        appraisal: { mayClaimNoMemory: false } as any,
        policy: { mayAnswerFromMemory: true, mustQualify: true, mustPreserveConflict: false, mustPreserveReportedAttribution: false } as any,
        memoryQuery: query,
      },
    );
    expect(result.changed).toBe(true);
    expect(result.reply).toBe("Hatırladığım kayda göre: mavi.");
    expect(result.issues.map((issue) => issue.code)).toContain("memory_fact_value_missing");
  });
});
