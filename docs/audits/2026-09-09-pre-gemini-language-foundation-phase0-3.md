# Pre-Gemini Language Foundation — Phase 0–5 Audit

Date: 2026-09-09
Status: bounded audit / no runtime behavior change

## Scope

This checkpoint covers only the path from raw user input through canonical Kaira decisioning to either local YDK rendering or the final-provider prompt. Instance/community language learning is explicitly deferred.

## Frozen responsibility chain

- L0 raw input surface
- L1 normalization/tokenization
- L2 morphology/syntax evidence
- L3 lexical/MWE/idiom/register evidence
- L4 entity/reference/target grounding
- L5 discourse/conversational context
- L6 canonical semantic composition (`SemanticInterpretation@2`)
- L7 mandatory confidence/uncertainty/provenance metadata
- L8 social appraisal
- L9 relationship + dynamic state
- L10 grounding/knowledge/memory/epistemic resolution
- L11 dialogue decision / BehaviorContract, including same-turn-already-answered obligation check
- L12 canonical `KairaResponsePlan`
- L13 response route selector (local YDK vs final provider), only after L12
- L14 final prompt assembly
- L15 final constraint/delivery gate

## AS-IS mapping on current main

| Level | Current owner / evidence | Status |
| --- | --- | --- |
| L0 | `languageUnderstandingService`, server ingress | exists |
| L1 | several normalizers plus morphology/provider normalization | distributed; no single typed owner |
| L2 | `MorphologyProvider` seam + `zemberekMorphologyProvider` | seam exists; current Zemberek REST wrapper only retrieves lemmas, not rich morphosyntax |
| L3 | semantic LLM knowledge + deterministic regex floor/canonicalizer | exists but hand-written surface coverage is a major weakness |
| L4 | `entityResolutionEngine` + typed reconciliation in `languageUnderstandingService` | explicit seam exists |
| L5 | canonical discourse facets + `discourseStateReducer` | explicit seam exists; compatibility/raw fallback paths remain in dialogue history handling |
| L6 | `languageUnderstandingService` single gateway -> `SemanticInterpretation@2` | clear canonical authority |
| L7 | `uncertainty`, `evidence`, grounding trace | exists but not mandatory field-level provenance/confidence for every semantic field |
| L8 | `socialAppraisalEngine` / canonical KDM path | explicit |
| L9 | canonical KDM relationship reducer bridge + dynamic state | explicit |
| L10 | autobiographical recall runtime, world-memory runtime, epistemic gate | explicit but intentionally distributed by truth domain |
| L11 | `kairoDialogueDecisionEngine` + BehaviorContract | explicit; production current turn receives canonical event; legacy compatibility parse paths remain |
| L12 | `kairaResponsePlan` | explicit final WHAT/WHETHER authority |
| L13 | `tryLocalKairoReply` called with dialogue move + ResponsePlan + canonical semantic event | correct order; YDK is a verbalizer, not an intent classifier |
| L14 | `kairaFinalProviderPrompt` + canonical prompt builder | explicit |
| L15 | response constraint pass + final delivery gate | explicit |

## Important current-main findings

1. The architecture does **not** lack a morphology seam. `TurkishMorphologyResult` already supports `lemma`, `pos`, `morphemes`, and `confidence`.
2. The configured Zemberek REST implementation currently calls only `/lemmas`, so the rich fields are practically unused.
3. The semantic LLM provider already receives the morphology object in its prompt.
4. `SemanticInterpretation@2` already has uncertainty/evidence, but confidence/provenance is not mandatory per semantic field.
5. YDK/local rendering is structurally after canonical DialogueDecision/ResponsePlan in production and does not own semantic intent classification.
6. Current-turn production DialogueDecision receives the canonical event. Raw-text parsing still exists in bounded legacy/compatibility paths and should be treated as a shadow-authority risk, not automatically as an active production bug.

## Frozen Phase-2 failure families

The audit will not grow this list while classification is in progress.

1. negated apology/advice (`özür dilemiyorum`, `tavsiye istemiyorum`)
2. stop paraphrases
3. reported third-party dative target (`iş arkadaşına ... dedi`)
4. contextual/sufficiency `yeter`
5. explicit second-person target completion (`senle/seninle/sende`)
6. punctuation-free polar questions (`mi/mı/mu/mü`)
7. generic `seviyorum` preference vs compliment
8. inflected interrogatives (`neredeydin`, `kimlerle ...`, `ne yaptın`)
9. direct playful-disrespect paraphrases (`kafan basmıyor`, `saçmalıyorsun`)
10. downstream raw-text agreement shadow authority
11. fallback canonicalizer/self-memory ownership bypass
12. same-turn already-answered obligation family
13. response routing/final-delivery authority family

### First classification

- L2 morphology/grammar: 1, 3, 5, 6, 8
- L3 lexical/pragmatic evidence: 2, 4, 7, 9
- L4 grounding: 3, 5
- L5/L6 authority/composition: 10, 11
- L11 obligation completeness: 12
- L13/L15 routing/delivery: 13

Several failures cross levels; the classification identifies the first language/authority seam that must own the evidence, not a downstream patch location.

## Phase-3 resource survey — bounded conclusions

### Zemberek

Strengths:
- mature Turkish morphology
- ambiguity resolution
- informal Turkish analysis
- tokenization/normalization modules
- Apache-2.0 code

Constraint:
- current Kaira REST adapter uses only lemma output, leaving most available morphology unused
- upstream project is in slow maintenance

### `nlptoolkit-morphologicalanalysis`

Strengths:
- TypeScript/JavaScript native
- ISC license
- recent npm releases
- exposes actual transition analyses such as DAT, person, tense and polarity through its finite-state analyzer

Use in this project:
- first isolated morphology proof candidate because it avoids a Java/REST deployment dependency
- not yet selected as production dependency

### Universal Dependencies Turkish

BOUN/Kenet treebanks provide manually annotated lemmas, POS, morphology and dependency relations. They are test/reference corpora, not the runtime semantic authority.

## Phase-4 isolated morphology proof

Question:

> Can a real Turkish morphological analyzer produce useful typed evidence for our frozen failure families without adding new regex semantic authority?

Result: **GO, with bounded limitations.**

The isolated `nlptoolkit-morphologicalanalysis@1.0.20` proof produced:

| Surface | Relevant evidence observed |
| --- | --- |
| `dilemiyorum` | `NEG + PROG1 + A1SG` (plus an alternate parse) |
| `arkadaşına` | `NOUN + P2SG/P3SG + DAT` |
| `senle` | `PRON + PERS + A2SG + INS` |
| `seninle` | `PRON + PERS + A2SG + INS` |
| `sende` | `PRON + PERS + A2SG + LOC`, plus an adverb ambiguity |
| `mi` | `QUES + PRES + A3SG`, plus a noun ambiguity |
| `mı` | `QUES + PRES + A3SG` |
| `mu` | `QUES + PRES + A3SG` |
| `mü` | `QUES + PRES + A3SG` |
| `neredeydin` | interrogative pronoun + `LOC + PAST + A2SG` |
| `kimlerle` | **no parse returned** |
| `yaptın` | `VERB + POS + PAST + A2SG` |
| `yapacaksın` | `VERB + POS + FUT + A2SG` |

### Interpretation of Phase-4 result

1. A real morphology layer can replace several hand-written surface assumptions with typed linguistic evidence.
2. Morphology alone is **not** a complete Turkish-understanding solution. `kimlerle` failed outright, and several other surfaces returned multiple analyses.
3. Therefore disambiguation, lexical/MWE evidence, context, syntax and canonical adjudication remain separate responsibilities.
4. The proof does **not** justify selecting this package as the production dependency yet.
5. The proof does **not** justify removing the semantic provider.
6. The existing `TurkishMorphologyResult` seam is directionally sufficient to carry richer evidence; there is still no evidence requiring `SemanticInterpretation@3` at this stage.

## Phase-5 contract audit

Question:

> How should rich morphology evidence be represented and consumed without creating a second semantic authority?

Result: **keep morphology as a typed sidecar; keep `SemanticInterpretation@2` as the only semantic truth.**

### Contract decision

- `LanguageUnderstandingResult.morphology` is the correct place for raw/analyzer morphology evidence.
- `SemanticInterpretation@2` should **not** embed raw analyzer parses or morphology-provider-specific tags.
- L6 alone may consume morphology + lexical + entity + discourse/context evidence and adjudicate canonical semantic fields.
- Ambiguous morphology (`sende`, `mi`, `arkadaşına`) must remain ambiguous evidence until L6 resolves it with context.
- Zero-parse (`kimlerle`) must remain explicit evidence absence / uncertainty; it must never force a fallback semantic conclusion.
- The existing `SemanticInterpretation@2` meaning schema is sufficient for the current proof families. No `@3` migration is justified yet.

### L7 gap

Current uncertainty is coarse-grained (`overall`, `intent`, `target`, `severity`) and `evidence[]` is global. The remaining contract weakness is **field-level confidence/provenance**, e.g. which evidence actually supported `target`, `primaryIntent`, `socialRoutine`, or `severity`.

This does not yet require a schema-version break. The next prototype should prove the minimum provenance shape before any contract extension is committed.

## Phase-6 local semantic shadow prototype boundary

The next bounded proof is not a product behavior switch. It must run in shadow/test mode only.

Admitted families:
1. greeting / how_are_you / what_doing
2. simple negation
3. simple `mi/mı/mu/mü` polar questions

Goal:

> Can local typed linguistic evidence produce the same canonical `SemanticInterpretation@2` decisions for these narrow families without becoming a parallel semantic authority in production?

Guards:
- no provider removal
- no YDK routing change
- no ResponsePlan change
- no relationship/G4/memory change
- no new downstream raw-text parser
- no learning/community language work
- local result is characterization/shadow evidence until acceptance criteria are met

## Guards

- no new downstream raw-text semantic parser
- no morphology evidence may become semantic truth outside L6
- no regex expansion merely to make the morphology prototype pass
- no semantic LLM removal yet
- no instance/community learning in this phase
- no YDK routing before ResponsePlan
- Phase-2 input set remains frozen
