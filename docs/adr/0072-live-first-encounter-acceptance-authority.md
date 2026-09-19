# ADR — Live first-encounter acceptance authority

Date: 2026-09-19

## Decision

First-encounter room/platform scope is canonical current-turn semantics, not a realization-side raw-text decision. Semantic ingestion may use bounded linguistic recognition to produce `discourseFacets.platformScopeQuery="room_setup"`. Downstream decision/realization consumes that typed facet and must not reinterpret raw text.

Cold-start owner welcome is proactive: Kaira introduces herself, briefly explains that she will help shape the room/server, and actively opens the next conversational direction. This is product behavior, not a separate authority mode.

## Constraints

- No room-scope decision from realization-only evidence cues.
- Paraphrases must converge on the same typed semantic facet.
- Welcome stays concise (max two response units) and does not expose internal terms.
- Multi-party engagement authority R remains closed.
- Live-human acceptance and latency proof are required before closure.


## Clarification — conversation driver

For a zero-context owner entering a new server/room, Kaira is the first conversational driver. Realization must not hand the burden back with phrases equivalent to "you decide" or "you lead" before Kaira has provided a concrete next step. Kaira should introduce the next useful direction naturally (for example: establish the general chat, then add rooms/rules as the group takes shape). This remains HOW/realization of an already-authorized first-encounter plan; it does not grant new semantic or capability authority.


## Clarification — safe neutral short replies

During first encounter, a safe neutral short utterance may use the local canonical floor without a semantic-provider round trip when the already-produced SemanticInterpretation proves it is low-load, non-harmful, non-question, non-memory, non-third-party, and structurally short. Eligibility is derived only from canonical semantic fields; downstream realization must not match raw phrases such as "bilmiyorum". This exists to preserve the conversation-driver behavior without creating a second semantic authority or routing serious short messages into onboarding.


## Clarification — first-encounter state lease latency

For a locally realized first-encounter turn, the distributed state-mutation lease protects the critical continuity write, not non-critical idempotency completion or telemetry. After relationship + TestRun continuity persistence completes, the state lease is released before distributed idempotency completion and telemetry. Duplicate-request idempotency remains owned until completion; only the per-user state lease is released. This prevents a completed user-visible fast reply from blocking the next distinct turn for several seconds while preserving ordered critical state mutation.


## Clarification — complete short realization

First-encounter routine realizations must fit the already-authoritative ResponsePlan delivery budget without relying on mechanical mid-sentence truncation. The realization layer should choose a shorter complete utterance rather than widening global response limits. Human-live acceptance rejects incomplete endings such as "nasıl bir".


## Clarification — idle-debounced non-critical persistence

For first-encounter local fast replies, relationship and TestRun turn continuity remain the critical post-response persistence barrier and the distributed state lease is released immediately after those writes. Non-critical metric/KNT/autonomous observation writes are queued per user+Kaira instance and flushed only after a short conversational idle window. Each new first-encounter fast turn resets that idle window and all queued jobs are preserved and flushed sequentially. This prevents non-critical Firestore traffic from competing with the next user turn's coordination claim while preserving eventual evidence/telemetry writes.


## Clarification — KNT Firestore payload hygiene

KNT trace persistence is evidence/telemetry only and gains no new behavior or semantic authority. Before a KNT trace is written to Firestore, undefined values are removed recursively from the complete payload, including nested dynamic relationship state. This keeps live TestRun evidence durable without changing the canonical in-memory state or response path.


## Clarification — request-start background pause

A new first-encounter request pauses any pending non-critical background flush for the same user+Kaira instance before distributed coordination is claimed. Queued telemetry jobs are preserved, not discarded. After the current turn's critical continuity barrier completes, enqueueing the new job restarts the conversational idle window for the full preserved queue. This prevents a prior turn's delayed Firestore telemetry flush from waking up while the next user turn is in progress.

## Clarification — deterministic platform-context fast path

When first-encounter canonical semantics already resolve a typed `platformScopeQuery` such as `kaira_role` or `room_setup`, the reply is deterministic platform-context realization. Those turns must skip unrelated social-appraisal/autobiographical/recent-memory hydration before delivery, just like other first-encounter local fast replies. This is a latency optimization only: semantic recognition still happens first, the typed facet remains the sole authority, and relationship/memory semantics are not allowed to alter the frozen platform-role answer.



## Clarification — platform-scope semantic authority

Local regex recognizers for first-encounter `room_setup` and `kaira_role` are latency floors only. They may resolve already-covered common phrasings before a provider round trip, but once the canonical semantic provider runs, no regex/pattern reconciler may enrich or overwrite `platformScopeQuery`.

The full semantic provider owns paraphrase-invariant platform-scope classification:
- `room_setup` means the user asks what the room/server/area is for, what happens there, or how it is used;
- `kaira_role` means the user asks what Kaira does there or what her role/function/duty is;
- unseen paraphrases must fall through to the provider rather than expanding a finite phrase list;
- uncertainty must remain explicit when the provider cannot distinguish the meaning.

This preserves the typed `platformScopeQuery` as the single canonical authority consumed by deterministic platform-context realization.


## Clarification — neutral-short fast floor requires canonical confidence

The first-encounter neutral-short optimization must never classify a low-confidence regex-floor reading as safe merely because the utterance is short and non-harmful. Eligibility now requires bounded canonical intent/overall uncertainty in addition to the existing typed safety fields.

Consequences:
- known typed social routines and known typed platform-scope fast floors remain provider-free;
- an unknown short utterance with low-confidence floor semantics falls through to the canonical semantic provider;
- after provider classification, a genuinely neutral short utterance may still use deterministic local realization when the canonical provider returns sufficiently low uncertainty;
- no new raw-text phrase list is introduced for unseen questions.
