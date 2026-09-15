# Kaira Phase 0 — Red-Team Resolution and Phase 1 Order

## Source
Mandatory Claude red-team response to `12-claude-redteam-trigger.md`.

## Accepted classifications

| Trigger | Classification | Frozen owner | Phase 1 treatment |
|---|---|---|---|
| T1 Controlled Spontaneity raw historical reparse | STRUCTURAL | persisted turn-linked canonical semantics + bounded realization | replace raw semantic reparse after persistence-access proof |
| T2 SpeechIdentity WHAT leakage | MIXED: EVIDENCE + STRUCTURAL-CANDIDATE | ResponsePlan / SpeechIdentity | characterization first; no new field until counterexample |
| T3 Dialogue Board behavior directives | STRUCTURAL + TEST | DialogueDecision | highest-priority content bug; make board observational and test real production surface |
| T4 server socialStyle mixed authority | STRUCTURAL | split across canonical owners | remove duplicates at owners; do not relocate giant string |
| T5 repair post-assembly extension | STRUCTURAL | narrow Repair Authority | typed realization-only RepairDirective |
| T6 Conversation Grounding raw semantic conclusions | STRUCTURAL | SemanticInterpretation@2 / typed semantic evidence | lexical ranking may remain; semantic conclusions must return to canonical authority |
| T7 prompt authority typing | STRUCTURAL | shared PromptBlock model + serializer | first Phase-1 PR; warning/checker foundation |

## Important non-bugs
1. Forgiveness is staged refinement, not duplicate ownership.
2. Local Language Engine is conceptually realization-only; add only no-widening proof unless a real counterexample appears.
3. Autonomous activity permission does not alter canonical reply text; structured UI remains separate.

## Frozen Phase 1 PR order

### PR-1 — Typed prompt-block authority classification
**Problem:** `KairaFinalProviderPromptParts` is string-only and cannot express authority class.

**Owner:** prompt block model + final serializer.

**Characterization RED:** introduce an authority checker test that fails on synthetic versions of the known #260/T3 violation family.

**Minimal implementation target:** define typed authority classification and wire initial blocks in warning/diagnostic mode; do not use this PR to rewrite T3/T4/T6 content.

**Compound fast-check:** synthetic observational/HOW block containing question/move permission must be detected.

**Exit gate:** known #260-style and T3-style injected violations are detected; normal known-clean blocks do not fail; full CI green.

### PR-2 — Production Dialogue Board authority cleanup
Make board observational only and ensure the fast/authority harness injects the actual production board surface.

### PR-3 — Bounded Expression Variation historical semantics
Remove legacy historical `interpretSemanticEvent(text)` use after verifying persisted turn-linked canonical semantics are available.

### PR-4 — Typed RepairDirective
Formalize realization-only repair scope without reopening behavior/semantic authority.

### PR-5 — SpeechIdentity characterization
Test withdrawn reopening-closeness and repairing/full-repair semantics before any field addition/removal.

### PR-6 — server socialStyle split/removal
Classify each rule against its owner and delete duplicate server-owned behavior policy.

### PR-7 — Conversation Grounding canonicalization
Keep lexical retrieval where appropriate but move semantic uncertainty/judgment conclusions under canonical semantic authority.

## Parallelism rule
PR-3 / PR-4 / PR-5 may be prepared in Hat B while the active Hat A work advances, but before promotion each must run the Fast-Discipline stale-assumption sync against newly merged authority types/contracts.

## Scope discipline
- One owning seam per PR.
- T7 typing is a detection/classification mechanism, not a substitute for content cleanup.
- No blanket `server.ts` refactor.
- No Local Engine redesign without a new counterexample.
- No new T2 ResponsePlan field without characterization proof.
