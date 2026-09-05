# ADR-0018: Topic shift and conversation stop are independent semantic signals

## Status
Accepted

## Context
ADR-0016 correctly prevented pure topic closure from being promoted to a full conversation stop, but its normalization rule made `topic_shift` and `stopTalking` mutually exclusive. Natural language can explicitly request both, e.g. `bu konuyu da kapat konuşmayı da bitir`.

## Decision
`discourseAct: topic_shift` and `discourseFacets.stopTalking` are independent semantic outputs. Pure topic-local closure remains `topic_shift + stopTalking:false`. Explicit full-stop remains `stopTalking:true`. A compound utterance may carry both `topic_shift:true` and `stopTalking:true`; topic shift must not erase explicit conversation-stop evidence.

No new stop-scope authority is introduced. The canonical semantic provider remains the sole utterance-level authority.

## Acceptance
- `boşver bu konuyu kapatalım` -> topic_shift=true, stopTalking=false
- `sus artık konuşma` -> stopTalking=true
- `bu konuyu da kapat konuşmayı da bitir` -> topic_shift=true, stopTalking=true
