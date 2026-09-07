# ADR-0016 — Canonical discourse agreement authority

Status: accepted

## Context

`classifyUserSocialAct` consumed the shared canonical semantic event but also retained a fallback raw-text regex for short acknowledgements such as `tamam`, `evet`, and `aynen`. That downstream fallback could recreate a user social act after canonical language understanding had already produced `SemanticInterpretation@2`.

## Decision

User-turn `agreement_ack` may be produced only from canonical discourse semantics (`socialRoutine=agreement`). `classifyUserSocialAct` keeps its compatibility message parameter temporarily but must not inspect it for user semantics.

Kaira delivered-reply regex classification remains allowed for self-observation/repetition tracking because it observes Kaira's own output and does not reinterpret user meaning.

## Consequences

- Canonical language understanding remains the only user semantic authority.
- Provider/fallback mistakes are visible instead of being silently corrected downstream.
- Further E1 work will move remaining raw-message discourse-shape deductions into canonical ingestion facets rather than adding new downstream regexes.
