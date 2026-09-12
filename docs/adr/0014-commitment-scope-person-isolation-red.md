# ADR 0014 — Commitment scope/person isolation

Status: accepted; measured RED fixed at the world-memory appraisal projection seam.

## Question
Can two active commitments with the same canonical scope key but different actors/counterparties be projected as separate person-specific appraisal evidence?

## Expected invariant
Yes. `scopeKey` identifies the commitment scope, but person-specific truth must not collapse across distinct actors or counterparties. World-memory projection must preserve each active commitment identity needed by SocialAppraisal.

## Measured RED
PR #242 characterization ran against `main` in CI run `34720216666`. Behavior/docs guards, architecture contracts, autonomous runtime contracts, beta regression/harness/replay gates, bug-class manifest, and Historical RED→GREEN proof all passed. The full `Tests` step then failed while TypeScript/build were skipped, proving a deterministic runtime-contract failure rather than a guard or fixture-gate failure.

The failure source was `buildSocialAppraisalCommitmentContext()`: commitment candidates were deduplicated only by `scopeKey`, then `resolvePlanLifecycle()` received the entire observation set for that scope. Two people sharing a scope could therefore collapse to one lifecycle generation before SocialAppraisal received typed evidence.

## Decision
Projection groups commitment evidence by the existing typed identity tuple:
- canonical `scopeKey`;
- canonical `actorKey`;
- canonical `targetKey` / counterparty when present.

Each identity group is then passed to the existing `resolvePlanLifecycle()` unchanged. The lifecycle resolver remains authoritative; no new lifecycle, semantic, ranking, or appraisal authority is introduced. Missing actor evidence is not invented and remains excluded from typed commitment projection; missing counterparty remains an explicit identity with no fabricated Kaira target.

## Invariants
- same scope + different actor remains separate commitment evidence;
- same actor/scope + different counterparty remains separate commitment evidence;
- lifecycle resolution remains owned by `resolvePlanLifecycle()`;
- SocialAppraisal matching rules are unchanged;
- canonical semantic/world-memory authority boundaries are unchanged.

## Regression proof
`socialAppraisalCommitmentScopePersonIsolation.test.ts` locks both actor-isolation and counterparty-isolation cases on the real projection seam.

No provider/API calls are required.
