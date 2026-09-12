# ADR 0012 — Commitment counterparty isolation

Status: Accepted.

## Context
An active commitment projected from canonical world-event memory may have no resolved `counterpartyId` when the underlying proposition has no target key. SocialAppraisal previously treated that unresolved identity as compatible with Kaira, so a same-actor/same-scope intentional violation could be promoted into Kaira-directed betrayal without typed evidence that the prior commitment was actually made to Kaira.

The RED characterization on PR #239 reproduced this through the real runtime SocialAppraisal seam. CI failed in the full `Tests` step while all earlier architecture/runtime/harness guards remained green.

## Decision
Dyadic betrayal requires explicit typed counterparty evidence.

- `counterpartyId === "kaira"` may match the active Kaira-user dyad.
- an explicit different counterparty is `betrayal=absent` with counterparty mismatch;
- a missing counterparty is unresolved evidence and therefore `betrayal=unknown`;
- missing identity must never be interpreted as Kaira by default.

World-memory projection remains unchanged and continues to preserve missing target identity as missing. The fix belongs only in SocialAppraisal matching/evidence assessment; no new memory or semantic authority is introduced.

## Proof
`socialAppraisalCommitmentCounterpartyIsolation.test.ts` locks three neighbors through the real runtime seam:
1. missing counterparty -> `unknown`;
2. explicit third party -> `absent`;
3. explicit Kaira -> `present`.

Provider/API calls are not used.
