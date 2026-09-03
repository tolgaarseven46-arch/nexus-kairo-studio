# ADR-0011: CANONICAL_PATH_PROMOTION_GATE evidence execution

- **Status:** Proposed
- **Date:** 2026-09-03
- **Parent:** ADR-0006

## Context

ADR-0006 forbids PR5 compatibility removal until `CANONICAL_PATH_PROMOTION_GATE` is satisfied. The gate is evidence-driven rather than time-driven and requires canonical beta acceptance, golden/drift stability, recorded-session replay, a verified rollback drill, and an explained canonical-vs-legacy behavior diff review.

PR #32 completed `UNIFIED_GUARD_PASS`; the next development step is therefore promotion evidence, not PR5.

## Decision

Add one repository-owned automated evidence runner, `scripts/run-canonical-path-promotion-evidence.mjs`, backed by `config/canonical-path-promotion-evidence.json`.

The runner executes three independent checks:

1. **Canonical beta acceptance:** the existing beta acceptance manifest with every ADR-0006 canonical flag explicitly ON.
2. **Recorded-session replay:** golden/foundation/runtime long-session and persistence fixtures with every canonical flag explicitly ON.
3. **Rollback drill:** acceptance/persistence/long-session evidence with every canonical flag explicitly OFF, proving the legacy path remains executable and persisted state remains readable after the flip.

`.github/workflows/canonical-promotion-evidence.yml` executes the runner on pull requests and manual dispatch so the evidence is produced on a fresh checkout rather than inferred from local state.

## Evidence discovered while exercising the gate

The gate exposed both intentional canonical differences and one real reducer defect class. These were not hidden by loosening the canonical contracts.

### Intentional / explained differences

- **One-word insult ambiguity:** under `SemanticInterpretation@2`, a lone lexical insult such as `salak` is only a candidate signal. It is not forced into a Kaira-directed injury without independent target/hostility evidence. The canonical acceptance fixture therefore uses the explicitly targeted `sen salaksın`; the all-flags-OFF rollback preserves the historical `salak` legacy fixture.
- **Hard-boundary qualitative mode:** a sufficiently strong targeted canonical injury enters `withdrawn`/`disengaged`; the historical acceptance trajectory classified its legacy injury as `hurt`. The canonical HOW remains reserved/very-short rather than reopening familiarity.
- **Staged repair:** a hard canonical disengagement reopens through explicit, accumulated repair evidence rather than a single automatic apology. With the current runtime sincerity projection, the acceptance trajectory remains disengaged through the first two explicit repair acts and crosses into `repairing` on the third; later calm/positive repair progression can return it to `active`.
- **Hard boundary is orthogonal to numeric injury:** strong prior relationship history can damp numeric `hurt`/`conflict` to very low values while a combined-signal hard boundary still exists. Repair therefore cannot be defined only as numeric score decay.

### Reducer defect found and fixed

The original canonical reducer required numeric `hurt`/`conflict >= repairInjuryFloor` before `repairProgress` could increase. A hard boundary could therefore create `conversationState=disengaged` while good-history damping left both numeric injury scores below that floor. That state could never satisfy the FSM's repair-progress threshold and was permanently stuck.

A second form of the same defect appeared after leaving `disengaged`: once the state became `repairing`, the hard-boundary context was no longer considered repairable if numeric injury was low, so `repairProgress` decayed while the FSM simultaneously required a higher progress threshold to return to `active`.

The reducer now treats a persisted hard-boundary context as repairable while the previous conversation state is either `disengaged` or `repairing` and `disengageReason` remains present. When the FSM reaches `active`, the existing active-state cleanup clears the disengagement context and ordinary no-injury repair decay resumes. The separate invariant remains intact: an active relationship with zero injury cannot manufacture fake repair progress merely because an apology is present.

`kairaCanonicalHardBoundaryRepairRegression.test.ts` permanently covers the low-numeric-injury hard-boundary recovery path and the zero-injury active-state non-accumulation invariant.

## Automated evidence result

On PR #33 fresh-checkout GitHub Actions, the automated promotion evidence reached and passed all three phases after the reducer defect was fixed:

- canonical beta acceptance: green,
- canonical recorded-session/golden replay corpus: green, including the hard-boundary repair regression,
- all-five-flags-OFF rollback drill: green.

This closes the **automatable** subset of the promotion gate. It does not by itself authorize PR5.

## Important non-claim

The full promotion gate is **not** declared complete by this ADR. The final requirement remains intentionally review/evidence based:

- canonical-vs-legacy behavior diff review on a shared input corpus,
- every observed delta must be classified as intentional or fixed,
- unexplained deltas block PR5.

The path-specific acceptance fixture preserves historical rollback behavior and canonical semantic correctness; it is not a substitute for the separate same-input diff review.

Until that review is complete, canonical flags remain temporary and PR5 compatibility removal is forbidden.

## Rollback semantics

The drill explicitly writes all five canonical environment flags as `0`; it does not rely on missing environment variables. This prevents an inherited CI environment from accidentally exercising a mixed path while reporting a rollback success.

## Consequences

- Promotion evidence is reproducible and repository-owned.
- The automated gate now detects semantic differences and FSM deadlocks rather than allowing them to be inferred away.
- A green automated workflow closes only the automatable subset of the gate.
- PR5 remains blocked until the same-input canonical-vs-legacy behavior diff review is separately recorded and approved.
