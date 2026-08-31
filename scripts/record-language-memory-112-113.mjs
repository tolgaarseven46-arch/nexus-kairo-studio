import { appendFileSync } from 'node:fs';
appendFileSync('PROJECT_STATE.md', `

## 112. Learned response-length turnover — 2026-08-31
- Response-length preference already adapts through the bounded recentReplies window; no second decay mechanism was required.
- Eight recent accepted replies fully turn over the length evidence window in either direction.
- Regression verifies medium -> very_short and very_short -> medium transitions after sustained recent behavior changes.
- No product-code patch was required; CI #1223 passed architecture contracts, full tests, TypeScript and production build.

## 113. Stale exact-phrase selection freshness — 2026-08-31
- Persistent phraseWeights remain bounded long-term evidence and are not destructively erased during style adaptation.
- Exact-phrase contribution to candidate affinity is now freshness-weighted at selection time.
- A phrase present in recentReplies keeps full learned contribution; after many accepted different replies, its selection bonus exponentially discounts even though the persistent historical phrase record remains.
- This closes a measured failure where an isolated historically trained phrase monopolized 100/100 later candidate selections after a sustained style change.
- The regression isolates exact-phrase pressure from base Kaira identity weights, so canonical base identity is not weakened to solve stale phrase learning.
- Final CI #1226 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Verify stale phrase freshness across cold process reload/hydration. The selection freshness must be reproducible from persisted interactionCount, phraseWeights and recentReplies without new hidden state.
`);
