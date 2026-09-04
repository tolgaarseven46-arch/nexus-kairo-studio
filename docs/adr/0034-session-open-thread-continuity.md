# ADR-0034 — Session Open-Thread Continuity

**Status:** Accepted for Phase 2

## Context

Scenario × authority falsification S7 showed that the canonical runtime was epistemically safe but conversationally incomplete. After a user opened a third-party personal topic, moved through unrelated turns and later returned with a vague advice request, Kaira refused to invent the missing reference but could not positively continue the earlier open topic.

The failure was not a persistent-memory failure. Existing `DiscourseState` intentionally represented only short-range routine saturation, pending questions, self-repetition and previous-turn dependency. It had no typed unresolved-topic ledger.

## Decision

1. `DiscourseState` owns session-scoped unresolved conversational threads.
2. Phase 2 adds a bounded `openThreads` ledger plus `activeThreadId`, `resumedThreadId` and `ambiguousThreadResumption` observations.
3. Historical user turns continue to require their ingestion-time `SemanticInterpretation@2` snapshot. Missing snapshots fail closed; raw historical text is not reparsed into new intent, target, relationship or entity truth.
4. Thread opening is driven only by typed third-party semantic evidence. A user turn on another topic suspends the active thread without deleting the unresolved thread.
5. A later advice/recall turn may resume a thread only when exactly one compatible unresolved thread exists. If multiple unresolved threads exist, DiscourseState exposes ambiguity and downstream dialogue must not guess.
6. `anchorText` is quoted historical evidence. It may be exposed to the model as context, but downstream deterministic code may not reinterpret it into new facts.
7. This state is session-scoped and recomputed from request history. No new Firestore memory store or cross-session thread persistence is introduced.
8. Open-thread state is context, not behavior authority. DialogueDecision still owns the conversational move, ResponsePlan owns final WHAT/WHETHER constraints, and SpeechIdentity owns HOW.
9. Phase 2 does not redesign Claim/Event provenance; that remains a separate Phase 3 responsibility.

## Why DiscourseState and not Memory?

A conversational thread describes the current discourse structure: whether an issue is unresolved, suspended or being resumed. Memory can supply evidence about past events, but letting memory decide conversational openness would make retrieval a behavior/discourse authority. Keeping the ledger in DiscourseState preserves the authority split and makes the capability removable without changing persistent memory semantics.

## Ambiguity rule

Positive continuity is allowed only when the discourse evidence is unambiguous. One compatible unresolved thread may be resumed. Two or more compatible unresolved threads produce an ambiguity observation; the runtime must clarify rather than silently selecting one.

## Acceptance criteria

- A typed third-party conflict/emotional turn can open one session thread.
- Unrelated smalltalk does not delete the unresolved thread and does not keep it falsely active.
- A later advice/recall turn resumes the single unresolved thread and exposes its quoted anchor evidence.
- Multiple unresolved threads cause ambiguity rather than deterministic guessing.
- Dyadic Kaira-user complaints do not open a third-party thread.
- Removing the thread projection removes long-range continuity without changing relationship or memory state, proving a distinct discourse responsibility.

## Consequence

The runtime gains positive long-range conversational continuity without adding a new top-level layer, without granting memory behavior authority and without weakening the single-semantic-authority rule. Phase 3 may later add structured Claim/Event provenance, but it must remain compatible with this discourse ledger rather than replacing it.
