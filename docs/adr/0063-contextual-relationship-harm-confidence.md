# ADR-0063 — Contextual credibility for low-level dyadic harm

## Status
Accepted

## Context
The 2026-09-06 real-user Turn 7 was semantically neutral, directly addressed Kaira, had disrespect 0.20, joking confidence 0.80, uncertainty 0.32 and no explicit insult flag. The canonical reducer nevertheless created a new negative relationship event and persisted `hakaret`. Code inspection showed joking/sincerity/uncertainty already reached the reducer, but ordinary neutral-valence targeted-harm promotion ignored them.

A first broader repair that scaled ordinary injury severity fixed Turn 7 but broke two existing invariants: residual hurt persistence and disengaged-to-repair recovery. That version was rejected and never merged.

## Decision
- Preserve all existing injury magnitude, residual reaction, recovery, and hard-redline mathematics.
- Preserve the existing explicit `valence=negative` injury path unchanged.
- Only when valence is not negative, require low-level Kaira-targeted harm to clear a contextual credibility threshold before it can promote the turn into a new negative dyadic event.
- Contextual credibility uses only canonical v2 fields already present at the reducer boundary: joking confidence, sincerity confidence and semantic uncertainty. Existing redline dampening coefficients are reused; no second calibration source is introduced.
- Raw semantic severity remains observable and unchanged.
- No raw-text parse, phrase rule, regex, provider call, or second semantic authority is introduced.

## Consequences
Turn 7-style playful/uncertain low-level signals no longer become durable injury merely because Kaira is the target. Explicit negative-valence harm, residual hurt, and repair trajectories remain governed by their existing contracts. Turn 4 privacy ontology and Turn 5 boundary-decline-vs-harm remain separate work candidates.

## Verification
The accepted narrow patch was exercised API-free by the one-time v4 gate with focused characterization/regression coverage, the full test suite, TypeScript validation, and production build all green before the patch commit was written. This documentation-only follow-up exists to bind normal PR CI and architecture review to a user-authored final head without changing runtime behavior.
