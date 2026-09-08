# ADR-0091 — Phase-0 detector readiness is scenario-complete

**Status:** Accepted  
**Date:** 2026-09-08

## Context

The Phase-0 scale gate previously considered a cluster observable when any detector produced at least one observable turn anywhere in that cluster. This is unsafe for heterogeneous clusters. Cluster A contains distinct authority questions: autonomous current-self/world state, autobiography, persona-only negative control, and user/session provenance. One observable neighboring turn cannot prove those other scenarios are covered.

## Decision

Phase-0 readiness is evaluated per scenario before it is aggregated to a cluster.

- Every regression scenario defaults to `observable_required`.
- A scenario may be exempt only through an explicit tooling policy entry with `not_applicable`.
- A cluster is ready only when every scenario in it is ready.
- Phase-1 scaling requires every `observable_required` scenario to have at least one observable typed detector turn.
- The old `everyClusterObservable` report field remains only for compatibility; its value is now derived from scenario-complete cluster readiness rather than one-turn sampling.

A4 (persona-language negative control) is explicitly `not_applicable` for the self-epistemic detector family. Its purpose is to prove that persona expression is not forced through factual self-memory grounding.

## Invariants

- Adding observability to one A scenario cannot unlock the whole A cluster.
- Negative controls cannot become silently exempt; exemptions must be explicit data in `config/kairaPreAiPhase0DetectorExpectations.json`.
- Detector readiness is tooling metadata, not semantic authority. It may not reinterpret user text or change runtime behavior.
- Phase-1 remains blocked while any required scenario lacks typed automatic observability, even when all currently observable turns are violation-free.

## Verification

`kairaPreAiPhase0Readiness.test.ts` proves that one observable neighboring scenario does not unlock a heterogeneous cluster, that only explicit `not_applicable` scenarios may be detector-less, and that `observable_required` is the default.
