# ADR 0019: Commitment Ambiguous-Lifecycle Appraisal RED

- Status: Accepted (PR #248 merged)
- Date: 2026-09-13

## Context

`resolvePlanLifecycle()` correctly fails closed to `unknown` when a proven commitment generation has temporally indistinguishable conflicting terminal outcomes. `buildSocialAppraisalCommitmentContext()` preserves the canonical generation and projects its lifecycle as `state: "unknown"`.

Before PR #248, the betrayal matcher first asked whether any projected commitment had `state: "active"`. As a result, an evidenced same-actor/same-scope/Kaira commitment whose current lifecycle was unresolved collapsed to `betrayal: absent` / `betrayal:no-active-prior-commitment`.

That lost an important distinction: the prior commitment existed, but temporal evidence was insufficient to prove whether it was still active at the alleged violation. Treating this as `absent` was stronger than the canonical lifecycle evidence supported.

## Decision

1. `resolvePlanLifecycle()` remains the sole lifecycle authority; SocialAppraisal does not re-resolve or infer lifecycle from raw observations.
2. A projected commitment with canonical `state: "unknown"` never produces `betrayal: present`.
3. When the unknown-lifecycle commitment otherwise matches the canonical current-turn actor, scope, and Kaira counterparty, betrayal fails closed to `unknown`, not `absent`.
4. Definitively active, fulfilled, cancelled, failed, party-mismatched, scope-mismatched, and counterparty-mismatched cases retain their existing semantics.
5. No provider/API call, raw-text reparse, synthetic timestamp tie-breaker, or second memory/lifecycle authority is introduced.

## RED → GREEN proof

`socialAppraisalCommitmentAmbiguousLifecycleRegression.test.ts` constructs a canonical prior commitment plus same-timestamp conflicting `executed` and `cancelled` outcomes. The world-lifecycle authority resolves the generation to `unknown`; the regression asserts that the appraisal boundary preserves epistemic uncertainty as `betrayal.status === "unknown"` with zero confidence.

The pre-fix implementation returned `absent`. PR #248 changed only the SocialAppraisal commitment matcher so a matching projected `state: "unknown"` is preserved before the matcher concludes that no active prior commitment exists. The matcher does not reinterpret lifecycle evidence or upgrade it to active.

PR #248 merged to `main` as `44e7c237e17cfd780074f217c40cb118c7ab59fd` after CI and Architecture Review passed.
