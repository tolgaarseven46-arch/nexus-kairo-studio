import { appendFileSync } from 'node:fs';

appendFileSync('PROJECT_STATE.md', `

## 108. Final-delivery language-memory learning boundary — 2026-08-31
- Local-language selection no longer mutates language-memory inside the local verbalizer before final enforcement.
- Local and AI paths now share the same learning authority boundary: only the final delivered reply is learned, only when final consistency accepts it and persistentUserMemory is enabled.
- Rejected or rewritten local drafts cannot contaminate persistent style memory.
- CI #1204 passed architecture contracts, full tests, TypeScript and production build.

## 109. Persistent-user-memory read/write/debug boundary — 2026-08-31
- persistentUserMemory=false now disables both learned-memory writes and learned-memory reads.
- Hydration, local learned selection, AI learned-style prompt injection and final learning are all gated by the instance policy.
- Stale learned profiles already present in RAM cannot influence a memory-disabled instance.
- The /api/kaira/language-memory diagnostic endpoint also respects the policy and cannot hydrate or expose an old learned profile while memory is disabled.
- Final CI #1215 passed architecture contracts, full tests, TypeScript and production build.

## 110. Language-memory user + Kaira-instance isolation — 2026-08-31
- Persistent language style is intentionally scoped to user + Kaira instance, not to an individual chat session.
- The same user with the same Kaira keeps learned style across new sessions; another Kaira instance does not inherit it.
- Different users remain isolated even when they talk to the same Kaira instance.
- The reference Kaira preserves the legacy user-only storage key for backward compatibility.
- CI #1216 passed architecture contracts, full tests, TypeScript and production build.

## 111. Evidence-driven stale-style adaptation — 2026-08-31
- Long-lived learned word evidence can now adapt when later accepted replies consistently stop using an old style marker.
- Decay is evidence-driven rather than wall-clock driven: idle time alone does not erase style; new accepted behavior supplies contrary evidence.
- Base Kaira identity weights never decay below their canonical baseline. Only learned excess can move back toward base.
- A three-recent-reply grace window prevents temporary wording changes from immediately erasing an established marker; sustained absence gradually removes stale learned preference.
- Exact phrase memory remains bounded but is not blindly decayed, preserving existing phrase-retention and repetition contracts.
- Regression verifies marker adaptation, base identity preservation and stale-affinity reduction.
- Final CI #1220 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Verify response-length adaptation separately. languageStyleMemorySignal derives averageWords from the bounded recentReplies window, so old long/short style should naturally turn over without a second decay mechanism. Add a regression first; patch only if the characterization fails.
`);
