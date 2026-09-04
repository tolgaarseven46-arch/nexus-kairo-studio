# Phase 2 supplement — Advice obligation versus topic shift

Status: PRECOMMITTED before product-code change.

## Production evidence

The valid S7 production smoke preserved canonical snapshots and reproduced a new typed-priority failure on:

- `discourseAct=topic_shift`
- `adviceRequested=true`
- `target=event`

DialogueDecision selected `follow_topic_shift`, so no answer obligation existed and final delivery was `he tamam`.

This is not a raw-language problem and must not be fixed by special-casing `neyse` or the literal sentence.

## Authority claim

`adviceRequested=true` is an explicit user-facing conversational obligation. `discourseAct=topic_shift` describes discourse transition, but cannot erase that obligation.

For a turn containing both typed signals:

- DialogueDecision must select `answer_or_clarify` (unless a higher hard boundary such as explicit repair/recall semantics owns the move),
- the existing DialogueDecision-owned answer obligation must be attached,
- ResponsePlan/guards may constrain delivery but may not silently demote the turn to a topic-shift acknowledgement.

## Counter-probe

A pure typed topic shift with `adviceRequested=false` must remain `follow_topic_shift`.

## Non-goals

- No raw-text or `neyse` detection.
- No SemanticInterpretation rewrite downstream.
- No global reordering of repair/recall/correction authorities beyond the measured advice-vs-topic-shift conflict.
