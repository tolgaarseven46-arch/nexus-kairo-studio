# ADR-0017 — SocialAppraisal parity extraction

Status: accepted

## Context

Appraisal-like logic currently exists in more than one runtime location. Before rewiring production consumers, we need a behavior-preserving extraction seam with explicit parity tests.

## Decision

Create `socialAppraisalEngine.ts` as the future shared appraisal implementation surface and first move/copy the current formulas behind parity tests without changing runtime consumers yet.

The extracted surface includes:

- relationship harm confidence;
- semantic negative-pattern classification from canonical fields only;
- relationship-context categorical appraisal (friendly/damaged/severe/healing/closeness);
- reuse of the existing `appraisalEngine` expectedness calculation.

## Safety

This PR is parity-only. Production behavior continues to use the existing consumers until the next migration PR rewires them. Parity tests compare extracted results against the current runtime behavior to prevent accidental semantic drift.

## Next step

Rewire `kdmRelationshipReducerBridge` and `relationshipBehaviorService` to consume these shared appraisal computations, then remove the duplicate formulas from their old locations.
