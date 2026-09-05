# ADR-0044 — Resolved self-fact final-answer conformance

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Kaira's selective self-memory runtime already failed closed when a self-memory request had no matching canonical record, persistence was unavailable, or the current instance was ephemeral. However, when a canonical self-fact was successfully resolved, the final autobiographical response guard treated the existence of evidence as sufficient and returned the generated reply unchanged.

That left a direct identity-integrity gap: for a resolved canonical fact such as `favorite_flower=krizantem`, a model draft such as `En sevdiğim çiçek güldür.` could pass the final guard even though it contradicted the exact canonical identity record.

## Decision

For `self_fact` queries with resolved canonical evidence, final delivery must conform to the strongest ranked canonical self-fact.

- If the generated reply contains the strongest canonical fact value and does not explicitly negate it, preserve the natural generated reply.
- If the canonical value is absent, or is mentioned only to negate it, replace the generated reply with a deterministic grounded fallback: `Buna dair net kaydım: <canonical value>.`
- This enforcement applies only to resolved `self_fact` recall. It does not reinterpret ordinary conversation, relationship state, world memory, or autobiographical-memory narration.
- The guard consumes already-ranked canonical evidence; it does not re-parse the user message or create a second semantic authority.

## Consequences

- A resolved canonical Kaira preference/trait/biographical self-fact can no longer be silently contradicted by model prior at final delivery.
- Natural wording is preserved when it actually states the canonical value.
- Existing fail-closed behavior for no-match, unavailable persistence and ephemeral instances remains unchanged.
- Autobiographical memories are deliberately not forced through exact-value text matching; their multi-fact narrative grounding remains a separate problem and must be changed only from measured regressions.

## Regression coverage

`src/services/kairaAutobiographicalResponseGuardContracts.test.ts` permanently covers:
- valid canonical self-fact preservation,
- contradictory self-fact replacement,
- canonical-value negation rejection,
- existing no-match/unavailable/ephemeral behavior,
- unchanged autobiographical-memory behavior.

## Revisit condition

Revisit only if measured live examples show that exact canonical-value conformance produces false positives for legitimate paraphrases, or if a typed semantic claim-conformance layer becomes authoritative enough to replace this narrow deterministic check.
