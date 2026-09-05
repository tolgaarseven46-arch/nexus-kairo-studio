# ADR-0015: Conversation context may resolve referents but may not invent lexical meaning

## Status
Accepted

## Context
Production characterization of the real-chat `sg` failure showed that without history the canonical semantic provider returned a high-uncertainty neutral reading, while warm history upgraded the same token without lexical evidence into positive thanks + affection + closeness.

## Decision
For 2–3 character single-token utterances with history, the existing canonical provider performs a context-free adjudication. If that reading is strongly opaque/neutral while context adds content-bearing intent, valence, severity, social acts, affect, stop/repair/advice/query or relational meaning, context-free content wins. Target-only referent resolution remains permitted.

This is an invariant inside the existing canonical semantic authority, not an `sg` lexicon, downstream classifier, or response patch.

## Consequences
- Warm context cannot manufacture thanks/affection/closeness from opaque shorthand.
- Real short lexical commands such as `sus` remain intact when their context-free semantics are meaningful.
- 2–3 character turns with history may use one additional semantic-provider call; correctness is prioritized before latency optimization.
