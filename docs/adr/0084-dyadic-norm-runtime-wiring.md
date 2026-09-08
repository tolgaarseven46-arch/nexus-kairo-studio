# ADR-0084: Persisted dyadic social norm runtime wiring

- Status: Accepted
- Date: 2026-09-08

## Context

ADR-0019/0022/0023 established a single typed `DyadicSocialNormProfile` and G2 person-specific candidate reweighting. ADR-0082 then made G3/G4 the runtime social-appraisal authority. However, production KDM runtime did not supply the persisted dyadic profile to `resolveRuntimeSocialAppraisal`; G3 therefore received an empty norm every turn. The learned-context model existed in isolation but was not part of the actual runtime path.

The active relationship state is already owned by the user × Kaira-instance scope (`stateOwnerScope(userId, kairaInstanceId)`). Creating a second persistence store for the same dyad would introduce another ownership boundary and synchronization problem.

## Decision

`RelationshipState.dyadicNorm` is the durable learned-social-context state for the already-scoped active Kaira↔user dyad.

Runtime order is strictly:

1. hydrate and fail-closed normalize the previously persisted `dyadicNorm`;
2. resolve G2/G3/G4 appraisal from that prior only;
3. project relationship/affect transitions;
4. derive the current turn's norm observation from canonical `SemanticInterpretation@2` plus typed relationship scope;
5. persist the resulting profile with the next relationship state.

The current turn MUST NOT update the norm before its own appraisal. This prevents self-reinforcement where an event could manufacture the prior used to interpret itself.

The local profile subject id `active-interlocutor` is not a global user identity. Isolation is provided by the enclosing user × Kaira-instance state owner. A mismatched subject id still fails closed at the G2 boundary.

Explicit `third_party` and `event` scopes MUST NOT update the active user↔Kaira dyadic norm. Observation logic may consume only typed canonical semantic evidence; raw-text reparsing is forbidden.

## Authority map

`SemanticInterpretation@2` owns what happened on the current turn.

`DyadicSocialNormProfile` owns accumulated prior evidence for this scoped dyad.

G2 owns bounded candidate reweighting from the prior; frequency may change expectedness but may never by itself create permissibility.

G3/G4 own contextual appraisal projections.

`RelationshipReducer` owns deterministic durable relationship transition.

Persistence owns serialization/hydration only and may not reinterpret social meaning.

## Consequences

The same canonical ambiguous event can now naturally produce different appraisal pressure for different persisted dyads while preserving a single semantic truth. Learned benign history may boundedly reduce literal-harm plausibility, learned harmful history may increase it, and neither can erase canonical hard harm.

No additional Firestore collection or parallel dyad authority is introduced. Existing relationship persistence carries the learned profile.

Malformed persisted norm data fails closed instead of becoming appraisal evidence.

## Regression proof

`src/services/dyadicSocialNormRuntimeWiring.test.ts` covers runtime consumption, subject mismatch, post-appraisal learning order, and third-party isolation.

`src/services/dyadicSocialNormRuntimeNeighborProofRegression.test.ts` supplies the historical RED→GREEN proof against pre-fix main `bac793829b88fc787c892618c49034a817d2ac24`: persisted dyad evidence was ignored there, while unrelated mismatched-profile behavior remains unchanged.
