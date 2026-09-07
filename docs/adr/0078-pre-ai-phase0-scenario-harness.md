# ADR-0078 — Pre-AI Phase 0 Scenario Harness

Status: Accepted for tooling proof
Date: 2026-09-07

## Context

Test A/B/C exposed a recurring failure mode: a live conversation reveals one symptom, a narrow fix closes it, and a neighbouring composition case is discovered later. PR #140 and #141 improved this by adding composition invariants, captured KNT replay, neighbour proofs, and historical RED→GREEN enforcement. Before applying the next Test C fixes, we need a broader deterministic audit of the pre-generation system.

## Decision

Introduce a Phase 0 scenario harness that:

1. Starts with 21 fixed regression scenarios covering five root-cause clusters: self epistemics, semantic completeness, pragmatic appraisal, HOW/state alignment, and repair/recovery semantics.
2. Stops at a final-provider-prompt audit boundary and never calls Gemini/OpenRouter.
3. Marks every trace with `branchTrackType` and a no-AI stop marker.
4. Requires scenario-unique `userId` and `sessionId` namespaces and validates isolation.
5. Records prompt/invariant evidence including consumption trace, fact provenance, obligation realizability and prompt contradictions.
6. Includes positive controls, not only failure-seeking cases: A5 proves genuinely grounded discourse facts must remain usable; A4 proves harmless persona language must not be over-grounded.
7. Keeps regression and future exploration tracks distinct. Phase 0 is fixed/non-branching; branching exploration is deferred to Phase 1.

## Important scope limitation

The first harness iteration deliberately uses the repository's deterministic `fallback_regex` ingestion path because this phase forbids all AI providers. It therefore audits deterministic core/composition behaviour, not semantic-provider quality.

Likewise, the first tooling proof builds a production-core prompt snapshot from the same canonical behavior/dialogue/speech services, but it is **not yet allowed to claim byte-identical full `server.ts` provider-prompt coverage**. Exact server prompt-seam extraction is a follow-up requirement before scaling from Phase 0 to the 100-scenario Phase 1 corpus.

This limitation is intentional and must remain visible in test output; tooling must not create false confidence.

## Scale gate

Do not expand to the proposed 100-scenario corpus until Phase 0 demonstrates that automated invariant detection produces useful, low-noise clusters. If it does, Phase 1 may use approximately 70% controlled, 20% semi-spontaneous and 10% chaos scenarios, with fixed regression and branching exploration tracks kept separate.

## Non-goals

- No model generation quality testing.
- No output-side repair/validator testing after provider generation.
- No Test C behaviour fixes in this ADR.
- No claim that regex-floor semantics represent production semantic-provider quality.

## Follow-up acceptance criteria

Before Phase 1 scale-up:

- exact final provider prompt seam is reusable outside `server.ts` without duplicating authority;
- KNT carries consumption trace and final prompt snapshot from that exact seam;
- the 21-scenario Phase 0 run produces a machine-readable cluster report;
- user + ChatGPT + Cloud review the complete report before behaviour fixes begin.
