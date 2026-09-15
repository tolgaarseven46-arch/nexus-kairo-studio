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

## Consequences

- First-person user plans cannot silently contaminate Kaira-owned state.
- Second-hand / nested hearsay fails closed instead of becoming an invented durable fact.
- Richer nested-report provenance can remain a future product requirement rather than forcing an open-ended schema now.
- This ADR does not reopen the general pre-AI architecture; it closes two measured invariants within the existing semantic-authority layer.

## Evidence and verification

- Production hard-conversation matrix on Gemini 2.5 Flash Lite.
- Characterization RED: Fast CI `35023060861`.
- Minimal-fix GREEN: Fast CI `35023432890`.
- Implementation / review: PR #278.
- Final acceptance still requires full PR CI, merge, production deploy and replay of the two original live failures.
