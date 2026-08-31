from pathlib import Path

path = Path('PROJECT_STATE.md')
text = path.read_text(encoding='utf-8')
marker = '## 104. Learned language HOW loop and reply-level evidence — 2026-08-31'
if marker not in text:
    text += '''

## 104. Learned language HOW loop and reply-level evidence — 2026-08-31
- Persistent language-memory exposes a safe derived HOW-only signal to the AI path without replaying raw prior replies, topics or memories.
- The derived signal contains only maturity, bounded preferred discourse markers and recent average response length. ResponsePlan permissions and SpeechIdentity relationship/register limits remain higher authority.
- Learned marker evidence is reply-level: repeating the same marker multiple times inside one accepted reply counts as one evidence step; learned preference requires evidence across separate accepted replies.
- Canonical language-style observability remains available in KNT/test-session metadata.
- CI #1179 and #1181 passed architecture contracts, full tests, TypeScript and production build.

## 105. Bounded self-reinforcing language drift — 2026-08-31
- Learned word growth is capped relative to each word's base weight with MAX_LEARNED_WORD_DELTA=2.1, preventing accepted self-generated replies from amplifying a marker without bound.
- Recency penalties remain separate from learned style affinity, so style can stabilize without forcing immediate exact-repeat loops.
- A deterministic 200-turn self-training regression verifies at least four distinct responses survive, consecutive exact duplicates stay at zero and the most frequent candidate remains at or below 45 percent of the run.
- Core self-reinforcement CI #1183 and the long-run selection regression both passed architecture contracts, full tests, TypeScript and production build.

## 106. Learned style stays below relationship HOW authority — 2026-08-31
- SpeechIdentity remains the canonical relationship HOW source. Learned language style cannot reopen a closeness surface that current relationship state does not permit.
- In rhythm-sensitive social moves, kanka is a close-only address surface: new/familiar levels route it into the existing repair chain, while close relationships may use it naturally.
- Factual/non-social moves remain exempt so quoted or explanatory uses are not blocked.
- The canonical speech.relationshipLevel is passed through all five AI rhythm validation seams: initial draft, repaired draft, grounded fallback, world-guard revised reply and plan-safe fallback.
- Final CI #1189 passed architecture contracts, 825/825 tests, TypeScript and production build.

## 107. Stale close-style memory cannot override current relationship context — 2026-08-31
- Added an explicit context-change regression that heavily trains the same language-memory profile with close-style kanka replies, then evaluates local natural social replies under a current new relationship state and new ResponsePlan relationship level.
- The stale close-style memory does not leak kanka back into the new-relationship local response pool; current relationship HOW remains authoritative over learned historical preference.
- CI #1191 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Audit whether persistent phrase/word evidence needs time/context decay beyond existing key bounds, self-reinforcement caps and recency pressure. Add decay only if deterministic long-horizon simulations show stale learned preferences measurably dominating current safe candidate selection.
'''
    path.write_text(text, encoding='utf-8')
