# ADR-0016: Topic-local closure is not conversation-level stop

## Status
Accepted

## Context
A fresh-user 15-turn production chat showed `boşver kapatalım konuyu` being interpreted as `stopTalking:true`, which pushed the canonical relationship reducer into `disengaged`. Production language-understanding characterization showed the same parser correctly used `topic_shift` when the user explicitly added `başka şey konuşalım`.

## Decision
Existing `discourseAct: topic_shift` is the authority for topic-local closure. A topic shift cannot simultaneously mean full conversation stop. Provider normalization therefore forces `stopTalking:false`, `stopQuestions:false`, `stopRequest:false`, and removes `stop_request` whenever `discourseAct` is `topic_shift`.

The semantic-provider instruction also states that topic/object closure remains local even when the user does not explicitly propose a replacement topic.

## Consequences
- `boşver bu konuyu` / `konuyu kapatalım` do not disengage the relationship solely because the topic is being closed.
- Explicit conversation-level stop such as `sus artık` remains a full stop.
- No raw-text stop parser is added downstream.
