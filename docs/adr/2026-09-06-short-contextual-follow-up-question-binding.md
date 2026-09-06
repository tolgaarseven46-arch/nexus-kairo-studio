# Short unresolved questions bind to the immediately previous Kaira turn at discourse level

Date: 2026-09-06
Status: Accepted

## Context

The archived real-user characterization session contains a natural adjacency pair:

- Kaira: `yok o kadar değil`
- User: `neden`

The persisted canonical event for the user turn is intentionally modest: `intent=question`, `target=unknown`, no repair signal, no recall request, and no knowledge query. That is correct utterance semantics. The missing information is not lexical meaning; it is discourse structure. The current reducer had no rule that bound a short unresolved question to Kaira's immediately preceding statement, so `DialogueDecision` saw only a generic question and did not carry an explicit previous-turn fulfillment contract.

## Decision

1. Do not add a `neden`/`niye` regex, classifier, provider call, or new semantic field.
2. `DiscourseState` may bind a user turn as `follow_up_question` when all of the following are already true from canonical semantics and adjacency:
   - Kaira has an immediately preceding observed turn;
   - there is no pending Kaira question being answered;
   - the current canonical social act is `question`;
   - the turn is structurally short;
   - canonical target is unresolved (`unknown`);
   - there is no social routine, discourse act, advice request, or knowledge query that supplies an independent interpretation.
3. This binding is context, not semantic reinterpretation. It does not infer what the missing answer is; it only records that the question depends on the adjacent Kaira turn.
4. `DialogueDecision` owns the response obligation. A `follow_up_question` maps to `answer_or_clarify`, forbids acknowledgement-only completion, forbids an unrelated follow-up question, and instructs the renderer/model to answer in the immediately previous Kaira-turn context.
5. Explicitly targeted short questions remain independent and are not bound by this rule.

## Consequences

- Elliptical natural follow-ups such as the measured Turn 15 case retain conversational continuity deterministically.
- The canonical semantic authority remains unchanged; no raw-text semantic reparse is introduced downstream.
- The rule generalizes to unresolved short follow-up questions rather than hard-coding one Turkish surface form.
- Over-binding is bounded by target resolution and existing canonical discourse facets.

## Regression

`kairaShortFollowUpQuestionContinuityRegression.test.ts` locks both sides:

- the archived Turn 15 semantic shape binds to the previous Kaira statement and produces an `answer_or_clarify` obligation;
- a short question with canonical `target=kaira` remains independent.
