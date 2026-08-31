import { appendFileSync } from 'node:fs';
appendFileSync('PROJECT_STATE.md', `

## 114. Cold-reload stale-phrase freshness parity — 2026-08-31
- Stale exact-phrase selection freshness is fully reconstructible from persisted canonical state: interactionCount, phraseWeights and recentReplies.
- A cold module/process reload followed by Firestore hydration reproduces the exact same deterministic candidate selections for the same seeds.
- No hidden in-memory freshness counter or session-only state is required.
- Regression trains a phrase, shifts style for many accepted turns, verifies stale selection pressure is bounded, persists, reloads, hydrates, then requires 50/50 deterministic selection parity with the pre-reload runtime.
- CI #1229 passed architecture contracts, full tests, TypeScript and production build.

### Language-memory long-horizon phase status
- The current package is closed across final-delivery learning authority, memory on/off policy, user+instance isolation, bounded persistence, self-drift caps, evidence-driven marker adaptation, response-length turnover, stale exact-phrase freshness and cold-reload parity.
- Further language-memory changes should require a newly measured failure rather than speculative tuning.
`);
