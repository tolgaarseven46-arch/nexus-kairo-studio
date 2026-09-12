# ADR 0013 — Commitment evidence order RED characterization

Status: characterization only; production behavior unchanged.

## Question
Can two equivalent sets of active Kaira-directed commitment evidence produce different betrayal appraisal solely because array order changes?

The measured candidate is narrow:
- same actor;
- same scope;
- explicit `counterpartyId = kaira`;
- canonical intentional current-turn commitment violation;
- one incomplete prior commitment with zero confidence / no provenance;
- one valid prior commitment with positive confidence / provenance.

## Expected invariant
No. Evidence ordering is not semantic truth. If valid typed Kaira-directed commitment evidence exists for the same actor/scope, an earlier incomplete duplicate must not mask it.

## Proof
`socialAppraisalCommitmentEvidenceOrder.test.ts` executes the real runtime SocialAppraisal seam with both permutations of the same evidence set and requires the betrayal result/confidence to remain equivalent.

If the current `find()`-based selection makes the incomplete-first permutation fail while the valid-first permutation succeeds, CI must go RED before any production matcher change is considered.
