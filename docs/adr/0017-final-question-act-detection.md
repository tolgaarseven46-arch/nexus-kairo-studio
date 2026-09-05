# ADR-0017: Final question permission uses punctuation-independent Turkish question acts

## Status
Accepted

## Context
A fresh 15-turn production chat produced two replies with `ResponsePlan.allowQuestion=false` but clear punctuationless Turkish questions: `skor ne durumda şimdi` and `neyden bu kadar gerildin böyle`. The canonical final boundary already validates question permission, but its detector did not recognize these clause forms, so consistency incorrectly reported 100.

## Decision
Keep question permission enforcement in the existing canonical final-delivery boundary. Extend its punctuation-independent Turkish question-act detector with interrogative predicate forms that are observable in casual chat, rather than adding a second policy or rewriting replies generically.

## Consequences
- Clear punctuationless question acts are rejected when `allowQuestion=false`.
- Ordinary declarative uses remain unaffected by regression coverage.
- Recovery remains owned by the existing generation/repair/fallback flow.
