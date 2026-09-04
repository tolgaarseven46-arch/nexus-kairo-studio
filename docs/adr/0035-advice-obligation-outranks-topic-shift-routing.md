# ADR-0035 — Advice Obligation Outranks Topic-Shift Routing

**Status:** Accepted

## Context

The valid S7 production smoke for ADR-0034 reached a compound canonical user turn with:

- `adviceRequested=true`
- `discourseAct=topic_shift`
- `intent=emotional_share`
- `target=event`

DialogueDecision selected `follow_topic_shift` because the topic-shift branch was evaluated before the answer/advice obligation. As a result no `answer_or_clarify` obligation existed and final delivery could collapse to acknowledgement.

The canonical semantic representation was already sufficient to expose both facts. The failure was therefore a DialogueDecision priority/authority defect, not a language-understanding defect.

## Decision

1. A typed `adviceRequested=true` signal creates an explicit user-facing answer obligation in DialogueDecision.
2. A simultaneous `topic_shift` facet describes discourse transition but may not erase the advice obligation.
3. `recall_request`, immediate repair, and correction keep their existing higher specialized authorities.
4. Otherwise, a compound advice + topic-shift turn selects `answer_or_clarify` and receives the existing DialogueDecision-owned obligation/satisfaction criteria.
5. A pure `topic_shift` with `adviceRequested=false` remains `follow_topic_shift`.
6. No raw-text, lexical, or literal `neyse` rule is introduced.

## Consequence

DialogueDecision preserves compound typed semantics instead of treating `discourseAct` and advice as mutually exclusive. This completes the Phase 2 S7 path without creating a second semantic authority or changing ResponsePlan/guard ownership.
