/**
 * ADR-0006 PR3 — CANONICAL_PROMPT_BUILDER unit contracts.
 *
 * The canonical behavior block is the ONLY WHAT/WHETHER surface: every
 * authoritative KairaResponsePlan field appears exactly once, a strong
 * realizer-lockdown clause is present, and none of the legacy authority strings
 * leak into it.
 */

import { describe, expect, it } from "vitest";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  buildCanonicalBehaviorBlock,
  buildCanonicalObservationalContext,
  buildCanonicalDialogueMoveContext,
} from "./kairaCanonicalPromptBuilder";

const plan = (o: Partial<KairaResponsePlan> = {}): KairaResponsePlan => ({
  move: "continue_conversation" as KairaResponsePlan["move"],
  stance: "open",
  register: "casual",
  relationshipLevel: "familiar",
  continueConversation: true,
  allowQuestion: true,
  allowHumor: true,
  allowAffection: false,
  allowForgiveness: false,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 32,
  emojiBudget: 1,
  reasons: [],
  resolver: "canonical",
  flirtationAllowed: false,
  counterFlirtAllowed: false,
  opennessAxis: 0.7,
  warmthAxis: 0.6,
  guardedness: 0.3,
  intimacyCeiling: 0.25,
  requiredContent: ["no_counter_flirt"],
  hardReasons: ["flirtation_forbidden_by_character_policy"],
  uncertainty: { semantic: 0.4, relational: 0.35 },
  projections: {
    toneProjection: "warm-open",
    register: "casual",
    stance: "open",
    relationshipLevel: "familiar",
    expressionMode: "natural_social",
  },
  ...o,
});

const AUTHORITATIVE_FIELDS = [
  "move=",
  "continueConversation=",
  "allowQuestion=",
  "allowHumor=",
  "allowAffection=",
  "allowForgiveness=",
  "allowReopeningCloseness=",
  "flirtationAllowed=",
  "counterFlirtAllowed=",
  "maxSentences=",
  "maxWords=",
  "emojiBudget=",
  "opennessAxis=",
  "warmthAxis=",
  "guardedness=",
  "intimacyCeiling=",
  "requiredContent=",
  "hardReasons=",
  "uncertainty=",
];

const occurrences = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

describe("canonical behavior block", () => {
  it("represents every authoritative field exactly once", () => {
    const block = buildCanonicalBehaviorBlock(plan());
    for (const field of AUTHORITATIVE_FIELDS) {
      expect(occurrences(block, field), `${field} should appear exactly once`).toBe(1);
    }
  });

  it("carries a realizer-lockdown clause", () => {
    const block = buildCanonicalBehaviorBlock(plan());
    expect(block).toMatch(/REALIZER KİLİDİ/);
    expect(block).toMatch(/Planı genişletemez, gevşetemez, tersine çeviremez/);
    expect(block).toMatch(/yalnızca NASIL/);
  });

  it("does not leak legacy authority strings", () => {
    const block = buildCanonicalBehaviorBlock(plan());
    expect(block).not.toContain("DAVRANIŞ SÖZLEŞMESİ (BAĞLAYICI)");
    expect(block).not.toContain("Bu davranış kararları bağlayıcıdır");
    expect(block).not.toContain("Takip sorusu:");
    expect(block).not.toContain("Uzunluk bütçesi:");
  });

  it("prints forbidden gates as 'yasak' / 'hayır', not as a soft hint", () => {
    const block = buildCanonicalBehaviorBlock(
      plan({ allowQuestion: false, allowHumor: false, allowAffection: false }),
    );
    expect(block).toContain("allowQuestion=yasak");
    expect(block).toContain("allowHumor=yasak");
    expect(block).toContain("allowAffection=yasak");
  });

  it("keeps semantic obligations separate from non-authoritative HOW projection", () => {
    const block = buildCanonicalBehaviorBlock(plan({
      requiredContent: ["boundary_maintained", "no_counter_flirt"],
      projections: {
        toneProjection: "closed",
        register: "hurt",
        stance: "closed",
        relationshipLevel: "new",
        expressionMode: "natural_repair",
      },
    }));
    expect(block).toContain("requiredContent=boundary_maintained, no_counter_flirt");
    expect(block).not.toContain("state_boundary_and_close");
    expect(block).toContain("HOW_PROJECTION.expressionMode=natural_repair (GÖZLEMSEL — KARAR DEĞİL)");
    expect(block).toMatch(/requiredContent yalnızca ANLAMSAL yükümlülüktür/);
    expect(block).toMatch(/iç state'i, skorları veya plan gerekçesini kullanıcıya raporlama/);
    expect(block).toMatch(/Özrü doğal bir sosyal tepki olarak karşıla/);
  });

  it("emits the absolute counter-flirt ban whenever counterFlirtAllowed is not true", () => {
    const banned = buildCanonicalBehaviorBlock(plan({ counterFlirtAllowed: false }));
    expect(banned).toContain("counterFlirtAllowed=hayır");
    expect(banned).toMatch(/KARŞI-FLÖRT MUTLAK YASAK/);
    expect(banned).toMatch(/register.*veya ton bu sınırı açamaz/);

    const undecl = buildCanonicalBehaviorBlock(plan({ counterFlirtAllowed: undefined }));
    expect(undecl).toContain("counterFlirtAllowed=hayır");
    expect(undecl).toMatch(/KARŞI-FLÖRT MUTLAK YASAK/);
  });

  it("degrades safely without PLAN_RESOLVER_V2 fields (flirtation still forbidden)", () => {
    const legacyShaped = plan({
      flirtationAllowed: undefined,
      counterFlirtAllowed: undefined,
      opennessAxis: undefined,
      warmthAxis: undefined,
      guardedness: undefined,
      intimacyCeiling: undefined,
      requiredContent: undefined,
      hardReasons: undefined,
      uncertainty: undefined,
      projections: undefined,
    });
    const block = buildCanonicalBehaviorBlock(legacyShaped);
    expect(block).toContain("flirtationAllowed=hayır");
    expect(block).toContain("counterFlirtAllowed=hayır");
    expect(block).toContain("opennessAxis=n/a");
    expect(block).toContain("HOW_PROJECTION.expressionMode=natural_social");
    expect(block).toMatch(/KARŞI-FLÖRT MUTLAK YASAK/);
  });
});

describe("observational context is not a decision surface", () => {
  it("has no gate verbs and defers to the plan", () => {
    const ctx = buildCanonicalObservationalContext({
      intent: "soru",
      sentiment: "nötr",
      warmth: 60,
      trust: 55,
      conflict: 0,
      hurt: 0,
      reactionMode: "neutral",
    });
    expect(ctx).toContain("GÖZLEMSEL — KARAR DEĞİL");
    expect(ctx).not.toContain("bağlayıcı");
    expect(ctx).not.toContain("ihlal etme");
    expect(ctx).not.toMatch(/yasak/);
    expect(ctx).toMatch(/izinler yalnızca KAIRA DAVRANIŞ PLANI'ndadır/);
  });

  it("dialogue move context drops the question / length / emoji gates", () => {
    const mv = buildCanonicalDialogueMoveContext("join_banter", undefined, "kullanıcı şaka yaptı");
    expect(mv).toContain("GÖZLEMSEL — KARAR DEĞİL");
    expect(mv).not.toContain("Takip sorusu:");
    expect(mv).not.toContain("Kelime bütçesi:");
    expect(mv).toMatch(/KAIRA DAVRANIŞ PLANI'ndadır/);
  });
});
