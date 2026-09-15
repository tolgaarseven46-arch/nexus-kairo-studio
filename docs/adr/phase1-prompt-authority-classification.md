# ADR — Phase 1 Prompt Authority Classification

## Status
Accepted for Phase 1 PR-1 implementation scope.

## Context
Phase 0 proved that final provider prompt parts are string-only and cannot mechanically express whether a block is social behavior authority, epistemic authority, grounding, observational evidence, HOW/style, assembly-only, or a known mixed/unresolved legacy surface. #260 also proved that a block label such as observational is not enough when its content carries a realizer-facing behavior directive.

## Decision
Introduce typed prompt-block authority metadata as a **diagnostic mechanism** without changing production prompt bytes or cleaning unrelated content in this PR.

Initial authority classes:
- `social_behavior_authority`
- `epistemic_authority`
- `identity_grounding`
- `observational_evidence`
- `how_style`
- `mixed_unresolved`
- `assembly_only`

The diagnostic checker:
1. reuses the existing Phase-0 `prompt_instruction_contradiction` audit for question-authorization probes rather than creating a duplicate detector;
2. adds a typed-boundary probe for the known T3 social-move-selection family;
3. reports `mixed_unresolved` blocks as warnings, not as runtime rejection;
4. does not mutate, reject, reorder, or otherwise change the production prompt.

## Non-goals
- No Dialogue Board content fix (T3) in PR-1.
- No `server.ts` socialStyle cleanup (T4).
- No Conversation Grounding cleanup (T6).
- No SpeechIdentity semantic change (T2).
- No Controlled Spontaneity historical-semantic change (T1).
- No repair-path change (T5).

## Consequences
Prompt ownership becomes machine-readable and known shadow-authority families become self-validating in tests. Existing mixed surfaces remain visible for their separately owned Phase-1 PRs instead of being silently blessed or opportunistically refactored here.

## Reopen condition
Revisit the authority-class vocabulary only if a concrete provider-facing block cannot be represented without conflating two canonical authority domains, or a compound/authority regression demonstrates that the current classes hide a real owner conflict.
