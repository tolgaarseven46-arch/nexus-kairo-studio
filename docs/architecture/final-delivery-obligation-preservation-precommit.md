# Final Delivery Obligation Preservation — Precommit

Status: **PRECOMMITTED DESIGN CLAIMS — written before implementation**

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

**The final constraint pass is not allowed to invent a new conversational move.** It may validate/reject candidates and may request/use a DialogueDecision-owned grounded fallback. Every replacement candidate must satisfy the same active obligation before delivery.

## Non-authority claims

- RelationshipReducer does not decide whether a question was answered.
- Memory does not author a question fallback.
- SpeechIdentity may change wording but cannot turn an answer obligation into an acknowledgement.
- A guard cannot make an invalid obligation disappear merely because the replacement is short, non-empty and within plan limits.

## Alternatives considered before implementation

### A — Ban the literal `tamam`
Rejected. This is sentence-specific and does not prevent `he anladım`, `peki`, or another empty acknowledgement.

### B — Add obligation conformance to DialogueDecision and make its fallback obligation-aware
**Selected minimal design.**
- `findDialogueDecisionIssues` rejects unresolved acknowledgement-only outputs for `answer_or_clarify`.
- `buildGroundedDialogueFallback` supplies a deterministic explicit defer/clarify outcome for `answer_or_clarify` when a safe substantive answer is unavailable.
- The canonical constraint pass applies the same issue finder to the fallback, so the guard validates rather than silently reclassifies the move.

### C — Add a brand-new top-level obligation layer
Rejected for this phase. The current `DialogueDecisionPlan.move` already owns the relevant obligation for this observed failure. A new layer would be unproven abstraction accretion.

### D — Let the final constraint pass synthesize arbitrary plan-aware content
Rejected. It gives the guard content/behavior authority that belongs to DialogueDecision.

## Falsifiable acceptance claims

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

## Removal test

If the new obligation conformance is disabled while leaving all other code unchanged, a synthetic `answer_or_clarify + invalid first candidate + acknowledgement fallback` must again be deliverable. If disabling the change affects unrelated social moves, the implementation scope is too broad.

## Counter-scenarios

1. `tamam` as the correct response to a completed social routine must remain valid.
2. `he doğru` for `acknowledge_correction` must remain valid.
3. A genuinely ambiguous question may receive a clarification question when `allowQuestion=true`.
4. A factual question blocked by epistemic policy may explicitly defer/decline without fabricating content.
5. A malformed long answer may fall back, but the fallback must still resolve the active answer obligation.

## Stop condition

If preserving this obligation requires changing relationship state, memory ownership, or adding a new top-level layer, stop and reclassify the finding before implementation. This phase is accepted only if the existing DialogueDecision → final-delivery contract can own the fix cleanly.
