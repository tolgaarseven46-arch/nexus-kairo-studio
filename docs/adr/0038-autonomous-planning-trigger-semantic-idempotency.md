# ADR-0038 — Autonomous planning trigger semantic idempotency

- Status: Accepted for PR #70 production repair
- Date: 2026-09-04

## Context

The production `Kaira Autonomous Life Wakeup` reached the deployed worker successfully, but a fresh tick failed every discovered planning inbox item with `Kaira planning trigger inbox idempotency conflict` (25 failed items in run `33897589632`).

The durable inbox compared canonical delivery identity with `JSON.stringify(trigger)`. Firestore map/property iteration order is not a semantic part of a trigger, so two materializations of the same persisted logical trigger can serialize in different key order and falsely conflict.

## Decision

Planning-trigger replay identity is the normalized typed trigger schema, not JavaScript object insertion order.

`sameKairaActivityPlanningTrigger(...)` compares canonical common identity (`triggerId`, `kind`, `sourceId`, `occurredAt`) and the exact typed payload for each trigger kind:

- `idle_transition`: `previousBusy`, `currentBusy`
- `execution_terminal`: `terminalPhase`
- `meaningful_world_change`: `materiality`
- `dynamic_state_change`: `magnitude`

The inbox store must use that semantic equality for enqueue replay, defer and consume idempotency checks.

## Invariants

1. Reordered Firestore map properties must not create an idempotency conflict.
2. Normalization-equivalent IDs/timestamps represent the same logical trigger.
3. A real change to any typed trigger identity/payload field remains a conflict.
4. This repair does not weaken durable run identity, trigger ownership, status transitions, retry policy, or proposal/schedule authorities.
5. Production acceptance requires a new autonomous-life wakeup identity after deployment; rerunning the old failed GitHub run is insufficient because whole-tick receipts are intentionally replay-safe by run id.

## Verification

Permanent regression: `src/services/kairaActivityPlanningTriggerIdentity.test.ts`.

PR #70 must pass full CI and architecture review before merge. After exact-commit Render deployment, a fresh production wakeup must no longer report planning-trigger inbox idempotency conflicts. Any remaining proposal-recovery failure is treated independently and must be reproduced before further code changes.
