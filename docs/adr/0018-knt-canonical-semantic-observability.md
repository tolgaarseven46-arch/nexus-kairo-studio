# ADR-0018: KNT canonical semantic observability

- Status: Accepted
- Date: 2026-09-03

## Context

`SemanticInterpretation@2` is the canonical current-turn semantic authority and PR #41 added a deterministic provider field-quality matrix. The Studio KNT navigator already stores and exposes per-turn response provider, KDM state, world reasoning and response-plan metadata, but KNT traces did not persist the canonical semantic interpretation/source. Test-session metadata did contain those fields, creating an observability mismatch.

Without the semantic snapshot in the KNT trace, a real 20-turn session could show that downstream behavior looked wrong without revealing whether the live semantic provider produced the wrong `primaryIntent`, `target`, discourse/repair facet, stop flags, advice flag or uncertainty. That made live provider drift unnecessarily hard to compare against ADR-0017's field-quality contract.

## Decision

Every KNT trace, on both local-language and AI delivery paths, persists:

- the exact `canonicalSemantic.interpretation` used by the turn;
- its deterministic `canonicalSemantic.event` projection;
- the canonical semantic source (`client_shared`, `semantic_provider`, `fallback_regex`, etc.).

The KNT navigator exposes a compact canonical summary in one-turn and all-turn copy output:

- primary intent;
- target;
- social routine;
- discourse act;
- repair signal;
- advice-request flag;
- stop-question and stop-talking flags;
- overall uncertainty;
- semantic source separately from the response-generation provider.

The complete interpretation/event remain available inside the collapsed technical detail block.

## Authority invariant

Observability is read-only. KNT persistence/UI must never reinterpret text, normalize semantic fields, alter the canonical event or feed debug values back into behavior policy. The snapshot shown is exactly the semantic pair already used by production KDM/dialogue behavior.

## Non-goals

- No semantic parser, relationship, repetition, emotional-load or dialogue threshold changes.
- No new model call.
- No duplicate semantic parsing in the client or debug panel.
- Historical KNT records created before this change are allowed to show missing semantic fields.

## Consequences

Real provider sessions can now be copied from KNT and compared turn-by-turn against the semantic-provider quality matrix without relying on final KDM labels as a proxy for parser quality. Response provider (`gemini`/`openrouter`/`local_language`) and semantic source remain separate observability dimensions.
