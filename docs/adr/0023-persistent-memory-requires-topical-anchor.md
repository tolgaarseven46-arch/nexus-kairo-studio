# ADR-0023: Persistent memory requires a topical anchor

- Status: Accepted
- Date: 2026-09-04

## Context

The post-PR #46 30-turn production characterization surfaced replies that unnecessarily foregrounded memory with surfaces such as `Hatırladığım kayda göre...` even when the current turn did not need an old memory.

The persistent-memory relevance gate in `kairoMemoryConsistency.ts` could accept unrelated memories in two ways:

1. a generic recall cue such as `benim`, `geçmiş` or `daha önce` added enough score to pass without any topical overlap;
2. short memories could pass the 0.2 lexical threshold from a single generic/temporal overlap such as `bugün`.

Once accepted, that memory was exposed to the response model as validated memory context. Prompt instructions asked the model not to use irrelevant memory, but relevance authority had already made the wrong item visible.

## Decision

Persistent memory retrieval must have at least one **topical anchor** shared by the stored memory and the current user message.

Generic recall and temporal tokens (`benim`, `geçmiş`, `bugün`, `yarın`, `hatırla`, etc.) do not count as topical anchors by themselves.

A memory is accepted when either:

- at least two topical query tokens occur in the memory; or
- at least one topical token occurs and covers at least 30% of the topical query tokens.

Recall cues may increase diagnostic confidence only after a topical anchor exists. They can never independently grant memory visibility.

## Authority boundary

This is a retrieval/relevance narrowing only. It does not create memories, change factual content, alter relationship state, choose a dialogue move, or grant the model new semantic authority.

Session working memory, world memory, autobiographical memory and language-style memory remain separate mechanisms.

## Consequences

- Fresh emotional/social turns no longer receive persistent memories merely because they share temporal/generic language.
- `benim ...` no longer acts as a wildcard over the user's entire memory history.
- Explicit anchored recalls such as `Mert yarın ne yapacaktı` remain retrievable.
- Concrete preference recalls remain retrievable when the topic itself is present.
- The behavior is protected by unit and persistent-memory relevance regression tests.
