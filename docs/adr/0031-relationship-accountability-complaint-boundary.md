# ADR-0031: Relationship accountability complaint boundary

- Status: Accepted
- Date: 2026-09-04

## Context

The real 21-turn KNT characterization exposed a relationship-authority defect: after low-quality Kaira replies, the user complaint `bişey anlatmadınki sohbet bile edemedik` could contribute relationship injury and repeated-negative state even though the utterance was criticism of Kaira's prior behavior rather than an independent attack.

Live production characterization against the canonical `/api/chat` path confirmed the semantic distinction. The provider emitted:

- `primaryIntent=complaint`,
- `target=kaira`,
- `discourseAct=confusion_or_challenge`,
- `relationalAct=challenge`,
- `insult=false`,
- `disrespect=0.2`,
- no coercion/manipulation/privacy harm.

The canonical semantic boundary was therefore already describing a complaint, but RelationshipReducer ingress could collapse mild provider frustration/disrespect into the generic `hakaret` negative pattern because `disrespect >= 0.15` was enough to create harm evidence downstream.

## Decision

A canonical Kaira-targeted complaint is relationship-neutral for injury/repetition when:

- `primaryIntent=complaint`,
- `target=kaira`,
- `discourseAct=confusion_or_challenge`,
- no independent typed harm act is present (`insult`, `mockery`, `coercion`, `manipulation`, `privacy_violation`, `boundary_test`),
- no independent coercion/manipulation/privacy severity crosses the existing relationship-harm floor.

For such a turn, RelationshipReducer ingress receives zero relationship severity and no negative pattern. The complaint remains available to dialogue/response planning as negative complaint content; only relationship injury authority is suppressed.

If the complaint also carries an independent typed harm act, normal RelationshipReducer injury behavior is preserved. In particular, complaint + `secondarySocialActs=[insult]` is not neutralized.

## Non-goals

- This policy does not decide whether the user's complaint is objectively justified.
- It does not add raw-text complaint phrases or regexes.
- It does not lower or raise RelationshipReducer's global severity thresholds.
- It does not reinterpret provider output downstream.
- It does not make every negative Kaira-targeted utterance relationship-neutral.

## Authority invariant

Semantic ingestion remains the only classification authority. Relationship ingress may project typed semantic distinctions into reducer-safe signals, but it may not reparse the user's words. Complaint content and relationship harm are distinct authorities: criticism can be negative without becoming injury.

## Verification

`src/services/kairaAccountabilityComplaintRelationshipRegression.test.ts` executes the canonical `analyzeKdmInteractionCanonicalTurn` path and locks:

1. the measured complaint snapshot produces no conflict/hurt/negative event or negative pattern;
2. repeating the same complaint does not manufacture `tekrarlanan_olumsuz_davranış` or repeated-negative state;
3. adding an independent typed insult preserves relationship injury and the `hakaret` pattern.

Required merge validation remains full architecture contracts, autonomous runtime contracts, beta gates, full Vitest, TypeScript, production build, behavior/docs guards and Architecture Review. Final acceptance additionally requires live production smoke after the exact merge commit is deployed.
