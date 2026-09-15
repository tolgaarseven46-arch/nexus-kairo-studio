# Seeded adversarial conversation exploration

Status: Experimental / non-production acceptance coverage

## Context

The frozen Phase-0 baseline remains 21 scenarios / 423 turns. Live-beta work needs an additional way to stress the same pre-provider production-core path with mixed, less scripted conversation sequences without making nondeterministic failures impossible to replay.

## Decision

Add a separate exploration-only Vitest that generates two seeded 90-turn conversations (180 turns total). The streams mix conflict, repair, third-party attribution, self/session recall, commitment/lifecycle language, uncertainty, advice-boundary requests and abrupt topic shifts.

The random-looking order is produced from fixed seeds, so any failure is exactly reproducible. This test does not change the frozen 21/423 regression baseline and does not call an AI/model provider. It runs through the existing `runKairaPreAiPhase0Scenario` production-core harness to the final provider prompt boundary.

## Required invariants

- no provider/model call
- independent user/session identity per run
- zero audit invariant violations
- dynamic-state numeric fields remain finite and within 0..100
- final provider prompt stop marker remains present
- production behavior is not changed merely to satisfy exploration coverage

## Promotion rule

An exploration failure is evidence, not an automatic production patch. Any material failure must be reduced to its owning seam and promoted to a minimal deterministic RED/counterexample before production behavior changes.
