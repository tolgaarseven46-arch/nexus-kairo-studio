# ADR-0027: Playful direct disrespect stays mild but dyadic

## Status
Accepted

## Context
Natural Characterization v2 S6 showed that two direct teasing/disrespect forms were not producing dyadic hurt evidence:

- `senin kafan bugün hiç basmıyor galiba`
- `bazen harbi saçmalıyorsun`

The first remained neutral smalltalk despite an explicit Kaira addressee. The second became a negative complaint but targeted the event, so the relationship trajectory stayed untouched. This made the D1-like playful/hurt characterization under-sensitive.

## Decision
At the canonical semantic-ingestion reconciliation boundary only, these bounded direct-second-person forms are normalized as mild `mockery`:

- target = `kaira`
- valence = `negative`
- complaint/mockery semantics
- disrespect/severity floor = 0.35

They are intentionally not promoted to the full insult severity used by explicit insults such as `aptalsın` or `salaksın`.

## Boundaries
- no downstream raw-text parsing
- no G1→G4 policy change
- no RelationshipReducer patch
- no ResponsePlan patch
- no memory or speech-identity change
- third-party narration remains third-party
- object-level criticism does not manufacture a Kaira target

## Verification
Reported cases, one shorter neighbor, third-party/object counterexamples, FAST Natural Characterization v2, FULL CI, and Architecture Review are required before merge.
