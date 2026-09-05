# ADR-0053 — Preserve substantive content in mixed answer turns

- Status: Accepted
- Date: 2026-09-05

## Context

Fresh post-PR #101 production characterization exposed a turn-taking failure:

- Kaira asked `sen nasılsın`.
- User replied `iyi ben de kahveyi döktüm masaya az önce`.
- Canonical semantics contained a normal `general_chat` turn with substantive new content.
- DiscourseState treated the whole turn as only an answer to Kaira's pending question, producing `follow_previous_answer` and allowing `he tamam o zaman` to swallow the new content.

The semantic interpretation itself was not the broken authority. The first broken boundary was discourse turn-taking: `general_chat` was treated as short/routine-like regardless of message extent.

## Decision

DiscourseState remains observational and does not become a semantic authority.

A mixed turn may simultaneously:

1. satisfy/close Kaira's pending question, and
2. carry independently substantive canonical content that becomes the active conversational topic.

`general_chat` is treated as short/routine-like only when the surface turn is structurally short. Long mixed turns with no social routine and no explicit repair/friction may therefore close the pending question without creating `previousTurnDependency`.

No new semantic parser, intent regex, relationship rule, or downstream reinterpretation is introduced.

## Consequences

- Pure short answers such as `iyi dedim ya` keep previous-turn dependency behavior.
- Mixed answer + new-content turns no longer lose the new content behind `follow_previous_answer`.
- Pending-question bookkeeping still closes the answered question.
- The boundary remains compatible with the single-semantic-authority rule: canonical `SemanticEvent` supplies meaning; DiscourseState only decides conversational dependency/continuity.

## Evidence

Regression coverage in `discourseStateReducer.test.ts` locks the production-shaped `iyi ben de kahveyi döktüm masaya az önce` case and preserves existing short-answer contracts.
