# ADR-0064 — Privacy severity represents violation, not personal subject matter

## Status
Accepted

## Context
The 2026-09-06 real-user Turn 4 (`senin manit falan var mı`) was recorded as a neutral Kaira-targeted question and `closeness_bid`, but the semantic provider also emitted `privacy=0.40`. That single typed field was enough for the canonical relationship path to create `mahremiyet_ihlali`, reduce warmth/trust, and add conflict/hurt.

Current-main inspection shows the downstream path is internally consistent: `SemanticInterpretation.severity.privacy` projects to `privacyViolation`, the relationship bridge preserves canonical privacy severity, and `semanticNegativePattern` classifies privacy >= 0.15 as `mahremiyet_ihlali`. The first broken boundary is therefore the provider privacy ontology, not RelationshipReducer calibration.

## Decision
- `privacy` severity measures evidence of a privacy *violation*, not how personal the topic is.
- Ordinary voluntary social questions about personal status, relationships, preferences, or personal life are privacy=0 unless the utterance itself contains invasion evidence.
- Mild privacy severity starts only with behavior such as pressuring for explicitly private information or crossing an already stated privacy boundary.
- `privacy_violation` secondary act follows the same evidence rule.
- Keep RelationshipReducer thresholds and privacy injury behavior unchanged for genuine privacy violations.
- Do not add raw-text regexes, phrase rules, or a second semantic authority.

## Scope boundary
Turn 4 also exposed a separate `current self state` vs `autobiographical self-memory` ontology issue: the relationship-status question was routed as autobiographical recall. This ADR does not define or fix that product state authority. Turn 5 boundary-decline-vs-relationship-harm also remains separate.

## Verification
A deterministic replay pins the recorded Turn-4 semantic snapshot and proves privacy=0.40 alone reproduces the relationship injury, while an otherwise identical typed interpretation with privacy=0 remains relationship-neutral. A provider-contract test pins the tightened privacy ontology in the semantic parser system instruction. All verification is API-free.
