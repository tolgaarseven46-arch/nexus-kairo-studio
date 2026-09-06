# Ongoing first-party event claims may resume one unambiguous open user-event thread

Date: 2026-09-06
Status: Accepted

## Context

The archived real-user session contains a long-range natural continuity failure:

- Turn 3: the user says they fell asleep under the sun and their back is burning.
- Turns 4–6: canonical `current_user` world-memory claims record the cause and sunburn/back-pain event.
- Turn 24: the user says their back is still bad; the persisted canonical event carries `current_user.back_discomfort = "ongoing"`.
- Kaira nevertheless asks for the cause again, and Turn 26 explicitly corrects Kaira: the sun caused it and this had already been said.

`DiscourseState` already stores bounded `user_event_topic` evidence, but its resumption path intentionally supported only third-party threads. Binding every later `current_user` claim to an old first-party event would be unsafe because unrelated user events can share the same subject.

## Decision

1. Do not add a `hala`/`hâlâ` regex, raw-text topic matcher, provider call, or semantic reparse.
2. A current turn may resume a first-party event thread only when canonical structured evidence itself marks continuation: at least one `worldMemory.claim` has `subjectId=current_user` and value `ongoing`.
3. The resumption is allowed only when exactly one open `user_event_topic` exists. With multiple candidates, fail closed as ambiguous; with zero candidates, do not manufacture one.
4. Resumption updates the existing thread evidence and marks `resumedThreadId`; it does not infer a new cause or fact.
5. For a resumed first-party emotional turn, `DialogueDecision` must not select `invite_emotional_context` merely because the current event target is unresolved. It should produce a compact `natural_reaction` with no automatic cause/question reopening. Existing quoted thread evidence remains observational grounding only.
6. A new `current_user` event whose claim is not explicitly ongoing remains independent.

## Consequences

- The measured Turn 24 shape can stay connected to the already-known sunburn event without phrase-specific parsing.
- Unrelated first-party events are not collapsed together by subject identity alone.
- Ambiguous multiple-thread cases remain fail-closed.
- Canonical semantic and memory authorities remain unchanged; DiscourseState only binds already-typed conversational continuity.

## Regression

`kairaOngoingUserEventContinuityRegression.test.ts` locks:

- one open user-event thread + canonical `ongoing` claim => thread resumed and planner avoids a redundant cause question;
- one open user-event thread + a non-ongoing new user claim => no resumption and the normal emotional-context invitation remains available.