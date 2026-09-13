# ADR 0023 — System long-horizon multi-user acceptance

Status: Proposed

## Context

The relationship, memory, affect, persistence, SpeechIdentity/BehaviorContract and final-delivery boundaries have each been proven in narrower deterministic tests. The remaining pre-beta question is whether those boundaries continue to compose across a longer, multi-user history without cross-user state contamination or permission leakage.

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

## Falsification policy

This change is characterization/acceptance only. Production behavior must not be changed unless this deterministic test exposes a measured RED. Any RED must be fixed only in the existing owning seam and then re-run through full CI.

## Consequences

A GREEN result closes the automated long-horizon/multi-user pre-beta acceptance class covered here. It does not replace real human beta sessions; those remain an external product acceptance activity.
