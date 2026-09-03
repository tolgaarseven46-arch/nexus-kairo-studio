# ADR-0012: PR5 canonical-only runtime promotion

- **Status:** Accepted
- **Date:** 2026-09-03
- **Parent:** ADR-0006, ADR-0011

## Context

PR #33 satisfied `CANONICAL_PATH_PROMOTION_GATE`: canonical beta acceptance, recorded-session/golden replay, all-flags-OFF rollback evidence, and the same-input canonical-vs-legacy diff review were green. ADR-0006 therefore permits PR5 to remove the temporary rollout/compatibility layer.

The PR5 migration also exposed tests whose assertions still encoded the retired legacy authority model. Those contracts were migrated only where the canonical architecture had already made the legacy expectation invalid; canonical semantics and relationship behavior were not weakened to preserve rollback-era assertions.

## Decision

After PR5, the canonical behavior architecture is the only runtime authority:

- `SemanticInterpretation@2` remains the semantic boundary; an isolated lexical insult is candidate evidence, not an invented Kaira target. Relationship-injury fixtures use explicit target evidence when the target is material.
- `RelationshipReducer` is the sole relationship/FSM score authority. Response/behavior policy may constrain delivery but cannot manufacture relationship-state transitions.
- `PlanResolver` is the sole WHAT/WHETHER behavior-plan authority.
- canonical prompt assembly is unconditional; legacy prompt authority branches and rollout switches are removed.
- the unified final constraint pass is unconditional; legacy final-guard selection branches are removed.
- the five ADR-0006 rollout flags and their registry are removed. Runtime rollback is repository-level `git revert`, not a second live truth path.
- promotion-only rollback/diff workflow machinery is retired after serving its gate purpose; durable canonical regression/golden tests remain.

## Relationship calibration retained during PR5

PR5 preserves qualitative relationship differentiation rather than flattening all explicit insults into one hard stop:

- ordinary explicitly targeted injury can resolve as `irritated`, `hurt`, or `withdrawn` according to relationship context and accumulated damage;
- a true hard disengagement still requires the configured combined-signal redline evidence;
- hard-boundary repair remains staged and cumulative rather than a one-apology reset;
- residual `hurt` / `irritated` survives an immediate calm follow-up while meaningful injury remains, then decays once the residual score falls below the canonical persistence floor;
- hard-boundary state remains orthogonal to raw numeric injury scores, so FSM recovery is driven by the persisted boundary context plus repair evidence rather than an arbitrary numeric floor alone.

## Verification requirement

PR5 may merge only when the exact final head has all normal repository gates green:

1. Architecture contracts,
2. Autonomous runtime contracts,
3. beta runtime regression,
4. beta conversation acceptance,
5. full Vitest suite,
6. TypeScript check,
7. production build,
8. docs/behavior governance guards,
9. Architecture Review.

Temporary diagnosis/codemod workflows and files must not exist in the final diff.

## Consequences

- There is one production behavior truth path rather than a canonical/legacy runtime split.
- Tests now describe canonical semantics and authority boundaries directly instead of toggling rollout flags.
- Future changes cannot use a hidden compatibility branch as a fallback; rollback is explicit version-control rollback.
- New regressions must be fixed in the canonical authority layer or its contracts, not by reintroducing retired flags.
