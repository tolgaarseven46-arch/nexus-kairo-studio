# ADR-0012: Canonical behavior authority promotion / compatibility removal

- **Status:** Proposed
- **Date:** 2026-09-03
- **Parent:** ADR-0006, ADR-0011

## Context

ADR-0006 introduced five temporary rollout flags so the canonical behavior architecture could be proven without destroying the pre-existing path. ADR-0011/PR #33 completed the evidence gate: canonical beta acceptance, recorded-session replay, explicit all-flags-OFF rollback and same-input canonical-vs-legacy diff review passed on a fresh checkout.

The flags were never intended to become configuration. ADR-0006 explicitly assigns every flag to PR5 for removal and states that post-PR5 rollback is repository-level `git revert`.

## Decision

PR5 removes the rollout registry and every behavior-decision branch controlled by:

- `SEMANTIC_SCHEMA_V2`
- `RELATIONSHIP_REDUCER_V2`
- `PLAN_RESOLVER_V2`
- `CANONICAL_PROMPT_BUILDER`
- `UNIFIED_GUARD_PASS`

After PR5:

1. `RelationshipReducer` is the only relationship-score / conversation-state / reaction-mode authority.
2. `HardConstraintSet ∩ SoftTendencyProfile -> PlanResolver` is the only source of `KairaResponsePlan` behavior permissions.
3. Dialogue authority may narrow social permissions before PlanResolver; soft/HOW projections may not reopen those gates.
4. Speech identity is HOW-only and cannot revoke or grant WHAT/WHETHER permissions such as `allowHumor`.
5. The canonical prompt builder is the only behavior-decision surface delivered to the realizer.
6. The ordered `runKairaResponseConstraintPass` is the only final behavior/truth/consistency delivery pass.
7. The legacy rollback/diff promotion workflow is retired because there is no runtime legacy branch left to exercise.
8. Rollback is a Git revert of the PR5 merge commit, not an environment-variable flip.

## PR5 review finding

Making PlanResolver unconditional exposed two canonical authority leaks that the promotion corpus had not exercised:

- focused dialogue moves could have humor/affection/forgiveness/reopening permissions re-opened by the resolver even though dialogue authority had already narrowed them;
- `SpeechIdentity.humorLevel` (HOW-only) could indirectly revoke `allowHumor`.

PR5 fixes both rather than deleting the older invariant tests. Focused dialogue vetoes are represented in `HardConstraintSet`, and `allowHumor` is a permission sourced from the hard layer; speech humor remains a realization preference only.

Canonical verbosity remains allowed to shrink a hard dialogue/contract word ceiling, but never to widen it.

## Permanent regression

`kairaCanonicalAuthorityPromotionRegression.test.ts` fails if an authoritative runtime file reintroduces `isCanonicalBehaviorFlagEnabled`, any of the five rollout flag names, or the temporary flag registry.

## Consequences

- There is one production behavior truth path instead of canonical + compatibility branches.
- Future behavior changes require normal reviewed code/config changes; they cannot silently re-enable legacy behavior through environment state.
- PR6 is calibration only; it must not recreate a second behavior authority.
