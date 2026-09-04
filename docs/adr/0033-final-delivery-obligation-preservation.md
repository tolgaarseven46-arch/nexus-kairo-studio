# ADR-0033 — Final Delivery Obligation Preservation

**Status:** Accepted

## Context

Scenario × authority falsification S3 exposed a cross-boundary failure that sentence-level regression had not captured. On the final advice turn (`sence abartıyor muyum?`), canonical semantics marked a question/advice request and DialogueDecision selected `answer_or_clarify`, yet the canonical constraint fallback delivered `tamam`.

The relationship and semantic layers were correct. The obligation was lost during final replacement because final conformance checked structural/plan safety but did not treat unresolved acknowledgement-only output as a DialogueDecision violation.

## Decision

1. DialogueDecision remains the owner of the active conversational obligation.
2. For `answer_or_clarify`, acknowledgement-only output is invalid. The delivered turn must answer, explicitly defer/decline, or ask a necessary clarification.
3. Final constraint processing validates the same obligation on every replacement candidate.
4. When no safe substantive `answer_or_clarify` fallback is available, DialogueDecision exposes a deterministic non-fabricating explicit defer: `buna şu an net cevap veremem`.
5. The rule is move-scoped. Short acknowledgements remain valid for moves where acknowledgement is the intended social act.
6. No relationship, memory, or speech-identity authority is added or changed.

## Why not ban `tamam`?

The observed word is a symptom, not the contract. `tamam`, `he anladım`, `peki`, or any other pure acknowledgement can erase an answer obligation. Conversely, `tamam` can be correct for another social move. The invariant is obligation resolution, not phrase filtering.

## Authority boundary

- DialogueDecision: owns what conversational obligation must be resolved.
- ResponsePlan: owns permissions/constraints.
- Final constraint pass: validates/rejects candidates against both; it does not reclassify the active move.
- Memory / Relationship / SpeechIdentity: cannot cancel the obligation.

## Acceptance criteria

- `answer_or_clarify + acknowledgement-only` is rejected by deterministic conformance.
- An explicit non-fabricating defer is accepted.
- A fallback candidate is checked against the same obligation before delivery.
- Neighboring social moves retain their existing short acknowledgement behavior.
- The S3 advice family cannot finish as acknowledgement-only content.

## Consequence

This closes one falsified authority boundary without adding a new top-level layer. It is intentionally not a full compositional-obligation redesign; compound/multi-act planning remains a separate architecture item from the scenario audit.
