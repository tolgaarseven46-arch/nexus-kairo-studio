# First Encounter Quality + Latency — Evidence-Gated Work Plan

Date: 2026-09-18
Scope: Kaira × PrivatRoom first encounter, welcome, first 3 user turns

## Non-negotiable goal

Do not ship another surface-level wording patch.

A change is acceptable only if it proves, with code/tests/runtime evidence, that the same Kaira identity behaves coherently from:
1. room creation,
2. welcome realization,
3. first user turn,
4. next 2 conversational turns,
5. persistence/replay.

## Three-dimensional proof model

### Dimension A — Architecture / Authority

Required evidence:
- PrivatRoom emits facts only; it must not choose welcome wording/persona.
- Kaira decision layer decides welcome/first-encounter behavior.
- Realization owns wording, not platform UI.
- Conversation Graph stays observational.
- No new standalone persona source is introduced.
- first-encounter handling must consume canonical semantic interpretation where available.
- cold-start relationship/memory isolation must remain true.
- all new behavior must be replayable/deterministic or have recorded realization provenance.

Block merge if:
- a platform-owned text pool is reintroduced,
- raw UI labels become Kaira identity truth,
- a new response path bypasses response constraints without explicit contract/tests.

### Dimension B — Behavior / UX

The following live failures are historical RED fixtures:
- welcome sounded scripted/unnatural:
  "Hoş geldin. Ben Kaira — baskı yok; ihtiyacın olduğunda seslen, buradayım."
- "naber" -> "he anladım"
- "napıyoruz burada" -> "heh, baya net söyledin"
- Kaira/Kairo identity mismatch
- Beta Kullanıcısı/Oyuncu generic-name leakage
- first reply took too long

Required behavior proofs:
- welcome is brief, natural, self-introducing, supportive, non-assistant-like.
- welcome communicates: who Kaira is + why she is here + user agency.
- simple greeting intent receives greeting-compatible response.
- "what are we doing here?" receives room-context-compatible response.
- user content must be semantically engaged; generic acknowledgement cannot pass when a direct question exists.
- Kaira identity is byte-consistent as "Kaira" in user-facing room surfaces.
- generic platform labels are never used as personal forms of address.
- same Kaira continuity is visible across welcome + first 3 turns.
- no forced room topic on every turn.
- max one open question per turn during first encounter.

### Dimension C — Runtime / Latency

Required evidence:
- record timing fields for first-encounter path.
- distinguish semantic, memory, KDM, provider, repair, persistence durations.
- simple greeting must have a bounded fast path that is Kaira-owned and semantically gated.
- fast path must not be a raw phrase table that becomes a second persona authority.
- direct question / unknown intent must fall through to canonical full pipeline.
- provider repair loop must not run unnecessarily for trivial greeting.
- compare before/after wall-clock evidence.

Target acceptance for live beta:
- simple greeting reply target: <= 3s server-side when no cold-start infrastructure delay occurs.
- canonical full-pipeline first-encounter turn target: <= 8s server-side under healthy provider conditions.
- if provider exceeds budget, return a semantically valid deterministic Kaira fallback instead of waiting ~20s.

These are beta SLOs, not permanent product guarantees.

## Historical RED scenarios

### RED-1 — Welcome
Input:
- room.created
- roomName: "kankalar"
- actor label may be generic

Reject:
- "baskı yok" / customer-support style
- internal jargon
- generic user label
- long feature list

Accept shape:
- <= 2 short sentences
- Kaira introduces herself
- support signal
- shared-room energy / user agency
- optional one light question, not required

### RED-2 — Greeting
Context:
- Kaira already welcomed user
User:
- "naber"

Reject:
- "he anladım"
- "iyiyim sen" as identity-less default
- room-management lecture

Accept:
- short socially reciprocal answer,
- same Kaira tone,
- may ask one short reciprocal question.

### RED-3 — Room-context question
User:
- "napıyoruz burada"

Reject:
- generic acknowledgement
- non-answer
- invented room purpose

Accept:
- explicitly answer that this is the user's/new room,
- mention Kaira can help shape/manage/energize it,
- preserve user agency,
- do not invent specific room purpose unless platform facts provide it.

### RED-4 — Identity
All user-facing room text and participants:
- Kaira only
Reject:
- Kairo
- Droit
- BOT
- capability/pipeline jargon

### RED-5 — Generic user labels
Reject personal address using:
- Beta Kullanıcısı
- Oyuncu
- Kullanıcı
- Siz

Generic labels may exist internally only.

## Implementation sequence

1. Capture current source/runtime path and exact latency contributors.
2. Add historical RED tests before fixes.
3. Introduce typed first-encounter semantic decision, not phrase-response authority.
4. Add deterministic realization for narrow safe intents:
   - greeting
   - reciprocal well-being
   - room-context question
   - fallback acknowledgement only when semantic interpretation allows it
5. Add direct-question engagement invariant to response constraints.
6. Add provider time budget + deterministic semantic fallback.
7. Normalize user-facing identity "Kaira".
8. Add timing provenance.
9. Run unit + architecture + historical RED→GREEN + full CI.
10. Deploy Kaira first.
11. Deploy PrivatRoom only if needed.
12. Run live room test and inspect TestRun evidence.
13. Do not call work complete until live evidence passes RED-1..RED-5.

## Evidence table to complete before merge

| Proof | Required | Status |
|---|---|---|
| historical RED fixtures reproduce current failures | yes | complete — CI run 35333356648 reproduced 4/4 live failures |
| architecture authority tests | yes | in progress — Architecture Review passing on repair branch |
| semantic engagement tests | yes | implemented — direct-question dressed acknowledgement rejection + room-context typed evidence |
| identity/generic-label tests | yes | implemented in historical RED→GREEN fixtures |
| latency budget tests | yes | implemented — canonical fast path + 2.5s semantic / 3.5s generation budgets; live timing pending |
| full Kaira CI | yes | running |
| live TestRun room.created provenance | yes | pending |
| live TestRun first 3 turns coherent | yes | pending |
| live server timing within target/fallback budget | yes | pending |

No merge based on visual confidence alone.
