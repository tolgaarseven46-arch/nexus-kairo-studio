# ADR-0024 — Dyadic appraisal falsification matrix

## Status

Accepted as a verification policy for G2.

## Context

Example-based tests can prove selected scenarios while still allowing the G2 dyadic reweight formula to overfit specific severity, joking, uncertainty, or history values.

## Decision

Maintain a deterministic counterfactual matrix over multiple values of:

- canonical severity,
- joking confidence,
- interpretation uncertainty,
- established norm observation count,
- benign versus harmful dyadic evidence,
- active subject identity,
- canonical target.

The matrix does not add production behavior. It attempts to falsify architecture invariants across combinations.

## Required invariants

1. Repeated harmful evidence never increases `playful_banter` plausibility.
2. Established benign evidence never erases the `literal_harm` candidate or crosses its harm floor.
3. A profile belonging to another subject never changes candidate weights.
4. A non-Kaira target never consumes the Kaira-user dyadic norm.
5. Equivalent evidence produces equivalent weighting regardless of subject name.
6. Different people diverge only when their dyadic evidence differs, not merely because their identifiers differ.

## Consequence

G2 changes are not considered safe solely because hand-picked Alice/Bob examples pass. Future changes to the reweight policy must continue to satisfy the broader counterfactual matrix.
