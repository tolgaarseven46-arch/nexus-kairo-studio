# Kaira Phase 0 — Mandatory Architecture Red-Team Trigger

This review is mandatory under Fast-Discipline because the Phase 0 audit found both `authority-contract` and `compound-interaction` trigger classes.

## Do not propose patches first
The purpose is to classify ownership and authority before Phase 1 implementation.

## Confirmed findings

### T1 — Controlled Spontaneity reparses raw historical text
`kairaControlledSpontaneity.ts` uses `interpretSemanticEvent(text)` on prior user turns to decide whether a prior topic is safe for a spontaneous nudge.

Risk:
- downstream semantic reinterpretation after canonical language understanding,
- post-ResponsePlan component selects additional content/behavior.

Counterexample:
A prior turn was reconciled/corrected by canonical semantics, but spontaneity later reparses the raw surface differently and resurrects it as a safe topic.

### T2 — SpeechIdentity is not strictly HOW-only
The HOW block contains instructions equivalent to:
- do not reopen closeness while withdrawn,
- do not declare the relationship fully repaired while repairing.

These are valid meanings but appear to overlap ResponsePlan/BehaviorContract WHAT decisions.

### T3 — Production Dialogue Board contains behavior authority
`buildDialogueBoardInstruction()` tells the realizer to:
- choose a social move,
- ask clarification for important ambiguity.

The Phase-0 harness does not serialize this full production block in its simplified dialogue slot, so prior green Phase-0 results do not prove this production surface is clean.

### T4 — `server.ts` socialStyle mixes HOW and behavior policy
Inline rules include style, response formatting, question habits, advice/problem-solving behavior and memory-surfacing behavior.

The canonical owner of each rule is not explicit.

### T5 — Repair is a post-assembly untyped authority surface
Provider repair reuses the original system prompt but appends a natural-language `DÜZELTME KAPISI` directive after the final serializer.

Expected role: realization repair only.
Current enforcement: convention/string, not typed authority.

### T6 — Grounding policy reparses raw conversation text
`buildKairoGroundingInstruction()` uses raw history/current text regexes to detect uncertainty and judgment conditions.

This is primarily semantic/provenance risk rather than a social-WHAT conflict, but it violates the architectural preference that downstream layers consume canonical semantic evidence rather than create a new raw-text interpretation.

### T7 — Prompt parts cannot express authority type
`KairaFinalProviderPromptParts` remains a collection of string fields. The type system cannot distinguish behavior authority, epistemic authority, evidence, HOW, identity grounding or assembly.

This is the confirmed structural root that allows T2–T5 to exist without compile-time/contract resistance.

## Findings that were investigated and did NOT become structural bugs

### Local Language Engine
Conceptually realization-only. It consumes shared SemanticEvent, DialogueDecision and ResponsePlan; it does not locally classify intent. Mechanical no-widening proof is still useful.

### Forgiveness duplication suspicion
Not independent duplicate ownership. Current path is staged refinement:
`KDM/relationship -> BehaviorContract -> HardConstraints -> PlanResolver -> ResponsePlan`.

### Autonomous activity permission
No canonical reply bypass. Permission prompt is structured UI data; reply composer returns the original reply unchanged.

## Questions for Claude

1. Is T1 fundamentally an authority bug, a semantic-provenance bug, or both? Which existing owner should provide the typed prior-topic evidence?
2. For T2, which constraints are legitimately HOW and which belong exclusively in ResponsePlan/HardConstraints?
3. For T3, should Dialogue Board become pure evidence while DialogueDecision remains the only move owner, or is a different boundary needed?
4. For T4, split the `socialStyle` rules by canonical owner. Which belong to global character policy, Speech/HOW, ResponsePlan, Epistemic policy, or nowhere?
5. For T5, what is the minimal authority contract for repair that guarantees it may fix realization but never reopen WHAT/WHETHER permissions?
6. For T6, can raw lexical retrieval remain for evidence ranking while semantic conclusions must come from typed canonical fields? Draw that boundary precisely.
7. Does the updated Authority Graph still miss any provider-facing authority surface?
8. Which of these findings can share one Phase 1 structural solution and which require separate PRs? Avoid creating a new framework if typed prompt blocks + owner cleanup are enough.
9. Identify any finding that looks scary but should NOT be fixed because current ownership is already correct.
10. Give a Phase 1 PR order that minimizes rework and preserves Fast-Discipline one-owning-seam-per-PR.

## Required output format
For T1–T7 return:
- classification: `real structural gap | evidence gap | test gap | acceptable by design`
- canonical owner
- forbidden duplicate owner(s)
- smallest correct Phase 1 change class (not implementation)
- prerequisite/dependency
- counterexample that proves the classification

Then provide a proposed Phase 1 PR sequence and identify the first PR only. Do not design all fixes in detail yet.
