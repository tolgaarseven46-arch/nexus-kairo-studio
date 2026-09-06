# ADR-0073: Self capability facts belong to canonical identity

## Status
Accepted

## Context
The exact 27-turn GoldenSession replay exposes a current-self query at Turn 16 (`sen uyuyamıyon mu şimdi`) whose canonical semantic interpretation already carries `selfMemoryQuery.scope=self_fact` and `factKey=sleep_ability`.

The existing runtime path is already structurally correct:
- the canonical semantic boundary owns `selfMemoryQuery`;
- projection preserves the typed query;
- autobiographical/self recall resolves canonical self facts by fact key;
- unresolved self facts fail closed instead of allowing model-prior invention;
- final-delivery conformance can force a resolved canonical self-fact value.

The missing ontology seam was inside canonical identity: `KairaSelfFactDomain` could represent preferences, beliefs, traits, and biography, but not capabilities. Consequently a semantic provider could name a legitimate current capability fact key while the canonical identity schema had no explicit domain in which to represent that truth.

## Decision
1. Add `capability` to `KairaSelfFactDomain`.
2. Current capability truths are canonical `self_fact` records owned by Kaira canonical identity. They are not autobiographical memories, knowledge-profile concepts, runtime identity projection fields, or response-layer rules.
3. Capability values enter canonical identity through the existing identity seed/provisioning ownership seam (or a future canonical identity revision supported by typed evidence). Downstream dialogue/runtime layers must only consume them.
4. The semantic provider may identify a typed capability query and emit a canonical `factKey`, but it must not invent the fact value.
5. If no authoritative capability fact exists, the existing self-memory runtime remains fail-closed and the final answer must not be filled from model prior.
6. This decision deliberately does **not** establish any production value for `sleep_ability` or any other capability. Whether a Kaira sleeps, eats, or has another species-level capability requires a separately authoritative species/identity canon decision and data source.

## Consequences
- Capability questions can use the same canonical self-truth path as other current-self questions without a new parser, keyword regex, or response hardcode.
- `sleep_ability` can resolve deterministically whenever canonical identity actually contains that key.
- Missing production canon remains visible as missing data rather than being hidden by a fabricated answer.
- Species-wide defaults, if introduced later, must be projected into canonical identity through an explicit owner rather than duplicated across prompt or dialogue layers.

## Regression evidence
`src/services/kairaSelfCapabilityOntologyRegression.test.ts` proves that a test-only `capability` self fact with `factKey=sleep_ability` is resolved by canonical fact-key match and reaches the existing selective self-memory instruction. The fixture uses a non-lore placeholder value so the test cannot accidentally establish production species canon.
