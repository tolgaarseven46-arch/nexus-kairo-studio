# ADR-0020 — Canonical Speech-Act Negation Reconciliation

## Status
Accepted for implementation in the canonical language-understanding boundary.

## Context
Natural Characterization v2 exposed two deterministic ingestion failures:

- explicit stop paraphrases such as `konuşmayı bırak` and `bana bir şey yazma` were not consistently projected as current-turn stop requests;
- negated speech-act mentions such as `özür dilemedim` could be promoted into positive apology/repair evidence.

The failures occur before Social Appraisal, RelationshipReducer and ResponsePlan. Downstream layers therefore must not compensate by reparsing raw user text.

## Decision
The single canonical semantic-ingestion boundary owns these reconciliations.

1. Explicit stop paraphrases may complete the existing transient `stopTalking` semantic facet.
2. Keyword-triggered positive speech-act evidence must be checked for local Turkish negation scope before being promoted.
3. The negation mechanism is shared/compositional rather than apology-specific and covers both analytic particles (`değil`, `yok`) and productive Turkish verbal negation, including progressive `-mıyor/-miyor/-muyor/-müyor` forms.
4. Existing affirmative evidence and counterexamples remain protected by regression tests.

## Non-goals
- No change to G1→G4 Social Appraisal.
- No change to RelationshipReducer.
- No persistent disengage state is introduced for a transient stop command.
- No provider/API behavior is used as architecture proof.
- No downstream raw-text parser is added.

## Verification
Reported case, neighboring negated speech acts, stop paraphrases and affirmative/negated counterexamples are covered by deterministic canonical-ingestion regressions and the FAST lane before final FULL CI.
