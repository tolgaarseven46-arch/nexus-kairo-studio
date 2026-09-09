# ADR-0021 — Reported Third-Party Target Grounding

## Status
Accepted for deterministic canonical-ingestion coverage.

## Context
Natural Characterization v2 scenario S8 exposed a concrete target-resolution failure:

`iş arkadaşına salak dedi`

was projected as `target=kaira`, causing a narrated third-party insult to enter the Kaira-user relationship as dyadic harm.

The downstream G4/RelationshipReducer behavior was correct for the typed input it received. The first broken boundary was therefore the canonical target-resolution input, not appraisal or relationship reduction.

## Decision
At the single semantic-ingestion boundary, a Turkish dative social-role referent combined with a narrated third-person social predicate is positive evidence for a `third_party` semantic target.

The deterministic floor recognizes the measured family:
- friend / coworker
- sibling
- boss
- spouse

with Turkish possessive+dative morphology and narrated predicates such as saying, shouting, insulting, swearing, threatening, or behaving badly.

A predicate requirement prevents unrelated comparisons such as `arkadaşına göre sen salaksın` from stealing an explicit Kaira-directed target.

## Non-goals
- No G1→G4 change.
- No RelationshipReducer change.
- No ResponsePlan, memory or speech-identity change.
- No generic social-role ontology expansion beyond the measured failure family.
- No provider/API call is used as architecture proof.

## Verification
The reported S8 phrase, four neighboring dative-role narratives, explicit Kaira-directed counterexamples, and a comparison-framing counterexample are covered by deterministic canonical-ingestion regressions.
