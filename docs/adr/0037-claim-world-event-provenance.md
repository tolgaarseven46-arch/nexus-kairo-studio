# ADR-0037 — Immutable Claim provenance is separate from WorldEvent truth

## Status
Accepted precommit — 2026-09-04

## Context
Scenario S6 falsifies the current dialogue ledger: a reported statement can have a source different from its subject, and a later denial/correction currently mutates an earlier `DialogueClaim` row in place. Separately, `worldModelEventStore` can persist raw reported speech as a `reported_claim` WorldEvent observation. These two behaviors collapse provenance (who said what) with world truth (what happened).

## Decision
Introduce one canonical Claim contract for conversational propositions:

- `id`
- `source`
- `subject`
- `proposition`
- `status`
- `opposesClaimId`
- `derivedWorldEventId`
- confidence/evidence metadata may be carried, but cannot replace the fields above.

Rules:
1. Reported speech creates a Claim; source is the speaker, subject is the referenced third party/entity.
2. Denial/correction creates a NEW opposing Claim. The prior Claim is immutable and remains in provenance history.
3. Effective support is a derived view: an asserted/uncertain Claim opposed by a later denial is not currently supported, even though its historical row remains unchanged.
4. Raw reported speech does not automatically persist as WorldEvent truth. Claim → WorldEvent derivation requires an explicit grounded/verified promotion seam; no such promotion is inferred from report phrasing alone.
5. Dialogue recall/attribution consumers use effective Claim support and must not revive an opposed proposition.
6. The compatibility name `DialogueClaim` may temporarily alias the canonical Claim type, but `kairoDialogueChaosEngine` is no longer the semantic owner of the Claim contract.

## Falsification scenario
S6:
- Mert: “Emre yarın işi bırakacakmış.”
- Ali: “yok öyle bir şey, ben kafadan attım.”
- Mert: “Emre yarın ne yapacak?”

The architecture fails if source collapses into subject, denial mutates/deletes the first Claim, the first Claim remains effectively supported after opposition, or reported speech is durably stored as WorldEvent truth without explicit promotion.
