# ADR-0089 — Natural-conversation characterization acceptance

Date: 2026-09-08
Status: Proposed in PR #176; becomes accepted only after the repository's full CI and architecture-review gates pass.

## Context

G1→G4 Social Appraisal and its production autobiographical runtime wiring are already closed. The next verified question in `PROJECT_STATE.md` is not another architecture layer; it is evidence-driven characterization of natural multi-turn conversation on current `main`.

The characterization must answer four questions without creating a second semantic, appraisal, relationship, or memory authority:

1. Can bounded autobiographical context amplify a neutral or low-materiality current turn into an excessive effect?
2. Can third-party evidence bleed into the active Kaira-user dyad?
3. Does the same typed social event differ under materially different relationship history while preserving non-zero injury where appropriate?
4. Does the resolved appraisal remain coherent through relationship state and the canonical `KairaResponsePlan` boundary in real multi-turn Turkish scenarios?

## Decision

Natural-conversation acceptance is split into two explicit evidence surfaces instead of pretending Phase-0 covers persistence that it intentionally does not hydrate.

### A. Production G4 typed-runtime counterexamples

`kairaNaturalConversationCharacterizationAcceptance.test.ts` exercises the real `resolveRuntimeSocialAppraisal(...)` production seam with adversarial bounded autobiography:

- a maximally deep typed autobiographical summary cannot manufacture effect from an exact-zero neutral turn;
- autobiography cannot change relational valence/harm/repair meaning;
- autobiographical affect amplification remains bounded by the existing G4 factor cap (`<= 1.12` in the adversarial fixture);
- explicit third-party scope remains relationship-neutral even under high personality/state activation and deep active-user autobiography;
- the same typed mild injury produces less relational harm in an established warm/trusting dyad than in a fragile dyad, while both remain negative and non-zero.

This is a characterization of the current bounded-summary contract. The autobiographical appraisal summary deliberately carries no raw event text and currently carries no recency/age field. Therefore this acceptance does **not** claim that G4 distinguishes fresh from stale episodes. It establishes the narrower requirement actually representable by the current contract: arbitrarily deep historical evidence cannot create meaning from zero, cannot alter relational meaning, and cannot amplify affect beyond the bounded modulation cap.

### B. Real multi-turn Turkish pre-provider characterization

The same acceptance test replays scenarios `C3`, `C4`, `D1`, and `D2` through the existing deterministic Phase-0 production-core harness. This gives at least 80 real Turkish user turns through:

`SemanticInterpretation@2 → grounded event → G4/KDM → RelationshipReducer → BehaviorContract/DialogueDecision → canonical KairaResponsePlan → final-provider prompt boundary`.

The acceptance rejects:

- unexplained HOW/internal-state divergence;
- prompt instruction contradiction;
- forbidden/required-content conflict;
- unrealizable dialogue obligations;
- non-canonical response-plan resolution.

Phase-0 remains honest about its boundary: persistent production memory hydration is disabled there. Persistent autobiographical behavior is therefore tested separately through the actual production G4 typed seam above.

## Non-decisions

- No new regex/classifier is introduced.
- No new semantic or appraisal authority is introduced.
- No production behavior is changed by this acceptance PR.
- No stale-memory decay heuristic is added merely because the bounded summary lacks episode age; such a product change requires a reproducible failure that shows the existing cap is insufficient.
- No live model/provider call is used as architectural proof.

## Acceptance rule

PR #176 may merge only if full repository CI, TypeScript, production build, docs/behavior guards, Phase-0 gates, beta regression/acceptance gates, and Architecture Review are green on the final PR head.

If this characterization exposes a reproducible behavior failure, the failure must be localized at the first broken authority boundary and fixed separately with minimum architecture-correct scope plus neighbor regression evidence. If it remains green, the correct result is to close the characterization checkpoint without adding another heuristic or layer.
