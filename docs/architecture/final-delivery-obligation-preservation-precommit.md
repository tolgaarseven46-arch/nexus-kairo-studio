# Final Delivery Obligation Preservation — Precommit

Status: **PRECOMMITTED DESIGN CLAIMS — original claims preserved; principal-review amendment recorded below**

Evidence source: scenario-authority falsification S3 T4. The user asked `sence abartıyor muyum?`; canonical semantics marked a question/advice request and DialogueDecision selected `answer_or_clarify`, but the final constraint fallback delivered `tamam`.

## Problem statement

The current final constraint boundary validates structural/plan constraints but does not prove that an active DialogueDecision obligation survived a fallback/replacement. A behaviorally empty acknowledgement can therefore be structurally valid while erasing the user's active question/request.

This is not a ban on the literal word `tamam`; it is an obligation-preservation contract.

## Authority claim

**DialogueDecision is the authority for the active conversational obligation.**

For `move=answer_or_clarify`, the delivered response must do exactly one of:

1. provide a substantive answer,
2. explicitly state that Kaira cannot answer / cannot decide yet,
3. ask a necessary clarification that identifies what is missing.

A pure acknowledgement such as `tamam`, `he anladım`, `aynen`, `peki` does none of these and is invalid for this move.

**The final constraint pass is not allowed to invent a new conversational move.** It may validate/reject candidates. Every replacement candidate must satisfy the same active obligation before delivery.

## Non-authority claims

- RelationshipReducer does not decide whether a question was answered.
- Memory does not author a question fallback.
- SpeechIdentity may change wording but cannot turn an answer obligation into an acknowledgement.
- A guard cannot make an invalid obligation disappear merely because the replacement is short, non-empty and within plan limits.

## Original alternatives considered before the first implementation draft

### A — Ban the literal `tamam`
Rejected. This is sentence-specific and does not prevent `he anladım`, `peki`, or another empty acknowledgement.

### B — Add obligation conformance to DialogueDecision and make its fallback obligation-aware
Originally selected as the minimal design. The first draft introduced a helper that both judged acknowledgement-only output and produced an explicit defer sentence.

### C — Add a brand-new top-level obligation layer
Rejected. The current `DialogueDecisionPlan.move` already owns the relevant obligation for this observed failure. A new layer would be unproven abstraction accretion.

### D — Let the final constraint pass synthesize arbitrary plan-aware content
Rejected. It gives the guard content/behavior authority that belongs to DialogueDecision.

## Original falsifiable acceptance claims

### F1 — Empty acknowledgement rejection
Given `move=answer_or_clarify`, an acknowledgement-only reply must produce a dialogue-decision issue.

### F2 — Explicit defer acceptance
Given `move=answer_or_clarify`, a grounded fallback that explicitly says Kaira cannot answer/decide yet must not be rejected merely for being a defer rather than a substantive answer.

### F3 — Replacement preservation
If an initial candidate fails canonical constraints and the final pass uses a fallback, the delivered fallback must still satisfy F1/F2; no structurally-valid generic acknowledgement may erase the obligation.

### F4 — Neighboring moves unchanged
`natural_reaction`, `complete_social_routine`, `acknowledge_correction`, `join_banter`, and other social-only moves retain their existing fallback semantics. The change must not globally ban short acknowledgements.

### F5 — Original S3 family
In the S3 sequence, the final advice question must no longer resolve to acknowledgement-only text. It may answer, explicitly defer, or ask a necessary clarification.

## Principal-review amendment before merge

The principal-architect review accepted the direction but falsified part of the first implementation design:

1. A helper/guard that invents its own definition of “obligation satisfied” becomes a hidden second semantic authority.
2. A helper/guard that emits a canned `buna şu an net cevap veremem` sentence becomes a hidden behavior author even if the sentence is safe.
3. Therefore `satisfactionCriteria` must be written by DialogueDecision itself, and validators may only consume those typed criteria.
4. Obligation recovery must stay in the normal DialogueDecision → ResponsePlan → Realizer/generation path. Phase 1 must not add a canned obligation fallback.
5. The canonical final pass must not manufacture a generic `tamam` replacement.

The implementation was revised accordingly. This amendment is recorded explicitly rather than rewriting the original design history as if the first draft had never existed.

## Amended falsifiable claims

### A1 — Decision-owned criteria
`planDialogueResponse(...).obligation.satisfactionCriteria` is emitted by DialogueDecision for `answer_or_clarify`; downstream validators do not create an independent obligation definition.

### A2 — Mechanical consumption
An acknowledgement-only candidate is rejected because it matches a response class forbidden by the already-emitted DialogueDecision criterion.

### A3 — No hidden obligation author
No Phase-1 helper or final guard synthesizes an explicit-defer sentence or generic acknowledgement to “fix” the obligation.

### A4 — Invalid caller fallback remains invalid
If a caller supplies `tamam` as fallback for an active answer obligation, the final guard does not turn that into some other canned social reply and does not mark it valid.

### A5 — Neighboring moves unchanged
Moves with no answer obligation receive no obligation contract and preserve their valid short acknowledgement behavior.

### A6 — S3 production family
The original S3 advice question must be repaired/realized through the normal pipeline and must not silently finish as acknowledgement-only content.

## Removal test

If the decision-owned obligation is removed while all other code remains, `answer_or_clarify + acknowledgement-only` must cease producing the obligation issue. Removing it must not change neighboring social moves.

## Counter-scenarios

1. `tamam` as the correct response to a completed social routine must remain valid.
2. `he doğru` for `acknowledge_correction` must remain valid.
3. A genuinely ambiguous question may receive a clarification question when `allowQuestion=true`.
4. A factual question blocked by epistemic policy may explicitly defer/decline only through the normal behavior/realization pipeline, not a guard-authored canned sentence.
5. A malformed long answer may be repaired, but the repair must still resolve the active answer obligation.

## Stop condition

If preserving this obligation requires changing relationship state, memory ownership, or adding a new top-level layer, stop and reclassify the finding before implementation. This phase is accepted only if the existing DialogueDecision → ResponsePlan → normal realization → final-delivery contract can own the fix cleanly.
