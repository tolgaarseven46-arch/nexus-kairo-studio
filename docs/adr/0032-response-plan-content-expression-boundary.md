# ADR-0032 — ResponsePlan content / expression boundary

**Status:** Accepted

## Context

The 21-turn KNT production session exposed a repair-realization failure after a hard relationship disengage. The relationship decision itself was correct: a single apology must not instantly reopen conversation, forgiveness, affection, humor, or closeness. The failure was downstream: `KairaResponsePlan.requiredContent` contained the literal token `state_boundary_and_close`, which mixed a semantic obligation (preserve the boundary) with a realization instruction (narrate state and close the turn).

A fresh production characterization on 2026-09-04 (workflow run `33868734388`) reproduced the boundary on the canonical path. After `sus orospu`, the relationship entered `disengaged`; on the following `özür`, repair progressed but the relationship remained disengaged and all hard gates stayed closed. The resulting plan still contained `requiredContent=[state_boundary_and_close,no_counter_flirt]`, and the final reply verbalized the boundary decision directly.

## Decision

1. `requiredContent` is WHAT-only. It may contain semantic obligations, not sentence-shape, state-narration, or turn-closing instructions.
2. Hard disengage projects the semantic obligation `boundary_maintained`; a softer mandatory acknowledgement projects `boundary_acknowledged`.
3. HOW is represented separately as a non-authoritative `KairaPlanProjections.expressionMode`:
   - `natural_social`
   - `firm_boundary`
   - `natural_repair`
   - `careful_repair`
4. `expressionMode` cannot create, revoke, or reopen any behavior permission. The boolean gates on `KairaResponsePlan` remain the sole WHAT/WHETHER authority.
5. The canonical realizer receives an explicit separation rule: semantic obligation labels and hard reasons are internal; it must realize their meaning naturally rather than report internal state, scores, labels, or plan rationale.

## Invariants

- Hard disengage still sets `continueConversation=false` and cannot be reopened by expression style.
- A first/incomplete repair after hard disengage does not grant forgiveness or reopening closeness.
- `natural_repair` changes HOW only; hard gates remain identical to the hard-boundary case.
- No raw-text regex or output phrase blacklist is introduced.
- No apology-specific exception weakens `hardDisengage`, forgiveness, or reopening rules.
- `state_boundary_and_close` is not a canonical semantic obligation.

## Consequences

The planner retains deterministic authority over behavior while the realizer regains freedom to express a correct boundary naturally. This removes a source of state-report speech without weakening relationship safety or introducing example-specific patches.
