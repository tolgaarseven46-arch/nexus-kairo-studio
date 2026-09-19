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


## Clarification — first-encounter latency may overlap read-only semantics with coordination

For first-encounter requests, canonical semantic interpretation is read-only with respect to relationship/state mutation ownership. It may therefore run concurrently with the request idempotency/state-coordination claim to avoid additive network latency.

The coordination result remains authoritative before downstream execution:
- replay/wait outcomes are resolved before canonical behavior planning or delivery;
- owner state is established before any mutation;
- explicit activity-permission replies remain serialized;
- concurrency is a latency optimization only and must not change semantic, decision, memory, relationship, or persistence authority.


## Clarification — typed platformScopeQuery owns platform-context realization

Once canonical semantic interpretation emits `discourseFacets.platformScopeQuery`, that typed facet is sufficient authority for first-encounter platform-context realization.

`KairaFirstEncounterContextRealizer` must not require an additional DialogueDecision move such as `answer_or_clarify` to become eligible. DialogueDecision/ResponsePlan may constrain HOW the reply is expressed, but they cannot veto WHAT typed platform scope the semantic authority says the user asked about.

Therefore:
- `platformScopeQuery=kaira_role` deterministically selects the Kaira-role realizer;
- `platformScopeQuery=room_setup` deterministically selects the room-context realizer;
- Steering/Routine realizers may only run when no platform-scope realization handled the turn.


## Clarification — provider ontology for durable Kaira role

The full semantic provider remains canonical authority for `platformScopeQuery`. Local regex recognizers remain fast-floor only and must not overwrite provider output after provider execution.

For provider classification:
- `kaira_role` means a question about Kaira's durable function, role, responsibility, task scope, or purpose in the room/server;
- `what_doing` remains the correct social routine for a merely momentary activity question;
- room/server purpose or usage belongs to `room_setup`;
- location words alone do not determine the scope; semantic subject and predicate do.

This preserves paraphrase generalization without turning the full provider path into a growing regex inventory.


## Clarification — bounded structural fast floor for durable Kaira-role questions

The pre-provider first-encounter fast semantic floor may classify `kaira_role` only when durable-role meaning is structurally explicit.

Accepted evidence is bounded:
- explicit durable-role concepts such as role, function, duty, responsibility, purpose, or undertaking;
- question form;
- Kaira/second-person addressee or possessive evidence, or equivalent second-person morphology.

A merely momentary activity question remains `what_doing` and must not be promoted to `kaira_role`.

This fast floor is an early typed-semantic optimization. It does not authorize regex reconciliation after the full semantic provider has executed; provider output remains canonical on the full-provider path.
