# ADR 0014 — Commitment scope/person isolation RED characterization

Status: characterization only; production behavior unchanged.

## Question
Can two active commitments with the same canonical scope key but different actors/counterparties be projected as separate person-specific appraisal evidence?

## Expected invariant
Yes. `scopeKey` identifies the commitment scope, but person-specific truth must not collapse across distinct actors or counterparties. World-memory projection must preserve each active commitment identity needed by SocialAppraisal.

## Candidate failure
`buildSocialAppraisalCommitmentContext()` currently deduplicates proposition keys by `scopeKey` and calls `resolvePlanLifecycle()` only by that scope key. If two commitment generations share a scope key across different people, one generation may mask the other before appraisal receives typed evidence.

## Proof
`socialAppraisalCommitmentScopePersonIsolation.test.ts` feeds two active commitments with the same scope key but different actors and requires two projected contexts. A single projected row is a deterministic RED proving cross-person collapse at the world-memory projection seam.

PR #242 targets `main` so the repository's full CI policy executes this characterization.

No provider/API calls are required.
