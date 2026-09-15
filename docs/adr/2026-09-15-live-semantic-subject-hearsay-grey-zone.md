# Live Semantic Subject Identity and Nested Hearsay Grey-Zone

Status: Accepted  
Date: 2026-09-15

## Context

A real production multi-turn quality matrix using `google/gemini-2.5-flash-lite` exposed two measured canonical-semantic failures after the pre-AI architecture freeze:

1. A user-owned first-person plan such as “yarın istifa edeceğim” could be emitted with `subjectId: kaira` instead of the current user.
2. Nested reported speech such as “Ali bana Mert'in X dediğini söyledi” could promote the embedded quote to a durable world-memory fact, losing the fact that it was second-hand reporting.

Both are measured attribution / ownership / provenance invariant violations, so they satisfy the frozen architecture reopening rule. Historical characterization RED was captured in Fast CI run `35023060861`; the bounded fix passed Fast CI run `35023432890`.

## Decision

- User-owned first-person actions, plans and facts use canonical `current_user` subject / actor identity.
- `kaira` is reserved for utterances that explicitly make Kaira the subject.
- Explicit named third parties remain `person:<normalize_ad>` identities.
- Nested reported speech does not promote the embedded proposition to a durable direct `worldMemory` fact when direct provenance is unavailable.
- The report remains available as current-turn proposition / evidence and retains uncertainty.
- No phrase regex patch, downstream semantic reparse or schema expansion is introduced.

This applies the frozen grey-zone principle: **meaning/content may remain uncertain; authority, ownership and scope may not.**

## Live follow-up after PR #278

Production replay of the original cases confirmed the first fix, then exposed two narrower measured invariants:

1. A provider could still emit the world-memory alias `subjectId: self` for a user-owned fact. `self` is not a canonical durable world-memory identity; at the server canonical semantic bridge it is normalized to `current_user`, and the semantic event/world event projections are rebuilt from the reconciled interpretation.
2. A declarative reported-speech statement could be mislabeled `discourseAct: recall_request`, routing a new statement into grounded-recall behavior. `recall_request` now survives only when the typed interpretation contains actual retrieval evidence: a question intent/proposition, a world-memory query, or a self-memory query. No raw-text phrase detector is introduced.

These are the same ownership/authority class as the original reopening, not a new architecture class. The reconciliation is bounded at the canonical server semantic bridge and records typed reconciliation evidence.

## Consequences

- First-person user plans cannot silently contaminate Kaira-owned state.
- `self` cannot remain an ambiguous durable world-memory subject; it resolves to canonical `current_user` at the runtime boundary.
- Second-hand / nested hearsay fails closed instead of becoming an invented durable fact.
- Declarative reported speech cannot silently become a memory-retrieval action without typed retrieval evidence.
- Richer nested-report provenance can remain a future product requirement rather than forcing an open-ended schema now.
- This ADR does not reopen the general pre-AI architecture; it closes measured invariants within the existing semantic-authority/discourse layers.

## Evidence and verification

- Production hard-conversation matrix on Gemini 2.5 Flash Lite.
- Initial characterization RED: Fast CI `35023060861`.
- Initial minimal-fix GREEN: Fast CI `35023432890`.
- Initial implementation / review: PR #278.
- PR #278 production replay confirmed durable hearsay fail-closed and exposed the narrower `self` alias / false-recall cases.
- Follow-up live diagnostic: workflow run `35025648104`.
- Follow-up unit characterization covers `self -> current_user`, declarative false recall removal, and preservation of real retrieval questions.
- Final follow-up acceptance requires full PR CI, merge, production deploy and production replay of the measured cases.
