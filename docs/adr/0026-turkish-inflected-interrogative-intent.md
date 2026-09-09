# ADR-0026 — Turkish inflected interrogative intent

Status: Accepted
Date: 2026-09-09

## Context

After ADR-0024 added punctuation-free `mi/mı/mu/mü` polar questions, Natural Characterization v2 S4 still exposed a separate family of Turkish interrogatives that fell through to canonical `smalltalk`:

- `sen dün ne yaptın`
- `gece neredeydin`
- `bugün kimlerle konuştun`
- `şimdi neredesin`
- `birazdan ne yapacaksın`

Those turns produced `natural_reaction` rather than the existing `answer_or_clarify` question obligation. The failure is therefore not cosmetic debug labeling; it changes dialogue planning.

## Decision

Extend only the deterministic canonical semantic floor's information-request signal with bounded second-person Turkish interrogative morphology:

- inflected `nerede` second-person forms such as `neredesin`, `neredeydin`, `neredeydiniz`;
- `ne` or inflected `kimle/kimlerle` followed by a bounded second-person finite predicate form.

The signal feeds the same existing `information_request` intent branch used by explicit `?`, interrogative lexemes and Turkish polar-question particles.

## Scope protection

Do not promote a bare `ne` token by itself. The following remain non-question counterexamples:

- `ne güzel hava`
- `kimya çalışıyorum`
- `neredeyse bitti`

This keeps the deterministic floor narrow while covering the measured morphology family.

## Authority boundary

This is canonical semantic ingestion only. It does not change self-memory ownership, epistemic access, G1→G4, relationship, dynamic-state, DialogueDecision heuristics, ResponsePlan heuristics or response speech style.

Self/autobiographical query ownership is a separate typed facet and must be evaluated independently after this intent gap is closed.

## Verification

Reported + neighbor + counterexample coverage lives in `kairaTurkishInterrogativeMorphologyRegression.test.ts`.

FAST Natural Characterization v2 and FULL CI are required before merge. Frozen 21/423 regression baseline remains unchanged and no provider/API call is introduced.
