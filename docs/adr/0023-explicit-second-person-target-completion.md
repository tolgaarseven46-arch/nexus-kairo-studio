# ADR-0023 — Explicit second-person target completion

Status: Accepted
Date: 2026-09-09

## Context

Natural Characterization v2 S6 exposed an authority contradiction on turns such as:

`senle uğraşmak hoşuma gidiyor`

`entityResolution` already resolved `senle` as a high-confidence second-person reference to Kaira, while the canonical `SemanticInterpretation@2.target` remained `unknown` because the fallback semantic event returned early for non-negative/non-command turns.

The target contradiction must be resolved once at the canonical language-understanding gateway. Downstream appraisal, relationship, dialogue, or response layers must not reparse Turkish second-person morphology.

## Decision

Extend the existing `reconcileSemanticTargetWithEntityResolution(...)` seam:

- when canonical target is `unknown`;
- entity resolution contains a high-confidence `second_person` or `character` reference resolved to `kaira`;
- and there is no competing named third-party reference;

then complete canonical target to `kaira` and reduce target uncertainty.

This is typed evidence reconciliation, not a new phrase classifier.

## Protected counterexamples

- explicit third-party narration remains `third_party`;
- a turn with no Kaira participant reference does not manufacture a Kaira target;
- existing `third_party -> kaira` dyadic reconciliation semantics remain unchanged.

## Verification

Reported + neighbor + counterexample coverage lives in `kairaSecondPersonTargetNeighborProofRegression.test.ts`.

Semantic-ingestion changes trigger the API-free Natural Characterization v2 FAST corpus, so S6 is replayed together with the full 10-scenario / 11-execution / 220-turn characterization set.

## Non-goals

- no G1→G4 change;
- no RelationshipReducer change;
- no ResponsePlan heuristic;
- no raw-text reparse downstream;
- no provider/API proof;
- frozen 21/423 regression baseline remains unchanged.
