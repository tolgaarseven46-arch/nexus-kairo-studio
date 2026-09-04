# ADR-0041 — Autonomous wakeup failure-aware acceptance

Date: 2026-09-04
Status: Accepted

## Context

Production autonomous-life acceptance exposed two operational gaps in the repository-owned GitHub Actions wakeup runner:

1. A terminal autonomous-life tick could return HTTP 200 with a durable summary containing `recovery.failed > 0` while the scheduler workflow still exited successfully.
2. The runner aborted every request after 90 seconds, but a real healthy production tick was observed to require more than 90 seconds.

The durable worker receipt is the canonical outcome authority. HTTP success alone is not sufficient evidence that all autonomous stages succeeded.

## Decision

- A non-busy terminal tick must contain a durable receipt summary.
- `planning.failed`, `recovery.failed`, and `schedules.failed` must each equal zero for the scheduled wakeup job to succeed.
- The same stage-success invariant is rechecked on the durable replay response.
- `busy` remains a valid non-terminal concurrency outcome and is not treated as a stage failure.
- The first production worker call receives a bounded 240-second default timeout, configurable through `KAIRA_AUTONOMOUS_LIFE_TIMEOUT_MS` within 30–300 seconds.
- Replay remains bounded to at most 90 seconds and health to at most 60 seconds.
- The GitHub Actions job timeout is seven minutes so the request timeout plus replay/health verification can complete without the workflow killing a valid long-running tick first.
- Timeout failures report a path-specific error instead of surfacing an opaque AbortError.

## Consequences

- A scheduler run can no longer be green while its durable receipt reports a failed planning, recovery, or schedule stage.
- Long but healthy production ticks are no longer incorrectly aborted at 90 seconds.
- Durable run identity, replay idempotency, concurrency behavior, and health authority remain unchanged.
- Permanent scheduler contract tests lock timeout headroom, stage failure detection, replay verification, and credential handling.
