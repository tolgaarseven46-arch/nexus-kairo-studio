# ADR-0017: Semantic provider field-quality contract

- Status: Accepted
- Date: 2026-09-03

## Context

After PR #35, `SemanticInterpretation@2` is the only semantic authority consumed by the canonical runtime. Downstream layers no longer reparse raw text to recover missing intent, discourse or target semantics. This makes provider field quality a first-class product boundary rather than a best-effort hint.

The LLM semantic provider already enforced complete JSON/schema validity, but its permanent tests covered only transport/schema mechanics. The provider prompt listed discourse enums without operational Turkish cue mappings for several fields that now drive canonical behavior directly (`socialRoutine`, `discourseAct`, `repairSignal`, `adviceRequested`, explicit stop facets, target scope and insult ambiguity).

## Decision

The provider prompt owns explicit utterance-level cue semantics for the following acceptance families:

1. social routines;
2. emotional openings;
3. generic complaint/confusion without automatic repair;
4. typed clarification/relevance repair signals;
5. conversational recall;
6. third-party reported hostility;
7. target-ambiguous lone insult words;
8. explicit stop-questions vs stop-talking;
9. explicit advice requests layered over emotional sharing.

A permanent deterministic recorded-output matrix locks those field semantics without calling an external model in CI.

### Lone lexical hostility rule

A single target-ambiguous insult/slur token is candidate evidence only. Without corroborating target/context hostility, the provider must not stamp `primaryIntent:"insult"` or `secondarySocialActs:["insult"]`; it must keep `target:"unknown"`, wide uncertainty and cautious severity. This is required because the deterministic v2 -> `SemanticEvent` projection treats an explicit insult intent/act as an actual insult signal.

Explicitly targeted hostility such as `sen salaksın` remains free to produce an insult intent/act and relationship-sensitive severity.

### Repair rule

`repairSignal` describes an utterance-level request to clarify/relevance-repair Kaira's immediately preceding content; it is not a dialogue-policy decision. Generic complaint or negative evaluation alone must leave `repairSignal:"none"`.

### Stop rule

`stopRequest` remains identical to `discourseFacets.stopTalking`. `soru sorma artık` sets only `stopQuestions`; full-conversation stop language sets `stopTalking` and therefore `stopRequest`.

## Non-goals

- No downstream dialogue, relationship, repetition or emotional-load threshold is changed.
- The deterministic CI fixtures do not claim to measure live vendor-model accuracy. They define the provider contract and prompt semantics that live-model evaluation must satisfy.
- No regex fallback is promoted into a competing semantic authority.

## Consequences

Future provider/prompt changes cannot silently collapse these canonical fields while still returning schema-valid JSON. A live-model quality campaign can now compare recorded provider outputs against the same matrix without changing downstream behavior to hide producer errors.
