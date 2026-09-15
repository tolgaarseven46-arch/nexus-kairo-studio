# ADR — Pre-AI Architecture Freeze

Date: 2026-09-15
Status: ACCEPTED / FROZEN
Scope: user input → final provider prompt boundary

## Decision

Kaira pre-AI architecture A–S is frozen at the architectural layer level.
General architecture audits no longer reopen it.
New architecture work requires one of:
1. a measured invariant violation with reproducible evidence,
2. a frozen reopening-condition hit (authority collision, ownership leak, cross-user contamination, persistence divergence, or a proof-path mismatch that invalidates a claimed proof),
3. an explicit new product requirement that expands the frozen system boundary.

Meaning/content may remain unknown, ambiguous, unresolved, or low-confidence. Authority, ownership, user scope, persistence ownership, lease ownership, and canonical semantic authority may not.

## Final A–S closure matrix

| Layer | Canonical owner | Grey-zone policy | Main invariant | Proof level | Failure containment | Final status |
|---|---|---|---|---|---|---|
| A Input / Evidence | language/evidence ingress contracts | evidence may be incomplete | evidence is typed before downstream interpretation | contract + deterministic E2E | malformed/weak evidence cannot silently become durable truth | CLOSED |
| B Entity / Attribution | entity resolution / attribution contracts | referent may remain unresolved | actor/target/addressee ownership is not guessed across users | contract + adversarial | unresolved attribution blocks unsafe projection | CLOSED |
| C Discourse / Episode | discourse/episode authority | thread/episode may remain ambiguous | continuation ownership is explicit before reuse | contract + seeded complex/adversarial | ambiguity triggers bounded clarification/fail-closed rather than silent thread theft | CLOSED |
| D Canonical Semantic | SemanticInterpretation@2 | unknown/ambiguous/low-confidence allowed | single current-turn semantic authority | characterization + contract + E2E | downstream layers cannot recreate shadow semantic truth | CLOSED |
| E Temporal / Lifecycle | typed lifecycle/temporal contracts | outcome may be unknown | temporal outcome does not silently decide appraisal/relationship meaning | contract + historical replay | unknown preserves uncertainty and blocks fabricated betrayal/repair | CLOSED |
| F Relationship | relationship reducer/state owner | relationship meaning may update conservatively | only owned dyadic evidence mutates the Kaira-user relationship | contract + persistence/integration | third-party/event-scoped evidence cannot corrupt dyadic state | CLOSED |
| G Memory | typed memory owners and projections | recall may fail/abstain | self/world/relationship/autobiographical scopes remain distinct | contract + historical + multi-user | uncertain or mismatched ownership fails closed | CLOSED |
| H Social Appraisal | social appraisal contracts | appraisal may be bounded/uncertain | attribution and prior context may modulate but not rewrite event identity | contract + neighbor proofs | non-dyadic events cannot fabricate dyadic damage/warmth | CLOSED |
| I Commitment / Norm | commitment/norm typed contracts | commitment state may be unknown | commitment meaning/lifecycle is not recreated downstream | characterization + contract | unknown does not manufacture betrayal or completion | CLOSED |
| J State Ownership | state owner / mutation boundary | no ownership grey zone | exactly one valid owner may mutate each durable state family | integration + persistence | ambiguity fails closed | CLOSED |
| K Concurrency | lease/serialization/idempotency boundary | no lease grey zone | concurrent mutation is serialized under owned coordination identity | concurrency proof | request-id-less and retry flows cannot collapse ownership | CLOSED |
| L Persistence / Hydration | persistence schema + hydration contracts | corrupt/version-mismatch data may be rejected | hydrated state cannot silently diverge from durable ownership/chronology | persistence/hydration proof | stale/corrupt snapshots lose to valid durable chronology or fail closed | CLOSED |
| M Decision / Behavior | BehaviorContract + KairaResponsePlan | behavior may be conservative/abstaining | WHAT/WHETHER permissions are owned here | contract + acceptance + validators | question/advice/social-action/repair permissions cannot be opened by style/assembly blocks | CLOSED |
| N Speech Identity | SpeechIdentity | qualitative style may vary | HOW only; no independent relationship or permission decisions | characterization + beta regression | style may narrow expression but cannot grant forbidden action | CLOSED |
| O Controlled Spontaneity / Historical Recall | typed historical consumers / grounding | recall may abstain | historical raw text cannot become a second semantic authority | characterization RED→GREEN + historical replay | missing semantic snapshot fails closed | CLOSED |
| P Observability / Trace | KNT/debug/typed trace surfaces | observability may omit non-authoritative prose | trace identifies owning seam/failure class without becoming authority | machine-readable + KNT replay | telemetry cannot mutate canonical meaning/state | CLOSED |
| Q Architecture Governance | ADRs + PROJECT_STATE rules + CI gates | known gaps may remain documented | volatile GitHub state is queried, not copied as authority | governance + CI guards | old chat/docs cannot silently reopen/override current repo truth | CLOSED |
| R Multi-Party Attention / Engagement | current active-speaker runtime + participant attribution | simultaneous arbitration undefined | current scope preserves per-user identity/isolation | multi-user isolation + attribution | simultaneous group engagement is not falsely claimed | FUTURE / OUT-OF-SCOPE |
| S Prompt Assembly / Realization Authority | final provider prompt serializer + upstream block owners | realization defaults may narrow expression | assembly/style blocks cannot manufacture new semantic certainty or WHAT/WHETHER permission | shared-production serializer + ResponsePlan/validator integration | forbidden behavior remains rejected after normal generation and repair | CLOSED |

## Final decision on S / socialStyle

`socialStyle` is classified as a conservative realization/default-style guard, not a second behavior authority.

Reason:
- it does not grant a new capability or permission;
- its rules are narrowing defaults such as shortness, avoiding unsolicited list/advice packaging, avoiding constant questions, conversational reaction before problem-solving, and style-compatible slang/emoji;
- hard question/advice/social-move/affection/forgiveness/reopening permissions remain owned by KairaResponsePlan / BehaviorContract and final validators;
- provider-output repair is revalidated by the same authority gates.

Therefore S is CLOSED. A future measured case in which a realization/style block causes a forbidden behavior to survive the final validator chain would satisfy the frozen reopening rule.

## Finite closure stress suite

No new unbounded sentence catalog is required. The smallest architecture-level closure suite is six composition classes, each backed by existing production/contract/integration gates that are already part of CI:

1. **Attribution × uncertainty × historical memory** — typed attribution, persisted semantic history, grounding/history authority tests and historical RED→GREEN replay.
2. **Repair × relationship × HOW** — repair-magnitude appraisal, ResponsePlan permission tests, SpeechIdentity HOW-only characterization, provider-output revalidation.
3. **Fragmented discourse × commitment lifecycle** — ambiguous thread/episode tests plus commitment/lifecycle typed contracts and seeded complex/adversarial acceptance.
4. **Concurrency × persistence × user isolation** — state-owner coordination, persistence/hydration chronology, request-id-less coordination, participant identity and multi-user isolation gates.
5. **Ambiguity × fail-closed × state mutation** — low-confidence semantic/world-memory fail-closed tests, attribution/discourse uncertainty gates, relationship/memory mutation ownership contracts.
6. **Provider-boundary authority collision** — final serializer/shared-production prompt path, Dialogue Board observational boundary, SpeechIdentity HOW-only boundary, KairaResponsePlan and final validator families.

These six are the frozen composition suite. They are not a claim that every natural-language sentence is understood. They prove failure containment and authority boundaries under representative cross-layer composition.

## Evidence at freeze

The freeze is based on main after PR #275 (`31ee9edb37a427cc7823fc5ac8e3e42a7e3f2f2e`) with merge-after CI run `35016543919` green for:
- architecture contracts,
- autonomous runtime contracts,
- beta runtime regression,
- deterministic Phase-0 scenario harness,
- machine-readable Phase-0 report,
- beta conversation acceptance + KNT replay,
- seeded complex acceptance,
- seeded adversarial acceptance,
- behavior bug-class proof manifest,
- historical RED→GREEN proof,
- full tests,
- TypeScript,
- production build.

## What freeze does not claim

- It does not claim zero product-quality bugs.
- It does not claim every ambiguous utterance is interpreted correctly.
- It does not claim provider/model answer quality.
- It does not claim simultaneous group-engagement arbitration, which remains future/out-of-scope.

It claims that the measured pre-AI architecture has explicit owners, contained grey zones, deterministic durable-state ownership, no known shadow semantic authority, and no measured current blocker at the provider-prompt boundary.

## Next phase

The next workstream may move to model-in-the-loop / answer-quality validation. Pre-AI architecture is reopened only under the frozen reopening rule above.
