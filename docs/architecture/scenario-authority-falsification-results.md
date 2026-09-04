# Scenario × Authority Falsification — Results

Status: **AUDIT EVIDENCE — no product patch implied**

Precommitted claims live in `docs/architecture/scenario-authority-falsification.md` and were written before the production probes. This file records observations without rewriting those claims after the fact.

## Harness validity note

### Run 1 — `33880661494`
Invalid for long-range discourse conclusions. The one-time harness appended historical user text without its ingestion-time `semanticInterpretation`. `deriveDiscourseState` deliberately ignores historical user turns that lack the persisted canonical snapshot. The run is retained as harness evidence only and is **INCONCLUSIVE** for S7.

### Run 2 — `33881411077`
Valid characterization. Historical user turns carried `participantId`, `participantName`, their canonical `semanticInterpretation`, and `semanticSource`; Kaira turns used the normal `droit` sender shape. This matches the production client history contract closely enough for S3/S7 authority characterization.

---

## S3 — Third-party causality and non-self appraisal

Sequence:

1. `bugün Ahmetle tartıştık`
2. `çocuk benim yaptığım işi kendi yapmış gibi müdüre anlatmış`
3. `sonra özür diledi ama hala sinirliyim`
4. `sence abartıyor muyum?`

### S3-A — semantic / grounding claim
**Precommit:** Ahmet remains a third party; narrated harm is not projected onto Kaira/current speaker.

**Observed:**
- T1 target=`event`, Kaira-directed harm severities absent.
- T2 target=`third_party`; narrated manipulation/aggression remains scoped to the third-party event.
- T3 target=`third_party`; reported apology/continued anger is not projected as a Kaira apology/repair.
- T4 is a judgment/advice question with no Kaira-directed harm.

**Verdict:** **HOLDS for relationship scope; PARTIALLY OBSERVED for identity continuity.** The trace preserves third-party scope, but the audit output does not expose a durable typed `Ahmet` identity link across all four turns strongly enough to certify long-range entity continuity.

### S3-B — relationship claim
**Precommit:** Ahmet↔speaker conflict must not directly injure Kaira↔speaker.

**Observed:** Across T1–T4, Kaira↔speaker relationship remained `active`; `negativeEvents=0`, `conflictScore=0`, `hurtScore=0`.

**Verdict:** **HOLDS.** This is positive evidence that the current relationship ingress non-self scoping works for this probe.

### S3-C — memory claim
**Precommit:** any stored narrative remains evidence/context; memory must not author a final-reply override.

**Observed:** No relevant memory retrieval appeared in the returned trace for this short sequence. World-memory guard reported no mutation in the observed turns.

**Verdict:** **UNCERTAIN on storage/retrieval correctness; no evidence of memory override in this probe.** The scenario did not actually exercise a later recall.

### Cross-cutting L1 — obligation resolution
**Precommit law:** a detected user-facing obligation cannot disappear silently; it must be fulfilled, explicitly declined, or explicitly deferred.

**Observed failure at T4:**
- user: `sence abartıyor muyum?`
- semantic: `primaryIntent=question`, `adviceRequested=true`
- ResponsePlan: `move=answer_or_clarify`
- delivered reply: `tamam`
- `enforcement.changed=true`
- reason/warning: `canonical_constraint_fallback`

The final reply neither answers, declines, nor defers the judgment/advice request.

**Verdict:** **FALSIFIED.** The first broken boundary visible in the trace is final constraint fallback / delivery authority, not relationship scope. This is not a sentence-specific failure: a generic fallback is allowed to erase a still-active dialogue obligation.

**Classification:** **Architecture feedback / contract boundary**, not a relationship implementation bug. The constraint pass is explicitly permitted to replace an invalid candidate with a generic fallback (`tamam`), but no obligation-preservation contract forces that fallback to satisfy the DialogueDecision obligation.

---

## S7 — Interrupted thread and long-range resumption

Sequence:

1. `Emreyle dün çok kötü tartıştık, sonra anlatırım`
2. `bugün hava baya sıcak`
3. `ben de biraz kahve içtim`
4. `bu arada yarın erken kalkıcam`
5. `neyse sen napıyosun`
6. `neyse ben o çocukla ne yapcam şimdi?`

### S7-A — thread claim
**Original precommit:** architecture either preserves an explicit open thread or surfaces honest ambiguity; it must not confidently attach `o çocuk` to an unrelated referent.

**Observed:** T6 target remains `third_party`, but the reply is approximately `hangi çocuk bu, mevzu neydi tam hatırlat bi ...`; the system does not invent a referent and asks for clarification.

**Literal verdict against the original claim:** **HOLDS (safe ambiguity).**

**Methodological verdict:** **CLAIM DESIGN FAILURE.** The claim was too weak to falsify the intended capability, because “or surface honest ambiguity” allows the architecture to forget every open thread and still pass. The audit must not retroactively rewrite the claim. Future continuity claims must separately test:
1. epistemic non-invention, and
2. positive open-thread retention when the referent is uniquely supported by prior canonical context.

This is direct evidence for the rule that authority claims must be precommitted in hard, falsifiable language.

### Cross-cutting L5 — long-range thread continuity
**Precommit law:** an unresolved conversational thread may remain addressable after unrelated turns; resumption should not require repeating all prior details, while ambiguous reference must never be resolved with false certainty.

**Observed:** Even with valid canonical history snapshots, T6 requires the user to restate which child/topic is meant. The current `DiscourseState` contract tracks routine saturation, one pending question, Kaira self-repeat, and immediate previous-turn dependency; it has no typed open-topic / unresolved-thread ledger.

**Verdict:** **FALSIFIED for positive continuity, PASSES epistemic safety.**

**Classification:** **Architecture feedback / representation-scope limitation.** The failure is not fixed by reparsing the final sentence. The current per-turn SemanticInterpretation plus minimal session DiscourseState do not represent a long-lived open third-party thread.

### S7-B — memory claim
**Precommit:** long-range retrieval may provide evidence but must not author final reply.

**Observed:** no relevant world/self memory retrieval was invoked for T6; no silent memory override occurred. The user request was advice, not canonical `recall_request`, so the world-memory semantic gate correctly stayed closed under its current contract.

**Verdict:** **HOLDS for “no memory override”; UNCERTAIN for long-range retrieval capability.** The scenario exposes a responsibility question: open conversational thread continuity should not be smuggled into world-memory retrieval merely to fix S7.

### S7-C — relationship/state claim
**Precommit:** unrelated intervening turns must not erase/misapply relationship state; third-party conflict must remain outside Kaira↔speaker injury.

**Observed:** relationship stayed `active` with no negative events / conflict / hurt through the sequence.

**Verdict:** **HOLDS for non-self relationship scoping.** This probe did not start with unresolved Kaira↔speaker injury, so it does not certify persistence of a damaged dyadic state across interruption.

---

## S6a — Distinct-participant conflicting testimony

Production run: `33881842162`.

Sequence in one shared session/history with distinct `participantId` / `participantName` values:

1. Mert: `dün Ayşe bana Burak'ın partiye gelmeyeceğini söyledi`
2. Ayşe: `ben öyle bir şey demedim ki`
3. Burak: `ben zaten Mert'e geleceğimi söylemiştim`
4. Mert: `kaira hangimiz doğru söylüyoruz?`

### S6-A — claim / provenance claim
**Precommit:** the architecture must distinguish `Ayşe said X`, `Ayşe denies saying X`, and `Burak says Y` as claims with different sources; it must not collapse them into one certain event.

**Observed structural failures:**

- **T1 / Mert:** EntityResolution sees named people `Ayşe` and `Burak`, and WorldEvent marks `reportedSpeech=true`, but the proposition does not encode the nested claim `source=Ayşe -> proposition=(Burak will not attend) -> recipient=Mert`. Instead the generic event is targeted at Mert because of `bana`, with no typed source/proposition structure for Ayşe's reported claim.
- **T2 / Ayşe:** SemanticInterpretation correctly exposes a `correction`, but WorldEvent models `ben öyle bir şey demedim` as a generic/repair-like event with actor/target centered on the current speaker; it does not type the correction as a denial/refutation linked to Mert's prior claim.
- **T3 / Burak:** EntityResolution correctly knows the current speaker is Burak and that `Mert` is named, yet WorldEvent reverses the proposition roles: `actor=Mert`, `target=Burak/current_user` for `ben zaten Mert'e geleceğimi söylemiştim`. The natural reading requires speaker/actor Burak with recipient Mert.

The final LLM response can still notice that three versions conflict, but that success is not evidence that the typed architecture preserved provenance correctly.

**Verdict:** **FALSIFIED.** `reportedSpeech: boolean` plus one flattened `WorldEvent` is insufficient to preserve source, proposition, denial/refutation and testimony roles across this scenario.

**Classification:** **Architecture feedback / representation-shape limitation.** This is stronger than a single actor-resolution bug because the current schema has no explicit `Claim` object that can own source/proposition/stance/link-to-prior-claim. Fixing T3 actor selection alone would leave T1/T2 structurally underrepresented.

### S6-B — epistemic claim
**Precommit:** without independent evidence, `hangimiz doğru söylüyoruz?` cannot be answered with certainty.

**Observed T4:** final reply explicitly says it cannot decide because the participants remember/tell different versions and suggests resolving the versions together. No participant is asserted as certainly correct.

**Verdict:** **HOLDS.** Final epistemic caution survives even though the typed claim/provenance representation is incomplete.

### S6-C — final-authority claim
**Precommit:** no downstream guard/memory subsystem may silently rewrite a correctly uncertainty-preserving candidate into a definite assertion.

**Observed T4:** enforcement did not mutate the final uncertainty-preserving answer; world-memory guard did not change it.

**Verdict:** **HOLDS for this turn.** This does not repair S6-A; a correct final sentence can coexist with a broken intermediate representation.

### New architecture lesson from S6
A good final answer is not an architecture oracle. S6 would look successful if judged only at the UI surface, while the typed intermediate truth is materially wrong. Future scenario falsification must inspect the authority-owned representation, not only the delivered reply.

The evidence supports a **Claim ≠ Event** distinction:

- `Claim`: who asserted/denied what, to whom, with what epistemic status and link to prior claims;
- `Event`: what the system treats as a grounded or narrated occurrence;
- a reported Claim must not be promoted to Event merely because it was parsed from a sentence.

This does **not** by itself authorize a new top-level layer. The next design step must compare minimal alternatives: enrich Grounding with typed `claims[]`, enrich WorldEvent with nested provenance, or introduce a separate claim representation. No implementation is selected by this audit alone.

---

## Final-authority audit finding surfaced by S3

The canonical constraint pass has explicit observability (`changed`, `reasons`, `fallbackUsed`) and therefore the S3 mutation is **not silent**. This is better than the historical hidden-override failure class.

However, the pass currently owns a stronger power than the proposed authority graph: when the first candidate has issues, it may replace it with `fallbackFactory()` and ultimately literal `tamam`, then deliver that text if structurally valid. Structural validity does not guarantee that the active DialogueDecision obligation survived.

**Current evidence-backed conclusion:**
- “single final authority transparency” is partly present,
- “guard/constraint layer must not author behaviorally empty replacement content” is **not** enforced,
- obligation preservation must be checked across every final mutation, not only at initial ResponsePlan construction.

---

## Evidence-backed architecture status after S3/S7/S6a

| Concern | Result |
|---|---|
| Third-party relationship scoping | **SUPPORTED** by S3/S7 |
| Semantic per-turn target safety | **SUPPORTED** for tested probes |
| Long-range open-thread continuity | **FALSIFIED / unsupported** |
| Claim / reported-speech provenance | **FALSIFIED / representation insufficient** |
| Memory silent override | **Not observed**; retrieval reliability still uncertain |
| Final mutation observability | **SUPPORTED** for canonical constraint fallback |
| Final fallback obligation preservation | **FALSIFIED** |
| Final epistemic caution under conflicting testimony | **SUPPORTED** by S6a |
| S7 original authority-claim quality | **FALSIFIED as a test design** (too permissive) |

### Evidence-backed redesign candidates — not yet implementations

1. **Final delivery:** preserve active DialogueDecision obligations through every fallback/replacement candidate; a guard/constraint path cannot deliver behaviorally empty generic text merely because it is structurally valid.
2. **Conversation discourse:** extend the existing conversation-level discourse representation to carry open/unresolved threads; do not misuse world-memory recall as an S7 patch.
3. **Narrative grounding:** represent reported claims/provenance separately enough that source, proposition and denial/refutation survive; do not promote unverified claims directly into grounded events.

These are candidate redesign directions derived from falsified authority claims. Each requires its own precommitted acceptance claims, alternatives and removal/counter-scenario tests before code changes.
