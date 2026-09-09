# Pre-Gemini Language Foundation — Phase 4–5 Evidence Checkpoint

Date: 2026-09-09
Branch: `codex/pre-gemini-language-foundation`
Runtime behavior change: none

## Phase 4 — morphology proof, first result

The current production morphology seam cannot by itself solve the frozen L2 failure families.

Reason:
- `TurkishMorphToken` already permits `lemma`, `pos`, `morphemes`, and `confidence`.
- `ZemberekRestMorphologyProvider` currently tokenizes the message and calls only `POST /lemmas` per token.
- It therefore fills only `surface`, `normalized`, and optionally `lemma`.
- No person/case/polarity/tense/morpheme evidence is emitted by the current adapter.

This is a capability gap in the adapter, not proof that the architecture lacks a morphology seam.

### External prototype candidate

`nlptoolkit-morphologicalanalysis` is the first isolated proof candidate because its documented finite-state output exposes transitions such as:
- DAT
- person agreement
- tense
- POS/NEG polarity
- possessive/case analyses

It is TypeScript/JavaScript-native and therefore avoids introducing a Java/REST runtime dependency merely to answer the first feasibility question.

This is **not** a production dependency decision.

### Proof surfaces remain frozen

The external analyzer proof must be limited to the already-frozen morphology families, including representative surfaces from:
- `özür dilemiyorum`
- `iş arkadaşına ... dedi`
- `senle/seninle/sende`
- `mi/mı/mu/mü`
- `neredeydin / kimlerle ... / ne yaptın`

The proof may inspect analyzer output only. It must not change canonical semantics, ResponsePlan, G4, relationship, YDK routing, memory, or provider routing.

## Phase 5 — semantic contract capacity audit

### Morphology evidence contract

No new semantic schema version is currently justified.

The existing LU morphology seam already has enough structural room for the first prototype:

```ts
interface TurkishMorphToken {
  surface: string;
  normalized?: string;
  lemma?: string;
  pos?: string;
  morphemes?: string[];
  confidence?: number;
}
```

Rich analyzer evidence can therefore remain an L2 typed evidence object consumed only by L6.

### Authority rule

Morphology evidence is **not semantic truth**.

Downstream consumers must never read L2 morphology and derive their own target/intent/valence/social act. Only the canonical L6 language-understanding gateway may adjudicate L2/L3/L4/L5 evidence into `SemanticInterpretation@2`.

### `SemanticInterpretation@2`

The current schema already contains:
- canonical intent/social acts/target/valence/severity
- discourse facets
- uncertainty
- evidence
- context-grounding trace

The identified gap is not a proven need for `SemanticInterpretation@3`; it is that confidence/provenance is coarse rather than mandatory per semantic field.

### L7 requirement before local-semantic authority can expand

Before a new local semantic path becomes authoritative, design a mandatory field-level confidence/provenance representation for the semantic fields that can materially change Kaira behavior.

The design must:
- remain metadata, not a second authority
- be impossible for downstream consumers to silently ignore where a guard requires confidence
- record conflicts/reconciliation provenance
- preserve the existing single canonical interpretation

Do **not** finalize its exact shape before the isolated morphology proof shows what evidence is actually produced.

## Decision at this checkpoint

1. Keep `SemanticInterpretation@2` as the canonical semantic authority.
2. Keep morphology as a separate typed L2 evidence object.
3. Do not expand regex coverage to simulate morphology.
4. Do not remove the semantic LLM yet.
5. Run the JS-native analyzer only as an isolated feasibility proof before any runtime integration.
6. Defer exact L7 field-provenance schema until that proof is observed.
