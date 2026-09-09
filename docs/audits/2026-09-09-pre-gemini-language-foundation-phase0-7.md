# Pre-Gemini Language Foundation — Phase 0–7 Audit

Date: 2026-09-09
Status: bounded audit + test-only characterization; production runtime behavior unchanged

## Scope
Raw user input -> canonical Kaira decisioning -> either local YDK rendering or final-provider prompt. Instance/community language learning is deferred.

## Frozen responsibility chain
L0 raw input; L1 normalization/tokenization; L2 morphology/syntax evidence; L3 lexical/MWE/idiom/register evidence; L4 entity/reference/target grounding; L5 discourse/context; L6 canonical `SemanticInterpretation@2`; L7 confidence/uncertainty/provenance; L8 social appraisal; L9 relationship + dynamic state; L10 knowledge/memory/epistemic; L11 DialogueDecision/BehaviorContract; L12 ResponsePlan; L13 YDK/provider routing; L14 final prompt; L15 delivery gate.

## Current-main findings
- L2 seam already exists but current Zemberek REST wrapper calls only `/lemmas` and returns lemma-only tokens.
- L3 local lexical/pragmatic coverage remains heavily hand-written.
- L6 is already the canonical single semantic gateway.
- L7 has coarse uncertainty + global evidence, but no mandatory per-field provenance.
- YDK is already after DialogueDecision/ResponsePlan and is a verbalizer, not intent authority.
- bounded legacy raw-text compatibility paths remain downstream; treat them as shadow-authority risk, not automatically as active product bugs.

## Frozen Phase-2 failure families
1. negated apology/advice
2. stop paraphrases
3. reported third-party dative target
4. contextual/sufficiency `yeter`
5. explicit second-person target completion
6. punctuation-free `mi/mı/mu/mü`
7. generic `seviyorum`
8. inflected interrogatives
9. playful-disrespect paraphrases
10. downstream raw-text agreement shadow authority
11. fallback canonicalizer/self-memory ownership bypass
12. same-turn already-answered obligation
13. response routing/final-delivery authority

Primary first seams: L2={1,3,5,6,8}; L3={2,4,7,9}; L4={3,5}; L5/L6={10,11}; L11={12}; L13/L15={13}.

## Phase 3 resource survey
- Zemberek: mature morphology/disambiguation/informal-Turkish capabilities, but current Kaira adapter only consumes lemmas and performs per-token REST requests.
- `nlptoolkit-morphologicalanalysis`: JS/TS-native isolated proof candidate; not selected for production.
- UD Turkish BOUN/Kenet: reference/test corpora, not runtime authority.

## Phase 4 isolated morphology proof
Result: **GO with limits**.

Observed evidence:
- `dilemiyorum` -> `NEG + PROG1 + A1SG`
- `arkadaşına` -> `P2SG/P3SG + DAT`
- `senle/seninle` -> `A2SG + INS`
- `sende` -> `A2SG + LOC` plus adverb ambiguity
- `mi` -> noun + `QUES` ambiguity; `mı/mu/mü` -> `QUES`
- `neredeydin` -> interrogative + `LOC + PAST + A2SG`
- `yaptın` -> `PAST + A2SG`
- `yapacaksın` -> `FUT + A2SG`
- `kimlerle` -> zero parse

Conclusion: morphology is useful evidence but not a complete Turkish-understanding solution.

## Phase 5 contract audit
- Keep morphology outside `SemanticInterpretation@2` as typed L2 evidence.
- Only L6 may adjudicate it into semantic truth.
- `SemanticInterpretation@3` is not justified.
- Important correction: the legacy `TurkishMorphToken` single-analysis shape cannot preserve competing analyses. Therefore a richer L2 evidence contract is needed, not a semantic-schema version change.
- Main remaining L7 gap: field-level confidence/provenance.

## Phase 6 typed-evidence shadow proof
Test-only characterization, no production import.

Proved:
- typed routine evidence can map greeting/how-are-you/what-doing;
- unanimous `NEG` blocks positive apology reading;
- affirmative apology stays apology;
- clause-scoped `QUES` supports information-request;
- ambiguous `mi` without clause evidence does not force a question and remains high-uncertainty.

Fast CI: PASS.

## Phase 7 real-gateway morphology-consumption characterization
Result: **current fallback/local semantic path does not consume morphology evidence for semantic decisions.**

Characterization showed the same message with contradictory synthetic morphology (`NEG` vs `POS`) produced identical `fallback_regex` interpretations. Morphology is carried only as sidecar today. Zero-parse remains visible as sidecar evidence.

Therefore the infrastructure exists, but morphology currently provides no semantic value on the local fallback path.

Fast CI: PASS.

## Rich L2 evidence contract added
New test-safe typed contract preserves:
- multiple competing analyses per token;
- optional preferred-analysis ranking without granting semantic authority;
- explicit zero-parse tokens;
- morphology tags/confidence per analysis.

A backward-compatible adapter maps current legacy/Zemberek output into this richer contract without inventing alternatives. Lemma-only Zemberek output remains weak single-analysis evidence; empty tokens remain zero-parse.

Fast CI for ambiguity contract and adapter: PASS.

## Next bounded decision
Before any production wiring, compare morphology-provider options on:
1. rich evidence coverage,
2. ambiguity/disambiguation support,
3. zero-parse behavior,
4. startup/runtime latency,
5. deployment/resource cost.

No provider will be selected only because one proof passed.

## Guards
- no downstream raw-text semantic parser
- no morphology semantic truth outside L6
- no regex expansion to satisfy morphology tests
- no semantic-provider removal yet
- no learning/community-language work
- no YDK routing before ResponsePlan
- frozen failure set remains frozen
