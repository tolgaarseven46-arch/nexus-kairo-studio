# ADR 0012 — Commitment counterparty isolation RED characterization

Status: characterization only; production behavior unchanged.

## Question
Can an active commitment with no resolved counterparty identity be promoted into Kaira-directed betrayal solely because the current turn contains a canonical intentional commitment violation for the same actor and scope?

## Expected invariant
No. Dyadic betrayal requires typed evidence that the prior commitment was directed to Kaira. Missing counterparty identity must fail closed and must not become `betrayal=present`.

## Proof
`socialAppraisalCommitmentCounterpartyIsolation.test.ts` exercises the real runtime SocialAppraisal seam with:
- same actor;
- same scope;
- active prior commitment;
- canonical intentional current-turn violation;
- missing prior `counterpartyId`.

The test intentionally expects a non-present betrayal result. If current behavior promotes the unresolved commitment into Kaira-directed betrayal, CI should go RED before any production patch is considered.
