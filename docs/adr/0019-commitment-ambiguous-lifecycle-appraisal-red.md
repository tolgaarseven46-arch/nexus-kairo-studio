# ADR 0019: Commitment Ambiguous-Lifecycle Appraisal RED

- Status: In validation (PR #248)
- Date: 2026-09-13

## Context

`resolvePlanLifecycle()` correctly fails closed to `unknown` when a proven commitment generation has temporally indistinguishable conflicting terminal outcomes. `buildSocialAppraisalCommitmentContext()` preserves the canonical generation and projects its lifecycle as `state: "unknown"`.

The current betrayal matcher first asks whether any projected commitment has `state: "active"`. As a result, an evidenced same-actor/same-scope/Kaira commitment whose *current lifecycle* is unresolved is collapsed to `betrayal: absent` / `betrayal:no-active-prior-commitment`.

That loses an important distinction: there is evidence that the prior commitment existed, but insufficient temporal evidence to prove whether it was still active at the alleged violation. Treating this as `absent` is stronger than the canonical lifecycle evidence supports.

## Decision under test

1. `resolvePlanLifecycle()` remains the sole lifecycle authority; SocialAppraisal must not re-resolve or infer lifecycle from raw observations.
2. A projected commitment with canonical `state: "unknown"` must never produce `betrayal: present`.
3. When the unknown-lifecycle commitment otherwise matches the canonical current-turn actor, scope, and Kaira counterparty, betrayal must fail closed to `unknown`, not collapse to `absent`.
4. Definitively active, fulfilled, cancelled, failed, party-mismatched, scope-mismatched, and counterparty-mismatched cases retain their existing semantics.
5. No provider/API call, raw-text reparse, synthetic timestamp tie-breaker, or second memory/lifecycle authority is introduced.

## RED proof

`socialAppraisalCommitmentAmbiguousLifecycleRegression.test.ts` constructs a canonical prior commitment plus same-timestamp conflicting `executed` and `cancelled` outcomes. The world-lifecycle authority resolves the generation to `unknown`; the test then asserts that the appraisal boundary preserves epistemic uncertainty as `betrayal.status === "unknown"` with zero confidence.

On the pre-fix implementation the matcher returns `absent`, characterizing the measured boundary failure.

## Intended minimal seam

If the RED is confirmed, the fix belongs in the SocialAppraisal commitment matcher: detect a matching projected `state: "unknown"` before concluding that no active prior commitment exists. The matcher may preserve uncertainty, but must not reinterpret lifecycle evidence or upgrade it to active.
