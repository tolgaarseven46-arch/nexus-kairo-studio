# ADR-0096: Canonical identity persistence envelope validation

## Status
Accepted

## Context
Adversarial persistence validation found that canonical identity hydration normalized `schemaVersion` to `1` and defaulted missing top-level arrays to empty arrays before validation. A future/unknown persisted schema version or interrupted partial write could therefore be interpreted as valid current state.

## Decision
The canonical identity store validates the persisted envelope before normalization or mutation. A persistent document is eligible for hydration only when:

- `kairaInstanceId` is a non-empty string,
- `schemaVersion === 1`,
- `selfFacts` is an array,
- `autobiographicalMemories` is an array.

Envelope mismatch or malformed nested state fails closed and is not hydrated. Transactional append and self-fact revision also refuse to mutate an invalid persistence envelope. Storage/transport exceptions remain `unavailable`; invalid persisted content is treated as unusable persisted state rather than transport failure.

## Consequences
- Unknown future schema versions cannot be silently downgraded to v1.
- Partial/interrupted documents cannot silently become empty canonical state.
- No new semantic authority, parser, provider dependency, or API call is introduced.
- Future schema migrations must be explicit rather than implicit coercion.
