# ADR-0033 — Final Delivery Obligation Preservation

**Status:** Accepted for Phase 1

## Context

Scenario × authority falsification S3 exposed a cross-boundary failure that sentence-level regression had not captured. On the final advice turn (`sence abartıyor muyum?`), canonical semantics marked a question/advice request and DialogueDecision selected `answer_or_clarify`, yet the canonical constraint fallback delivered `tamam`.

The relationship and semantic layers were correct. The obligation was lost during final replacement because final conformance checked structural/plan safety but did not preserve the DialogueDecision-owned conversational obligation.

A principal-architect review of the first Phase 1 draft found a second risk: if a helper/guard decides for itself what counts as satisfying an obligation, or manufactures a canned obligation fallback, it becomes a hidden second behavior authority.

## Decision

1. **DialogueDecision is the sole owner of the active conversational obligation and its satisfaction criteria.**
2. `DialogueDecisionPlan` may expose a typed `obligation` object. For `answer_or_clarify`, that object carries explicit `satisfactionCriteria` and allowed resolution classes.
3. Downstream validators may only **consume** those criteria. They cannot invent independent obligation semantics.
4. For `answer_or_clarify`, acknowledgement-only output is invalid. The delivered turn must answer, explicitly defer/decline, or ask a necessary clarification.
5. No obligation helper or final guard may manufacture a canned social reply. In particular, Phase 1 does not add a deterministic `buna şu an net cevap veremem` replacement.
6. Existing normal generation/repair remains the recovery path. The final guard may reject/flag an invalid candidate or validate a caller-supplied legacy fallback, but it does not author a new move.
7. The generic guard-authored `tamam` replacement is removed from the canonical constraint pass.
8. The rule is move-scoped. Short acknowledgements remain valid for moves where acknowledgement is the intended social act.
9. No relationship, memory, or speech-identity authority is added or changed.

## Why not ban `tamam`?

The observed word is a symptom, not the contract. `tamam`, `anladım`, `peki`, or another pure acknowledgement can erase an answer obligation. Conversely, those forms can be correct for another social move. The invariant is obligation resolution, not a global phrase ban.

## Authority boundary

- **DialogueDecision:** owns the obligation and writes `satisfactionCriteria`.
- **ResponsePlan:** owns downstream permissions/constraints but does not redefine the obligation.
- **Dialogue validator:** mechanically consumes DialogueDecision's criteria while checking a candidate.
- **Final constraint pass:** applies truth/plan constraints and caller-owned validators; it does not define fulfillment semantics or synthesize a social answer.
- **Memory / Relationship / SpeechIdentity:** cannot cancel or redefine the obligation.

## Test-contract policy

Architecture tests must protect architecture semantics, not accidental source spelling. Exact substring assertions that pinned the previous fallback loop are not authoritative contracts. Runtime/property regressions own behavioral guarantees; static/AST-style checks are reserved for actual structural constraints such as forbidden imports or layer-isolation rules.

## Acceptance criteria

- `answer_or_clarify` produces an explicit DialogueDecision-owned obligation contract.
- `answer_or_clarify + acknowledgement-only` is rejected by the dialogue validator by consuming that contract.
- Neighboring moves do not receive that obligation and retain their valid acknowledgement behavior.
- The final guard does not replace a failed answer obligation with a generic `tamam` or other guard-authored sentence.
- A rejected caller-supplied acknowledgement fallback remains rejected rather than being transformed into a new hidden-authority reply.
- The original S3 advice family cannot silently finish as acknowledgement-only content when the normal repair pipeline succeeds.

## Consequence

This closes the first falsified authority boundary without adding a new top-level layer. It also makes the distinction between **decision authority** and **mechanical validation** explicit. A future compositional/multi-obligation redesign may broaden the typed contract, but downstream guards are not allowed to become obligation-semantic authorities.
