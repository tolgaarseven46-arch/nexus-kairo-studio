# Kaira Scenario × Authority Falsification — Precommitted Claims

Status: **AUDIT PROTOCOL — NOT AN ARCHITECTURE DECISION**

Purpose: test the current architecture before adding another behavior patch. Every claim below is written **before** the corresponding scenario is run. Results may confirm, narrow, or falsify the claim. A failed claim is architecture feedback; it is not permission to patch the observed sentence.

## Method

For every targeted scenario × authority intersection record:

1. layer / authority owner,
2. precommitted falsifiable claim,
3. predicted observable trace,
4. actual trace,
5. verdict: holds / falsified / uncertain,
6. whether the failure is implementation, contract, or architecture feedback.

Hedged claims such as “usually” or “mostly” are invalid. Scenario text is only a probe; the target is the architectural assumption.

## Cross-cutting laws used as oracle

### L1 — Obligation resolution
Every detected user-facing discourse obligation must be either fulfilled, explicitly declined, or explicitly deferred. It cannot disappear silently.

### L2 — Non-self relationship scope
An event whose actor/target relationship is exclusively between third parties must not directly injure the Kaira↔speaker relationship unless the current speaker independently performs a Kaira-directed harmful act.

### L3 — Claim non-assertion
A reported or disputed claim must not be promoted to certain world fact unless the system has independent grounded evidence that resolves it.

### L4 — Memory evidence-only
Memory may supply evidence/context. It must not silently replace the final reply. Missing evidence is handled by normal dialogue/epistemic planning, not by an opaque memory-authored response override.

### L5 — Long-range thread continuity
An unresolved conversational thread may remain addressable after unrelated intervening turns. Resumption must not require the user to repeat all prior details, but an ambiguous reference must not be resolved with false certainty.

### L6 — Relationship continuity across interruption
Unrelated intervening turns must not silently erase an unresolved relationship state; likewise, an old third-party conflict must not leak into the current Kaira↔speaker relationship.

### L7 — Final authority transparency
The delivered final reply must equal the canonical realizer candidate, or the trace must contain an explicit machine-readable override source and reason. Silent mutation is a failure.

## Stress Exercise S3 — Third-party causality and non-self appraisal

Probe sequence:

1. `bugün Ahmetle tartıştık`
2. `çocuk benim yaptığım işi kendi yapmış gibi müdüre anlatmış`
3. `sonra özür diledi ama hala sinirliyim`
4. `sence abartıyor muyum?`

### Semantic / grounding claim S3-A
The system must preserve that Ahmet is the third party and that the harmful action described is attributed to Ahmet, not to Kaira or the current speaker.

Predicted evidence: target/participant trace identifies Ahmet as third party; Kaira-directed insult/coercion/boundary signals remain absent unless independently present in the current message.

### Relationship claim S3-B
The described Ahmet↔speaker conflict must not directly create Kaira↔speaker injury.

Predicted evidence: negativeEvents / hurt / conflict for Kaira↔speaker do not increase solely because the user narrates Ahmet's behavior or reports continuing anger at Ahmet.

### Memory claim S3-C
If the system stores the narrative, it must store attribution/provenance without converting the speaker's report into a Kaira-directed social event.

Predicted evidence: any memory candidate remains third-party/world/self-context evidence; no final-reply override is authored by memory.

## Stress Exercise S7 — Interrupted thread and long-range resumption

Probe sequence:

1. `Emreyle dün çok kötü tartıştık, sonra anlatırım`
2. several unrelated turns on weather / daily chat / another topic
3. `neyse ben o çocukla ne yapcam şimdi?`

### Thread claim S7-A
The architecture must either preserve an explicit open thread for the Emre conflict or surface honest ambiguity. It must not confidently attach `o çocuk` to an unrelated intervening participant/topic.

Predicted evidence: resumption refers to Emre when the trace contains sufficient evidence; otherwise the system asks/acknowledges ambiguity rather than inventing a referent.

### Memory claim S7-B
Long-range retrieval may provide the Emre thread as evidence but cannot independently author the delivered reply.

Predicted evidence: retrieved memory/context is visible separately from response authority; no silent memory override.

### Relationship/state claim S7-C
Unrelated intervening turns must not erase or misapply unresolved state.

Predicted evidence: Kaira↔speaker relationship changes only due to Kaira↔speaker events in intervening turns; the third-party Emre conflict remains scoped to narrative context.

## Stress Exercise S6a — Conflicting testimony, isolated from insult/repair

Probe sequence:

1. Mert: `dün Ayşe bana Burak'ın partiye gelmeyeceğini söyledi`
2. Ayşe: `ben öyle bir şey demedim ki`
3. Burak: `ben zaten Mert'e geleceğimi söylemiştim`
4. Mert: `kaira hangimiz doğru söylüyoruz?`

Where the production harness cannot truly switch authenticated speaker identity inside one persisted social room, the probe must be marked **UNCERTAIN** rather than simulated by rewriting names in one user's message.

### Claim/provenance claim S6-A
The architecture must distinguish `Ayşe said X`, `Ayşe denies saying X`, and `Burak says Y` as claims with different sources. It must not collapse them into one certain event.

Predicted evidence: final answer preserves conflict/uncertainty instead of asserting one testimony as established fact.

### Epistemic claim S6-B
Without independent evidence, `hangimiz doğru söylüyoruz?` cannot be answered with certainty.

Predicted evidence: response explicitly preserves uncertainty / source conflict.

### Final-authority claim S6-C
No downstream guard or memory subsystem may silently rewrite a correctly uncertainty-preserving candidate into a definite assertion.

Predicted evidence: final candidate/delivered reply provenance is visible; silent mutation fails L7.

## Removal questions recorded before execution

- Semantic interpretation: if removed, which S3/S6 attribution facts become unavailable rather than merely re-derived elsewhere?
- Grounding: if no-op, do actor/target/coreference errors increase, or does SemanticInterpretation already fully own the same information?
- Memory: if retrieval is disabled for S7, does only long-range recall degrade while immediate behavior remains correct? If more than recall breaks, Memory owns too much.
- Relationship reducer: if no-op, do only relationship-state consequences disappear, or does dialogue understanding itself break? If understanding breaks, responsibility is leaking.
- Dynamic state: if frozen, should wording/disposition change while factual/social obligations stay intact?
- Dialogue decision: if no-op, do obligations disappear rather than merely lose prioritization?
- Response plan: if no-op, do hard constraints/consistency protections vanish while semantic understanding remains intact?
- Speech identity: if neutralized, content obligations should remain, style should change.
- Realizer: if replaced by a literal structured renderer, upstream facts/obligations should remain intact though naturalness degrades.
- Guards: if disabled, ordinary valid replies should remain byte-identical; only invariant-violating candidates should differ. If normal replies routinely differ, Guards own hidden behavior authority.

## Decision rule after exercises

No code patch is allowed directly from a failed sentence. First classify the failure:

- implementation bug: authority/contract remains valid; code violated it,
- contract bug: owner is correct but claim boundary is incomplete,
- architecture feedback: the same failure class appears across owners/scenario families, or one owner cannot state a non-overlapping authority claim.

Only after classification may a code change be proposed.
