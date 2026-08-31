import { describe, expect, it } from "vitest";
import type { AffectiveReactionMode, ReasoningTrace } from "../types/nexus";
import { enforceKairoResponse, validateKairoResponse } from "./kairoResponseConsistency";

const traceFor = (reactionMode: AffectiveReactionMode): ReasoningTrace => ({
  whoSent: {
    userName: "Kullanıcı",
    isNewUser: false,
    recognitionText: "Tanıdık kullanıcı",
  },
  relationship: {
    warmthScore: 80,
    warmthLabel: "Sıcak",
    note: "Yakın ilişki",
    familiarityDays: 30,
    interactionCount: 60,
    toleranceMultiplier: 0.6,
    trustScore: 80,
    conflictScore: 6,
    hurtScore: 8,
    repairProgress: reactionMode === "repairing" ? 15 : 0,
    repeatedNegativeCount: 1,
    conversationState: reactionMode === "withdrawn" ? "distancing" : "active",
    repairAttempts: reactionMode === "repairing" ? 1 : 0,
  },
  currentMood: {
    moodText: reactionMode,
    reasonText: "Nitel tepki characterization",
    reactionMode,
  },
  messageInterpretation: {
    intent: reactionMode === "repairing" ? "özür_ve_telafi" : "genel_sohbet",
    sentiment: "nötr",
    explanation: "test",
  },
  decision: {
    chosenTone: reactionMode === "irritated" || reactionMode === "withdrawn" ? "firm" : "calm",
    explanation: "test",
  },
  memoryUpdate: {
    warmthBefore: 80,
    warmthAfter: 80,
    warmthDelta: 0,
    moodChange: reactionMode,
    reason: "test",
  },
});

const issue = "Yanıt nitel tepki durumuyla çelişen sosyal yakınlık/onarım tonu içeriyor";

describe("affective reaction response consistency", () => {
  it("rejects over-familiar banter for low-score hurt even below unresolved-damage thresholds", () => {
    const result = validateKairoResponse("hahaha kanka sorun yok ya", traceFor("hurt"));
    expect(result.accepted).toBe(false);
    expect(result.issues).toContain(issue);
    expect(result.checks.qualitativeReactionTone).toBe(false);
  });

  it("rejects over-familiar social language while irritated", () => {
    const result = validateKairoResponse("gel sarılalım kanka 😏", traceFor("irritated"));
    expect(result.issues).toContain(issue);
  });

  it("rejects reopening language while withdrawn", () => {
    const result = validateKairoResponse("hadi konuşalım, anlat bakalım", traceFor("withdrawn"));
    expect(result.issues).toContain(issue);
  });

  it("rejects premature forgiveness closure while repairing", () => {
    const result = validateKairoResponse("sorun yok, geçti gitti", traceFor("repairing"));
    expect(result.issues).toContain(issue);
  });

  it("allows a restrained reply that matches hurt HOW", () => {
    const result = validateKairoResponse("tamam, duydum", traceFor("hurt"));
    expect(result.issues).not.toContain(issue);
    expect(result.checks.qualitativeReactionTone).toBe(true);
  });

  it("does not impose qualitative restrictions in neutral mode", () => {
    const result = validateKairoResponse("aynen kanka hahaha", traceFor("neutral"));
    expect(result.issues).not.toContain(issue);
    expect(result.checks.qualitativeReactionTone).toBe(true);
  });

  it("removes only contradictory HOW markers while preserving factual content at final delivery", () => {
    const enforced = enforceKairoResponse("Maç 20.00'de kanka hahaha", traceFor("hurt"));
    expect(enforced.reply).toContain("Maç 20.00'de");
    expect(enforced.reply).not.toMatch(/kanka|hahaha/i);
    expect(enforced.reasons).toContain("qualitative_reaction_how_enforced");
  });

  it("uses a narrow mode fallback when contradictory repairing language is all that remains", () => {
    const enforced = enforceKairoResponse("sorun yok geçti gitti", traceFor("repairing"));
    expect(enforced.reply).toBe("özrünü duydum");
    expect(enforced.reasons).toContain("qualitative_reaction_how_enforced");
  });

  it("removes social reopening language while withdrawn without changing neutral mode output", () => {
    const withdrawn = enforceKairoResponse("hadi konuşalım, dosya burada", traceFor("withdrawn"));
    const neutral = enforceKairoResponse("aynen kanka hahaha", traceFor("neutral"));

    expect(withdrawn.reply).not.toContain("hadi konuşalım");
    expect(withdrawn.reply).toContain("dosya burada");
    expect(neutral.reply).toBe("aynen kanka hahaha");
  });
});
