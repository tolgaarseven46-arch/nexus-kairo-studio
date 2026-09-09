# Turkish Morphology Provider Decision — bounded checkpoint

Date: 2026-09-09
Status: decision checkpoint, no production provider selected

## Goal
Choose the next production-candidate path for L2 Turkish morphology without coupling semantic authority to a provider.

## Candidate A — current Zemberek REST wrapper

Current Kaira implementation:
- tokenizes locally;
- sends one HTTP request per token to `POST /lemmas`;
- returns lemma only;
- does not retain competing analyses, morphemes, POS or sentence disambiguation.

Verdict: **NO-GO as the final local-foundation shape.** It may remain backward-compatible infrastructure, but extending this exact per-token `/lemmas` protocol would preserve avoidable latency and weak evidence.

## Candidate B — Zemberek rich sentence analysis

Upstream Zemberek gRPC morphology contract exposes:
- sentence-level `AnalyzeSentence`;
- a best disambiguated analysis per token;
- optionally all analyses;
- lemma/POS;
- complete morpheme information;
- informal/runtime flags.

Strengths:
- strongest evidence/disambiguation of the candidates already inspected;
- sentence-level context is architecturally aligned with L2/L6;
- can preserve both best + competing analyses.

Costs:
- Java/service deployment or gRPC integration;
- process/network boundary unless colocated;
- operational complexity is higher than in-process JS.

Verdict: **strong accuracy/reference candidate; deployment cost must be justified.**

## Candidate C — `nlptoolkit-morphologicalanalysis` in-process JS

Isolated proof showed useful morphology for NEG, DAT, A2SG, QUES, LOC, PAST and FUT.

Strengths:
- in-process JS/TS integration;
- no per-token network round trip;
- exposes competing analyses;
- easy fit for the new L2 evidence contract.

Observed limitations:
- `kimlerle` returned zero parse in the frozen proof;
- several inputs remained ambiguous;
- requires multiple linguistic resource files at runtime;
- proof package is not yet accepted as production dependency.

Verdict: **strong low-latency prototype candidate, not yet production-selected.**

## Architecture decision

Do not bind L6 to any provider.

The canonical boundary is now:

`provider-specific analysis -> TurkishMorphologyEvidence -> typed L6 adjudicator -> SemanticInterpretation@2`

Therefore provider choice can change later without changing semantic authority.

## Next recommendation

For the first real local-path implementation:
1. keep existing Zemberek `/lemmas` adapter for compatibility;
2. use the JS-native analyzer only in bounded shadow/characterization mode first;
3. use Zemberek sentence analysis as the stronger comparison/reference path if JS coverage becomes a blocker;
4. do not add a second semantic parser or provider-specific rules to L6;
5. do not remove the semantic LLM until local-path acceptance proves sufficient coverage.

## Decision status

**Proceed with provider-neutral local semantic integration.**

Provider winner: **DEFERRED intentionally.**
Reason: architecture can progress without locking deployment technology, and the available evidence does not yet justify paying either the JS coverage risk or the Zemberek service-complexity cost globally.
