# ADR-0025 — Contextual `seviyorum` compliment scope

Status: Accepted
Date: 2026-09-09

## Context

Natural Characterization v2 S1 exposed a canonical semantic over-read on the sequence:

- `sen sessizliği sever misin`
- `ben bazen seviyorum`

The second turn is a self/preference continuation, but the legacy semantic floor treated every bounded `seviyorum` token as a compliment. The resulting canonical interpretation was `compliment + positive`, which incorrectly moved Kaira's situational state (`calmness +1`, `stress -2`, `happiness +2`) despite there being no Kaira-directed positive social act.

This is a product failure because the classification leak changes runtime trajectory, not merely a label in debug output.

## Decision

At the canonical semantic-ingestion reconciliation boundary:

- a generic `seviyorum` hit is not sufficient evidence of a compliment;
- explicit addressee-directed `seni seviyorum`, `seni çok seviyorum`, and the equivalent plural/polite `sizi ... seviyorum` preserve the existing positive compliment reading;
- generic/self/object preferences are neutralized before `SemanticInterpretation@2` is consumed downstream.

Protected neutral examples:

- `ben bazen seviyorum`
- `kahveyi seviyorum`
- `seviyorum`

Protected positive counterexamples:

- `seni seviyorum`
- `seni çok seviyorum`

## Authority boundary

The correction lives only in canonical ingestion reconciliation. G1→G4, RelationshipReducer, dynamic-state reducers, DialogueDecision, ResponsePlan, memory and speech identity do not reparse `seviyorum` independently.

The reconciliation removes a known deterministic floor over-read; it does not introduce a second semantic authority.

## Verification

Reported + neighbor + counterexample coverage lives in `kairaContextualSeviyorumComplimentRegression.test.ts`.

Because `semanticEventCanonicalizer.ts` is part of the Natural Characterization v2 semantic path, FAST/FULL validation is required before merge. The frozen 21/423 regression baseline is not modified.
