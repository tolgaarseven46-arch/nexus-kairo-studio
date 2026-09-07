# ADR-0076: Action-request clarification questions follow the decision-owned obligation

- Status: Accepted
- Date: 2026-09-07

## Context

Fresh 13-turn live KNT characterization exposed an empty final reply for the cooperative action request `neyse aşkım oyun mu oynasak ya birlikte`.

Canonical semantics correctly classified the turn as an action request targeted at Kaira. DialogueDecision also created an `action_request` obligation whose allowed resolutions explicitly include `clarify`. However, the same decision set `allowFollowUpQuestion=false`, and PlanResolver treated that flag as an unconditional question ban. The candidate response therefore could not ask the natural coordination question needed to resolve the proposed joint action, and final delivery rejected it.

This is an internal contract inconsistency: a decision-owned obligation cannot authorize `clarify` while a lower composition step makes the clarification surface impossible.

## Decision

PlanResolver treats a decision-owned `action_request` obligation that explicitly allows `clarify` as typed authority for one clarification/coordination question, subject to the existing hard question boundary.

- no raw-text detection is added;
- no game-specific or phrase-specific rule is added;
- hard `questionAllowed=false` still clamps the permission;
- ordinary non-obligation questions remain governed by the existing dialogue flag and soft question-drive;
- the action obligation remains active, so generic acknowledgement still cannot satisfy the request.

## Authority invariant

DialogueDecision owns the obligation and its allowed resolution classes. PlanResolver may compose that typed authority with hard constraints, but it must not make an explicitly allowed resolution impossible through an unrelated soft tendency gate.

## Consequences

- cooperative action requests may ask one necessary coordination/clarification question;
- direct action requests still carry the same fulfill/clarify/decline/defer obligation;
- neighboring social turns do not gain question permission;
- no second language-understanding path is introduced.

## Verification

`kairaActionRequestCoordinationQuestionRegression.test.ts` locks:

1. action-request + clarify obligation authorizes the coordination-question surface;
2. acknowledgement-only replies still fail the action obligation;
3. neighboring non-obligation turns remain under normal question-drive policy.

Required validation: Architecture Review, docs/behavior guards, architecture contracts, autonomous runtime contracts, beta gates, full Vitest suite, TypeScript, and production build.
