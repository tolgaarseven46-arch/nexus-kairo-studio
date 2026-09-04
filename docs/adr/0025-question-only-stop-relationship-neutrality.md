# ADR-0025: Question-only stop is relationship-neutral without independent harm

Date: 2026-09-04
Status: Accepted

## Context

A live canonical 30-turn production characterization showed that `soru sorma artık` correctly produced a response plan with `allowQuestion:false`, but also changed Kaira from `reactionMode:neutral` to `reactionMode:irritated`. A fresh production reproduction after PR #49 confirmed the same defect: conflict rose from 0 to 3, hurt from 0 to 5 and `repeatedNegativeCount` from 0 to 1.

The semantic contract already distinguishes a question-only request from ending the conversation: `discourseFacets.stopQuestions=true`, `discourseFacets.stopTalking=false`, and `stopRequest=false`. Therefore a pure request not to ask questions must not, by itself, create dyadic relationship injury.

## Decision

At the canonical RelationshipReducer ingress, treat a typed question-only stop as relationship-neutral when it carries no independent harm act. For that relationship projection only:

- severity is projected to the zero vector;
- no negative pattern is created;
- question suppression remains authoritative through discourse/response planning;
- full-conversation stop semantics remain unchanged.

Independent typed harm remains authoritative. If the same turn also carries `insult`, `coercion`, `manipulation`, `mockery`, `privacy_violation`, `boundary_test`, or an insult/rejection/boundary-test primary intent, its severity is preserved and the relationship reducer may react normally.

## Consequences

- `soru sorma artık` can suppress future questions without making Kaira irritated, hurt, distant, or disengaged merely because of that preference.
- `salak, soru sorma artık` still carries relationship harm.
- No raw-text parsing or downstream semantic reinterpretation is added. The policy consumes only canonical `SemanticInterpretation@2` fields.
- The semantic provider remains responsible for utterance semantics; this rule is a deterministic cross-field relationship projection invariant.
