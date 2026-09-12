# ADR 0011: Commitment / Betrayal Social-Appraisal Boundary

- Status: In validation (PR #237)
- Date: 2026-09-12

## Context

Kaira already has world-event/world-memory lifecycle data that can represent active commitments. The social-appraisal layer needs to evaluate a later commitment violation without creating a second memory authority, reparsing raw text downstream, or allowing prior memory alone to manufacture a current-turn betrayal judgment.

## Decision

1. A commitment remains bounded typed evidence projected from the existing world-event/world-memory lifecycle; no separate commitment-memory authority is introduced.
2. Betrayal and unfairness are SocialAppraisal concepts. `RelationshipReducer` remains aggregate-only.
3. Current-turn actor, scope, intentionality and commitment-violation evidence come only from canonical `SemanticInterpretation@2.attribution`.
4. Commitment appraisal modulation is inactive when canonical current-turn attribution is absent. Prior world-memory evidence alone must not mutate ordinary G4 appraisal output.
5. Betrayal may be `present` only when an active prior commitment matches the same actor and scope and the canonical current turn proves an intentional violation with non-empty provenance and positive confidence.
6. Missing or mismatched evidence fails closed as `unknown` or `absent`; downstream inference must not fill semantic gaps.
7. Commitment evidence alone is insufficient to establish unfairness. Comparative treatment or explicit norm evidence is required, so unfairness remains `unknown` when that evidence is absent.
8. Provider/API behavior is outside this contract; deterministic regression proof remains provider-free.

## Proof

`socialAppraisalCommitmentBetrayalRegression.test.ts` covers the deterministic A–E matrix: no prior commitment, matching intentional violation, party mismatch, scope mismatch, and missing intentionality/provenance, plus the unfairness fail-closed case.

## Consequences

Ordinary G4 appraisal stays structurally compatible when no canonical commitment attribution exists. Cross-turn betrayal can still create relational injury from exact-zero lexical severity, but only after the typed cross-turn evidence contract is satisfied.
