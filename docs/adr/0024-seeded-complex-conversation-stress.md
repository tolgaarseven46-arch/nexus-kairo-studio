# ADR 0024 — Seeded complex conversation stress acceptance

## Status
Proposed for deterministic beta acceptance evidence.

## Context
The frozen Phase-0 suite (21 scenarios / 423 turns) and the existing two-user 120-turn system acceptance are green. Before relying on real-human beta alone, we want one additional random-looking but exactly replayable long-session stress probe that mixes ordinary chat, third-party references, direct mild conflict, repair language, personal preferences, mood sharing, commitment language and unfinished follow-up language.

True randomness would make CI failures hard to reproduce, so the stress sequence uses fixed seeds. This is deterministic architecture evidence, not a substitute for real-human live-beta evidence.

## Decision
Add `kairaSeededComplexConversationLongSessionRegression.test.ts` to the beta conversation acceptance manifest.

The test:
- runs two isolated users for 80 turns each (160 turns total),
- uses fixed LCG seeds so transcript order and resulting state replay exactly,
- gives the two users deliberately different history pressure while retaining a mixed random-looking stream,
- checks finite/bounded relationship and affect state throughout,
- checks identical-seed replay determinism,
- checks history divergence and user isolation,
- passes both user states through the real `saveKdmInteraction()` / `loadKdmState()` normalization path with only Firestore transport mocked,
- checks SpeechIdentity HOW, BehaviorContract WHAT/WHETHER and accepted non-empty final delivery after the long mixed histories.

## Constraints
- No production behavior code is changed by this characterization.
- No regex, phrase heuristic or second semantic authority is added.
- Any RED result must be diagnosed before a production patch is allowed.
- This deterministic stress test supplements but does not satisfy the real-human live-beta exit criteria.
