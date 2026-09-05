from pathlib import Path

p = Path('src/services/kairaPlanResolver.ts')
s = p.read_text()
old = '''  if (!counterFlirtAllowed) requiredContent.push("no_counter_flirt");\n\n  if (cautious >= 0.6) rationale.push(`uncertainty_damping applied (cautious=${cautious.toFixed(2)})`);'''
new = '''  if (!counterFlirtAllowed) requiredContent.push("no_counter_flirt");\n  const preserveAmbiguity =\n    dialogue.move === "natural_reaction" &&\n    !dialogue.allowSpeculation &&\n    uncertainty.semantic >= 0.75;\n  if (preserveAmbiguity) {\n    requiredContent.push("preserve_ambiguity");\n    rationale.push("opaque_turn:preserve_ambiguity");\n  }\n\n  if (cautious >= 0.6) rationale.push(`uncertainty_damping applied (cautious=${cautious.toFixed(2)})`);'''
assert old in s
p.write_text(s.replace(old, new, 1))

p = Path('src/services/kairaResponsePlan.ts')
s = p.read_text()
old = '''    plan.counterFlirtAllowed === true\n      ? ""\n      : "Karşı-flört YASAK: kullanıcı flört etse/teklif etse bile Kaira flörte karşılık vermez, romantik/cinsel ima başlatmaz. Sıcak veya esprili olabilir; flörtü nazikçe geçiştirir. Bu sınır güven/yakınlık/geçmiş ilişki/tona bakılmaksızın mutlaktır.",\n    "Bu plan WHAT/WHETHER kararlarında bağlayıcıdır. Konuşma kimliği yalnızca HOW üretir; planı genişletemez veya tersine çeviremez.",'''
new = '''    plan.counterFlirtAllowed === true\n      ? ""\n      : "Karşı-flört YASAK: kullanıcı flört etse/teklif etse bile Kaira flörte karşılık vermez, romantik/cinsel ima başlatmaz. Sıcak veya esprili olabilir; flörtü nazikçe geçiştirir. Bu sınır güven/yakınlık/geçmiş ilişki/tona bakılmaksızın mutlaktır.",\n    plan.requiredContent?.includes("preserve_ambiguity")\n      ? "BELİRSİZLİK KORUMA ZORUNLULUĞU: Bu turdaki kullanıcı mesajının anlamı güvenilir biçimde çözülemedi. Mesajı hakaret, öfke, susturma, vedalaşma, yakınlaşma veya başka belirli bir niyetmiş gibi TAMAMLAMA. Yalnızca nötr kısa bir kabul/tereddüt üret; açık olmayan anlamı uydurma."\n      : "",\n    "Bu plan WHAT/WHETHER kararlarında bağlayıcıdır. Konuşma kimliği yalnızca HOW üretir; planı genişletemez veya tersine çeviremez.",'''
assert old in s
p.write_text(s.replace(old, new, 1))

Path('src/services/kairaAmbiguityPreservation.ts').write_text(r'''import type { KairaResponsePlan } from "./kairaResponsePlan";

const MINIMAL_NEUTRAL_ACK_RE =
  /^\s*(?:(?:h+e+|h+m+|hı+m+|tamam(?:dır)?|peki|olur|anladım|he\s+anladım|hmm\s+anladım|okey|okay|hıhı|ııh)[.!…]*)\s*$/iu;
const EXPLICIT_UNCERTAINTY_RE =
  /^\s*(?:(?:tam|pek)?\s*(?:anlamadım|çözemedim)|ne\s+demek\s+istediğini\s+anlamadım|bundan\s+emin\s+değilim)[.!…]*\s*$/iu;

export function requiresAmbiguityPreservation(plan: KairaResponsePlan): boolean {
  return Boolean(plan.requiredContent?.includes("preserve_ambiguity"));
}

export function findKairaAmbiguityPreservationIssues(
  reply: string,
  plan: KairaResponsePlan,
): string[] {
  if (!requiresAmbiguityPreservation(plan)) return [];
  const text = String(reply ?? "").trim();
  if (!text) return ["response_plan_ambiguity_not_preserved"];
  if (MINIMAL_NEUTRAL_ACK_RE.test(text) || EXPLICIT_UNCERTAINTY_RE.test(text)) return [];
  return ["response_plan_ambiguity_not_preserved"];
}
''')

p = Path('src/services/kairaResponseConstraintPass.ts')
s = p.read_text()
old_import = '''import {\n  enforceKairaEpistemicResponse,\n  findKairaEpistemicResponseIssues,\n  type KairaEpistemicEnforcementResult,\n} from "./kairaEpistemicResponsePolicy";\n'''
new_import = old_import + 'import { findKairaAmbiguityPreservationIssues } from "./kairaAmbiguityPreservation";\n'
assert old_import in s
s = s.replace(old_import, new_import, 1)
old_issues = '''    ...findKairaResponsePlanIssues(delivered, input.plan),\n    ...findWorldModelResponseIssues(delivered, input.worldItems, input.worldContext).map('''
new_issues = '''    ...findKairaResponsePlanIssues(delivered, input.plan),\n    ...findKairaAmbiguityPreservationIssues(delivered, input.plan),\n    ...findWorldModelResponseIssues(delivered, input.worldItems, input.worldContext).map('''
assert old_issues in s
p.write_text(s.replace(old_issues, new_issues, 1))

Path('src/services/kairaAmbiguityPreservation.test.ts').write_text(r'''import { describe, expect, it } from "vitest";
import { findKairaAmbiguityPreservationIssues } from "./kairaAmbiguityPreservation";

const plan = (preserve = true) => ({
  move: "natural_reaction", stance: "open", register: "balanced", relationshipLevel: "new",
  continueConversation: true, allowQuestion: false, allowHumor: true, allowAffection: false,
  allowForgiveness: true, allowReopeningCloseness: true, maxSentences: 2, maxWords: 28, emojiBudget: 1,
  reasons: [], requiredContent: preserve ? ["preserve_ambiguity"] : [],
}) as any;

describe("Kaira ambiguity-preservation validator", () => {
  it.each(["hmm", "he anladım", "anladım", "tam anlamadım"])("accepts ambiguity-preserving reply: %s", (reply) => {
    expect(findKairaAmbiguityPreservationIssues(reply, plan())).toEqual([]);
  });

  it.each([
    "hahayt aniden sert döndün",
    "hahahah tamam sustum 😄",
    "hoş değil o laf ama 🤨",
    "bi an ne diyeceğini merak ettim... peki, sustum 😄",
  ])("rejects a fabricated interpretation from the production trace: %s", (reply) => {
    expect(findKairaAmbiguityPreservationIssues(reply, plan())).toContain("response_plan_ambiguity_not_preserved");
  });

  it("does nothing when the canonical plan did not require ambiguity preservation", () => {
    expect(findKairaAmbiguityPreservationIssues("sert döndün", plan(false))).toEqual([]);
  });
});
''')

Path('src/services/kairaOpaqueTurnAmbiguityRegression.test.ts').write_text(r'''import { describe, expect, it } from "vitest";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";
import { findKairaAmbiguityPreservationIssues } from "./kairaAmbiguityPreservation";

function resolved(semantic: number, move = "natural_reaction") {
  return resolveKairaResponsePlan({
    hard: {
      hardDisengage: false, hardDisengageReason: null, mustAcknowledgeBoundary: false,
      flirtingAllowed: false, counterFlirtAllowed: false, acceptsSlurBanter: false, epistemicHonesty: true,
      intimacyCeiling: 0.25, questionAllowed: true, humorAllowed: true, affectionAllowed: true,
      forgivenessAllowed: true, reopeningClosenessAllowed: true, maxSentences: 2, maxWords: 32, emojiBudget: 1, reasons: [],
    },
    soft: {
      opennessTendency: 0.8, warmthTendency: 0.65, guardedness: 0.2, humorInclination: 0.5,
      questionDrive: 0.5, intimacyInclination: 0.25, verbosityTendency: 0.7, rationale: [],
    },
    dialogue: {
      move, allowFollowUpQuestion: false, allowSpeculation: false, maxSentences: 2,
      hasSupportedTargetClaim: false, reason: "test",
    } as any,
    speech: { register: "balanced", relationshipLevel: "new", emojiLevel: 10 } as any,
    contract: { stance: "open", repairStatus: "complete", semanticUncertainty: semantic } as any,
  });
}

describe("opaque-turn ambiguity golden regression", () => {
  it("makes ambiguity preservation a canonical plan obligation for high-uncertainty natural reactions", () => {
    const result = resolved(0.85);
    expect(result.requiredContent).toContain("preserve_ambiguity");
    const plan = { ...result, move: "natural_reaction" } as any;
    expect(findKairaAmbiguityPreservationIssues("hahahah tamam sustum 😄", plan)).toContain(
      "response_plan_ambiguity_not_preserved",
    );
    expect(findKairaAmbiguityPreservationIssues("hmm", plan)).toEqual([]);
  });
  it("does not invent the obligation at normal semantic confidence", () => {
    expect(resolved(0.3).requiredContent).not.toContain("preserve_ambiguity");
  });
  it("does not widen the obligation onto a non-natural-reaction move", () => {
    expect(resolved(0.9, "grounded_recall").requiredContent).not.toContain("preserve_ambiguity");
  });
});
''')

Path('docs/adr/0019-opaque-turn-ambiguity-preservation.md').write_text('''# ADR-0019: Opaque current turns require ambiguity-preserving realization

## Status
Accepted

## Context
A five-run production trace after semantic context-non-invention showed the canonical current-turn semantics remaining neutral/opaque with semantic uncertainty around 0.80–0.85, while the realizer still produced unsupported interpretations such as `aniden sert döndün`, `tamam sustum`, and `hoş değil o laf`. DialogueDecision and ResponsePlan did not contain those premises, and final consistency accepted them.

## Decision
PlanResolver owns a new hard content obligation label, `preserve_ambiguity`, for high-uncertainty (`semantic >= 0.75`) `natural_reaction` turns where DialogueDecision forbids speculation. The realizer receives that obligation explicitly.

A separate named output-conformance validator checks only this plan-owned obligation. It is not a behavior authority: it cannot decide when ambiguity must be preserved, and it cannot widen or narrow ResponsePlan. Under this obligation, the delivered reply must stay a minimal neutral acknowledgement or explicit uncertainty statement rather than committing to a new interpretation of the user's opaque turn.

This intentionally modularizes the canonical final-delivery boundary instead of adding more semantic heuristics to `kairaResponsePlan.ts`.

## Consequences
- Opaque/high-uncertainty current turns cannot be realized as invented hostility, stop requests, or other specific premises.
- Low-uncertainty turns and non-`natural_reaction` moves are unchanged.
- The validator is a contract checker, not a second WHAT/WHETHER authority.
- Future richer lexical-grounding provenance may replace this bounded obligation, but the production trust failure is closed now without an `sg`-specific rule.
''')
