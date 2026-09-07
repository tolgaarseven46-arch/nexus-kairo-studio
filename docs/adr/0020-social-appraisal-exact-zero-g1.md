# ADR-0020: SocialAppraisal G1 exact-zero gate

## Status

Accepted for G1.

## Decision

SocialAppraisal must represent "no material effect" as an explicit exact-zero result, not as a missing result, epsilon-sized mutation, or downstream default.

The G1 gate consumes canonical `SemanticInterpretation@2` only. It returns an exact-zero appraisal when there is no material social evidence in canonical primary intent, secondary social acts, severity, valence, or salient emotional load.

If any material evidence exists, G1 returns `null`, meaning appraisal must continue. `null` never means zero.

## Invariants

- relational significance may be exactly `0`;
- affective significance may independently be exactly `0`;
- no-material-effect requires both projections to be exactly zero;
- ordinary neutral/general turns with no material evidence must not drift relationship or affect state;
- canonical positive/negative social acts are never swallowed by the zero path;
- salient emotional load is never swallowed by the zero path;
- raw user text is never reparsed by this gate.

## Non-goals

G1 does not yet decide the magnitude or valence of non-zero social appraisal. Dyadic norms, candidate readings, and contextual G2 appraisal remain later slices.
