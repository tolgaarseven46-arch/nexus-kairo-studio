# Kaira Phase 0 — Authority Audit Pass 1

This pass resolves initial TBD rows using real implementation evidence. No runtime code changes are made.

## Finding A — Controlled Spontaneity triggers mechanical architecture review

**Status:** RED / structural finding

`kairaControlledSpontaneity.ts` calls `interpretSemanticEvent(text)` over prior raw user-turn text while selecting a safe topic candidate.

That means the subsystem is not merely a HOW projection. It performs downstream semantic reinterpretation of historical raw text in order to choose whether/what prior topic can be nudged.

This crosses two frozen rules:
1. raw text should not create a competing semantic truth downstream of the canonical language-understanding gateway;
2. a post-ResponsePlan subsystem should not silently acquire independent WHAT selection authority.

The emitted instruction correctly says it is not permission authority and explicitly preserves ResponsePlan question/budget constraints. That is positive, but it does not remove the upstream raw-text reinterpretation concern.

**Classification:** STRUCTURAL / `authority-contract` + `compound-interaction` trigger.

**Mechanical consequence:** architecture red-team is mandatory before Phase 1 fix design.

**Do not patch in Phase 0.** Phase 0 only records the owning seam and counterexample.

Counterexample:
> A prior user turn has a canonical semantic interpretation that was corrected/reconciled by the language gateway, but Controlled Spontaneity reparses only its raw text with the legacy semantic event interpreter and selects it as a “safe prior topic.” The nudge can then be based on semantics that the canonical gateway had already rejected or corrected.

Likely owner seam to evaluate in Phase 1:
- Discourse/session-history typed evidence or a typed prior-topic projection, not raw historical reparsing inside spontaneity.

---

## Finding B — Local Language Engine is realization-only by design

**Status:** GREEN conceptually; targeted contract proof still belongs to Phase 1.

`kairoLocalLanguageEngine.ts` explicitly states and implements:
- no local intent reclassification,
- trivial routine comes from shared `SemanticEvent`,
- dialogue move must already permit a trivial render,
- pending discourse dependency blocks local rendering,
- `ResponsePlan` permissions are consumed,
- local logic may narrow but may not reopen the plan.

It still normalizes the raw surface string for reply-selection mechanics, but this normalization is not used to manufacture canonical intent.

**Authority classification:** REALIZATION / HOW+surface selection under existing plan; not a WHAT authority.

**Phase 1 need:** mechanical contract test that local output cannot widen plan permissions.

---

## Finding C — Forgiveness is staged refinement, not yet proven duplication

**Status:** GREEN ownership model, pending documentation freeze.

Observed pipeline:

```text
Relationship/KDM state
  -> BehaviorContract.forgivenessGranted
  -> HardConstraintSet.forgivenessAllowed
  -> PlanResolver allowForgiveness
  -> KairaResponsePlan.allowForgiveness
```

`BehaviorContract` expresses whether forgiveness is granted by current relationship/conversation state.
`deriveHardConstraints` converts that into a hard admissibility gate and blocks it for focused dialogue/disengagement.
`PlanResolver` produces the final turn-level permission using the hard gate plus soft openness.

This is not two independent owners calculating the same boolean from unrelated sources.

**Frozen interpretation:**
- relationship/state eligibility owner: BehaviorContract/KDM-derived state,
- hard deontic gate owner: HardConstraints,
- final WHAT/WHETHER permission owner: KairaResponsePlan via PlanResolver.

This staged refinement pattern should be documented and checked for other duplicated-looking fields before declaring them complexity smells.

---

## Finding D — Deterministic fallback is mostly plan-preserving but has legacy interpretation surfaces

**Status:** PARTIAL / requires second pass.

`buildGroundedDialogueFallback` consumes the already-selected `DialogueDecisionPlan`, effective question permission and relational fallback. For most moves it maps the existing move to a deterministic utterance.

Positive:
- no independent dialogue move is selected inside the fallback,
- question permission is passed in,
- relational response can be supplied from the ResponsePlan-owned social move fallback.

Open surfaces:
- banter fallback varies wording using a raw-message regex,
- grounded recall rebuilds a claim ledger from history/current analysis; historical paths may contain legacy semantic fallbacks.

These may be realization/provenance mechanics rather than new authority, but they require explicit audit before classification is frozen.

---

## Finding E — Repair path preserves the original system prompt but appends an untyped repair directive

**Status:** STRUCTURAL-CHECK / not yet a confirmed second authority.

Production repair generation reuses the same final `system` prompt and appends a `DÜZELTME KAPISI` instruction describing rejected issues and telling the model to fix only those errors.

This is directionally plan-preserving, but the repair directive is an untyped natural-language prompt extension created after final prompt assembly.

Therefore:
- it is not covered by typed prompt authority metadata (which does not exist yet),
- it must be included in Phase 1 prompt-authority hardening,
- Phase 0 should classify it as `repair realization`, expected to preserve WHAT/WHETHER decisions.

No Phase 0 runtime patch is allowed.
