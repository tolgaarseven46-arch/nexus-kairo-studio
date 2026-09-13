# ADR 0022: Relationship maturity survives real persistence hydration

## Status
Accepted

## Context
PR #202 proved long-horizon relationship continuity with a JSON persistence-style round trip and source-level assertions around the production persistence seam. PR #251 then isolated relationship maturity itself from trust and warmth and proved that established history dampens the same mild direct injury.

The remaining gap was executable integration evidence that the actual KDM persistence functions preserve the maturity-bearing relationship fields through save and hydration, and that the hydrated state drives the canonical RelationshipReducer identically.

## Decision
Lock a real persistence/hydration regression using the production `saveKdmInteraction()` and `loadKdmState()` functions with Firestore replaced only by an in-memory transport mock.

The test must prove that:

- `firstSeenAt`, `lastInteractionAt`, and `interactionCount` survive the production save/normalize/load path;
- current trust and warmth survive the same path;
- the same canonical mild direct-negative signal produces identical familiarity, conflict, hurt, reaction mode, and hard-policy output before and after hydration.

No second persistence model, relationship authority, or runtime rule is introduced. Firestore itself is not under test; the production serialization/normalization boundary is.

## Consequences
- Relationship maturity is no longer supported only by source-string checks or synthetic JSON cloning.
- A restart/hydration regression that drops maturity-bearing fields or changes reducer behavior will fail CI.
- Future persistence changes must preserve behavioral parity at the canonical reducer seam.
