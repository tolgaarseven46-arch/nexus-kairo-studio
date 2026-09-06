# ADR-0065 — Coercion severity represents pressure, not command grammar

## Status
Accepted

## Context
The 2026-09-06 real-user Turn 5 (`beni öp`) was recorded as neutral, Kaira-targeted, a `closeness_bid`, affectionate, not insulting and not red-line. The semantic provider nevertheless emitted `coercion=0.40`. Canonical relationship handling then correctly interpreted that typed coercion as `zorlama`, creating conflict/hurt and another negative event.

At the same time, the response-plan authority independently and correctly enforced Kaira's character policy: flirtation/counter-flirt were forbidden and a warm deflection was allowed. That character-policy decline is a response decision, not evidence that the user's first bid was coercive.

## Decision
- `coercion` severity measures actual pressure/constraint evidence, not grammatical imperative form.
- A single direct request, imperative, affection bid or flirtation bid is not coercion by itself when there is no persistence after refusal, pressure, threat, or stated-boundary crossing.
- Mild coercion begins with genuine insistence/pressure or continued pushing after a boundary/refusal; higher values require stronger compulsion evidence.
- `coercion` secondary act follows the same evidence rule; `primaryIntent=command` alone cannot create coercion.
- Preserve Kaira's character/flirtation policy and its ability to decline or warmly deflect.
- Preserve RelationshipReducer coercion thresholds for genuine coercive behavior.
- Do not add raw-text phrase rules, regexes, or a second semantic authority.

## Verification
A deterministic replay pins the recorded Turn-5 semantic snapshot and proves coercion=0.40 alone reproduces `zorlama` relationship injury, while the otherwise identical typed turn with coercion=0 remains relationship-neutral. Provider-contract tests pin the corrected ontology. All verification is API-free.
