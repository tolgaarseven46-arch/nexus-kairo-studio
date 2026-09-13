# ADR 0023 — System long-horizon multi-user acceptance

Status: Accepted

## Context

The relationship, memory, affect, persistence, SpeechIdentity/BehaviorContract and final-delivery boundaries had each been proven in narrower deterministic tests. The remaining pre-beta question was whether those boundaries continue to compose across a longer, multi-user history without cross-user state contamination or permission leakage.

## Decision

Add a provider-free system acceptance that:

- executes 120 relationship turns split across two independent users;
- gives the users different relationship histories while using the same canonical reducer authority;
- applies the same final mild negative event and requires history-dependent relational output;
- proves one user's progression does not mutate the other user's state;
- persists and hydrates both users through the real `saveKdmInteraction()` / `loadKdmState()` normalization path with only Firestore transport mocked in memory;
- feeds the resulting long-horizon states into SpeechIdentity (HOW), BehaviorContract (WHAT/WHETHER), and final delivery;
- requires forbidden advice to remain forbidden and persisted replies to remain non-empty;
- makes no provider/API call and adds no new semantic, relationship, memory, or response authority.

## Result

PR #253 merged as `f27f9bd0142cd618b952b012b7856059849e078a`.

CI run `34759029702` was fully GREEN, including architecture/runtime gates, deterministic harness/replay, Historical RED→GREEN, full Tests, TypeScript and production build. Architecture Review run `34759029689` was GREEN.

No production RED was measured, so no runtime behavior patch was required.

## Consequences

The automated long-horizon/multi-user pre-beta acceptance class covered here is closed. This does not replace real human beta sessions; those remain an external product acceptance activity. Any future production change in these seams still requires a new measured RED/counterexample.
