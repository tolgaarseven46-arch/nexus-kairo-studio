# ADR-0005 — Beta Conversation Acceptance Gate

Status: Accepted
Date: 2026-09-02

## Context

Kaira already has broad architecture/runtime contracts and many focused regressions, but beta readiness also needs one explicit product-facing conversation gate. Without a named gate, long-session state stability, qualitative relationship HOW, controlled spontaneity, continuity, persistence, learned-language drift and final response authority can all pass independently without being treated as one release acceptance surface.

## Decision

CI will run a permanent `Beta conversation acceptance` step before the full test suite. The v1 matrix is intentionally composed from existing deterministic regressions rather than duplicating product logic:

- long-session state consistency,
- qualitative relationship/speech differentiation,
- controlled-spontaneity integration and authority ordering,
- short-turn conversation continuity,
- twenty-turn per-turn persistence roundtrip,
- long-horizon learned-language self-drift bounds,
- deterministic final ResponsePlan delivery authority.

`kairaBetaConversationAcceptanceGateContracts.test.ts` locks this matrix into CI so individual tests cannot silently fall out of the acceptance surface.

## Boundaries

- This gate does not create a new behavior authority.
- It does not tune personality, probabilities, memory or ResponsePlan policy.
- New acceptance cases are added only when a measured product-facing failure is found.
- The full suite remains authoritative; the acceptance gate is an earlier, named beta-quality signal.

## Consequences

Beta conversation quality now has one stable CI checkpoint. Future real-chat failures can be reproduced as focused regressions and then promoted into this matrix when they protect a durable user-facing invariant.
