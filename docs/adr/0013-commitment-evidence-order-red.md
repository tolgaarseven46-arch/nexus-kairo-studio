# ADR 0013 — Commitment evidence order isolation

Status: accepted; measured RED fixed at the SocialAppraisal evidence-selection seam.

## Question
Can two equivalent sets of active Kaira-directed commitment evidence produce different betrayal appraisal solely because array order changes?

The measured counterexample was narrow:
- same actor;
- same scope;
- explicit `counterpartyId = kaira`;
- canonical intentional current-turn commitment violation;
- one incomplete prior commitment with zero confidence / no provenance;
- one valid prior commitment with positive confidence / provenance.

## Measured RED
Yes. With the incomplete record first, the previous `find()`-based matcher selected it and downstream confidence/provenance validation returned `unknown`. Reversing the same evidence set selected the valid record and returned `present`.

All deterministic pre-gates and guards were green; the characterization failed at the full `Tests` step. Storage/iteration order was therefore leaking into appraisal truth.

## Decision
For exact active Kaira-directed matches with the same actor and scope:
1. prefer any evidence item that already has positive confidence and non-empty provenance;
2. if none is usable, preserve the first exact match so the existing downstream fail-closed `unknown` behavior remains intact.

This is deliberately not a highest-confidence ranking policy. No new conflict-resolution or evidence-weighting authority is introduced.

## Invariants
- equivalent evidence sets cannot change betrayal truth solely due to array order when one valid exact match exists;
- an incomplete-only Kaira-directed commitment remains `unknown`;
- unresolved counterparty remains `unknown`;
- explicit third-party counterparty remains `absent`;
- canonical semantic and world-memory authority boundaries are unchanged.

## Regression proof
`socialAppraisalCommitmentEvidenceOrder.test.ts` exercises both permutations of the same evidence set and separately locks the incomplete-only uncertainty behavior.

No provider/API call is required for this proof.
