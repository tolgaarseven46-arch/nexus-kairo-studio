# ADR-0087: Bounded autobiographical context for SocialAppraisal

- Status: Accepted
- Date: 2026-09-08

## Context

`SocialAppraisalInput` already reserved a memory boundary, but its autobiographical field was `unknown[]` and G4 did not consume it. Kaira therefore combined canonical semantics, relationship state, personality, current affect, and learned dyadic norms, but not her own lived autobiographical episode depth.

Directly passing raw autobiographical memories into G4 would create a second semantic authority: appraisal could begin interpreting `eventType`, facts, or emotion labels independently from canonical per-turn semantics. Loading Firestore inside G4 would also couple a deterministic appraisal function to persistence.

Before this ADR, durable participant identity was repaired by ADR-0085 and world-observation user provenance was made injective by ADR-0086. Active-user autobiographical ownership can therefore be selected exactly.

## Decision

Introduce a typed `SocialAppraisalAutobiographicalContext` summary containing only:

- durable participant id;
- lived ordinary episode count;
- salient episode count;
- mean/max canonical salience;
- mean per-episode maximum emotional intensity.

The summary MUST NOT carry raw facts, event text, `eventType`, or emotion labels.

`buildSocialAppraisalAutobiographicalContext` owns projection from canonical identity state into this bounded active-user summary. It includes only canonical `lived` + `ordinary` memories whose participant ids exactly contain `user:<persistentUserIdentityScope(userId)>`.

G4 may use this summary only as bounded affective-depth modulation. It may increase the magnitude/activation of an affective projection that G3 already resolved. It MUST NOT:

- create effect from an exact-zero projection;
- change semantic target, intent, or valence;
- change relational direction;
- change harm or repair evidence because of autobiographical depth;
- inspect raw memory facts or labels.

Relationship quality remains owned by `RelationshipState`; event-family expectation remains owned by the learned dyadic norm; canonical per-turn meaning remains owned by `SemanticInterpretation@2` / G3.

## Runtime boundary

This ADR establishes the typed projection and G4 consumption contract. Persistence/loading remains upstream. G4 itself stays synchronous and pure with respect to storage.

A follow-up runtime seam will load the Kaira-instance-owned canonical identity upstream, build the active-user summary, and pass it through the KDM runtime input. Until that wiring lands, absence of memory context preserves byte-for-byte baseline appraisal behavior.

## Regression proof

`src/services/socialAppraisalAutobiographicalContextNeighborProofRegression.test.ts` is the historical RED→GREEN proof against pre-feature main `7bccf84e06e050f14901f2efb337acd6ead4e2b9`.

The reported case and two neighbors prove that rich shared lived-episode depth deepens already-material negative/positive affective significance and activation. The counterexample proves relational harm evidence remains unchanged by autobiographical depth.
