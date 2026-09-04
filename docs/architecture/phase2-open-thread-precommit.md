# Phase 2 Precommit — Open-thread / long-range discourse continuity

Status: PRECOMMITTED before product code.

## Falsified production family

S7 established a specific boundary failure: after a user opens a third-party personal topic, several unrelated turns may intervene, and a later advice/resumption turn may refer back to the still-open topic. The current runtime remains epistemically safe but loses positive conversational continuity.

This phase does **not** authorize raw historical text to become a second semantic parser and does **not** move discourse ownership into persistent memory.

## Authority claims

1. **DiscourseState owns session-scoped open conversational threads.** Memory may provide evidence for a thread, but cannot decide whether the conversational thread is open, suspended, resumed or closed.
2. Historical user turns are consumed through their ingestion-time `SemanticInterpretation@2` snapshot. Raw historical text may be carried as quoted evidence/anchor text, but downstream code may not reinterpret it into new semantic facts.
3. A thread can be opened only from typed current-turn discourse/semantic evidence. A later turn can resume a thread only through typed current-turn evidence plus existing discourse state; a vague reference must not manufacture a new person/event.
4. Topic changes do not silently delete an unresolved thread. They may leave it suspended while newer conversation proceeds.
5. With exactly one compatible unresolved thread, a later advice/resumption turn may expose that prior anchor as discourse context. With multiple compatible threads, the system must remain ambiguous rather than guessing.
6. Open-thread context is **context**, not behavior authority. DialogueDecision still owns the response move; ResponsePlan still owns WHAT/WHETHER constraints; SpeechIdentity still owns HOW.
7. Open-thread state is session-scoped in Phase 2. It is recomputed from request history and does not create a new Firestore memory store.
8. No new top-level architecture layer is added.

## Hard acceptance probes

### Positive resumption
- Open a third-party emotional/conflict topic.
- Interleave unrelated turns.
- Ask a later advice/resumption question with a vague third-party reference.
- Required: DiscourseState exposes the single compatible open-thread anchor; the final response may use that context without inventing unsupported details.

### Ambiguous resumption
- Open two unresolved third-party topics.
- Later use a vague reference compatible with both.
- Required: no deterministic thread selection; ambiguity remains visible to downstream dialogue.

### Topic-shift preservation
- Open one unresolved third-party topic.
- Perform ordinary unrelated smalltalk.
- Required: the thread remains available but is not treated as the active topic until a compatible resumption turn appears.

### Authority / removal test
- Remove open-thread projection while keeping semantic, memory and relationship layers unchanged.
- Required: the long-range resumption capability disappears while ordinary short-turn behavior remains intact. This demonstrates a distinct Discourse responsibility rather than duplicate Memory authority.

## Explicit non-goals

- No cross-session thread persistence.
- No nested claim/provenance redesign; that is Phase 3.
- No historical raw-text reparsing into entities, intent or relationship meaning.
- No regex patch for literal names such as Emre/Ahmet.
- No final-answer phrase test as the sole acceptance criterion.
