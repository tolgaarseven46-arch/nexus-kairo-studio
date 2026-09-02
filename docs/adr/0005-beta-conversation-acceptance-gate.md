# ADR-0005 — Beta Conversation Acceptance Gate

Status: Accepted
Date: 2026-09-02

## Context

Kaira already has broad architecture/runtime contracts and many focused regressions. A beta acceptance surface is useful only if it adds product-facing signal rather than re-running the same files under a new label. The first draft duplicated most of `test:beta` and therefore risked giving a false sense of independent acceptance coverage.

## Decision

CI will run a permanent `Beta conversation acceptance` step before the full test suite.

The acceptance surface has one canonical manifest: `config/beta-conversation-acceptance.json`. CI executes that manifest through `scripts/run-beta-conversation-acceptance.mjs`; filenames are not duplicated in workflow YAML.

The v1 acceptance matrix contains only product-specific acceptance scenarios that are not already owned by `test:beta`:

- `kairaBetaConversationAcceptanceScenario.test.ts`: integrated social continuity → relationship-sensitive hurt → repair → long-session recovery,
- `kairaTwentyTurnPersistenceRoundtripRegression.test.ts`: every turn keeps its own persisted/hydrated after-state and runtime metadata.

Focused regressions and architecture contracts remain in their existing gates. They are not copied into this acceptance manifest merely to increase apparent coverage.

`kairaBetaConversationAcceptanceGateContracts.test.ts` validates that the manifest is canonical, listed files exist, acceptance ownership is not duplicated inside `test:beta`, and CI invokes the canonical runner before the full suite.

## Boundaries

- This gate does not create a new behavior authority.
- It does not tune personality, probabilities, memory or ResponsePlan policy.
- A test enters the acceptance manifest only when it protects a durable product-facing invariant not already owned by another early gate.
- The full suite remains authoritative; acceptance is an earlier product-readiness signal, not a replacement for full CI.

## Consequences

The beta checkpoint is smaller but meaningful: a green acceptance step now means distinct product-facing conversation scenarios passed, rather than mostly duplicated regressions passing again. Future real-chat failures should first become focused regressions; only durable cross-cutting user-facing invariants should be promoted into the acceptance manifest.
