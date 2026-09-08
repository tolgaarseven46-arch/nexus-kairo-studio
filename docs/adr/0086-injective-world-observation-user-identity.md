# ADR-0086: Injective world-observation user identity

- Status: Accepted
- Date: 2026-09-08

## Context

Persistent Kaira ownership already uses an injective user-scope encoding in `kairaInstanceContext`: legacy-safe ids remain byte-compatible, while unsafe, overlong, or reserved-prefix ids enter the `u2_...` namespace.

`worldModelEventStore` was inconsistent with that authority. Before saving an observation it first applied a lossy character replacement to the raw user id, then passed that already-collapsed value into `worldModelOwnerScope`. Consequently distinct ids such as `user/a` and `user?a` could both become `user_a`.

The read path did not perform the same lossy preprocessing; it passed the raw id directly to `worldModelOwnerScope`. Unsafe users could therefore be written under one owner and read from another. The persisted `WorldEventObservation.userId` also carried the lossy value, which could later contaminate autobiographical participant identity.

## Decision

The injective user-scope primitive is a first-class exported authority: `persistentUserIdentityScope(rawUserId)`.

World observation persistence MUST:

1. pass the original raw user id to `worldModelOwnerScope` when selecting the Firestore owner;
2. persist `WorldEventObservation.userId = persistentUserIdentityScope(rawUserId)` as stable provenance;
3. use the same rule for direct/reported interaction observations and Kaira-owned activity observations;
4. preserve safe legacy ids byte-for-byte.

No downstream layer may recreate this identity by lossy regex replacement.

## Authority map

Raw request identity is input only.

`persistentUserIdentityScope` owns the stable user identity segment used by persistent provenance.

`worldModelOwnerScope` owns the user × Kaira-instance storage partition.

`WorldEventObservation.userId` stores the injective user provenance consumed by lived-memory consolidation.

Entity ids such as `current_user` remain turn-local semantic grounding and are not persistent user identity.

## Consequences

Distinct unsafe user ids no longer collapse into the same world-observation provenance.

New unsafe-user writes are stored at the same injective owner path that the existing read path already resolves. Safe existing user ids keep their legacy paths and stored values.

Previously written unsafe observations under the lossy path are ambiguous by construction and are not silently migrated or reassigned. A future migration may recover only rows for which independent ownership provenance exists.

This closes the remaining identity prerequisite before autobiographical memory can be safely joined into person-specific SocialAppraisal context.

## Regression proof

`src/services/worldObservationUserIdentityNeighborProofRegression.test.ts` is the historical RED→GREEN proof against pre-fix main `917d7b1b9aa71d548a57cab43c1f9ec9b66bd1da`.

Three pairs of distinct unsafe ids collapse under the old save-time replacement and remain distinct under the injective authority. The counterexample proves a legacy-safe id remains unchanged.
