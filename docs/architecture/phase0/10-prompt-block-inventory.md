# Kaira Phase 0 — Production Prompt Block Inventory

Source of truth: `KairaFinalProviderPromptParts` plus the actual `server.ts` builders feeding it.

Authority classes used here:
- `BEHAVIOR_AUTHORITY` — WHAT/WHETHER decisions.
- `EPISTEMIC_AUTHORITY` — what may be claimed as known/grounded.
- `IDENTITY_GROUNDING` — stable identity/participant grounding.
- `EVIDENCE` — observations/context only.
- `HOW` — style/realization only.
- `ASSEMBLY` — serialization only.
- `MIXED` — currently crosses classes; Phase 1 hardening required.

| Prompt part | Producer | Intended class | Current assessment | Phase 0 status |
|---|---|---|---|---|
| runtimeIdentityInstruction | `buildKairaRuntimeIdentityInstruction` | IDENTITY_GROUNDING | identity/config projection; explicitly avoids creating memory/relationship/emotion | GREEN conceptually |
| speechIdentityInstruction | `speechIdentityPrompt` | HOW | contains some WHAT-like relationship constraints despite HOW-only label | **MIXED — confirmed** |
| languageStyleMemoryInstruction | `languageStyleMemoryInstruction` | HOW | style/word/rhythm only; explicitly subordinate to plan | GREEN conceptually |
| dyadicLanguageAlignmentInstruction | `dyadicLanguageAlignmentInstruction` | HOW | user-style alignment only; explicitly cannot create intent/content/permission | GREEN conceptually |
| socialStyle | inline `server.ts` | HOW / global policy | mixes format/style with question/advice/problem-solving/memory-surfacing rules | **MIXED — confirmed** |
| groundingInstruction | `buildKairoGroundingInstruction` | EPISTEMIC_AUTHORITY / grounding | protects uncertainty and attribution but reparses raw history/message with regexes | **MIXED / raw-reparse trigger** |
| activeParticipantInstruction | `buildActiveParticipantInstruction` | IDENTITY_GROUNDING | binds active speaker and per-person memory/relationship separation | GREEN conceptually |
| entityGroundingInstruction | entity grounding builder | IDENTITY_GROUNDING | expected to serialize resolved entities; final classification must remain grounding-only | REVIEWED OWNER, no separate behavior authority expected |
| worldEventInstruction | world-event builder | EVIDENCE / event truth | expected canonical event serialization | REVIEWED OWNER, no social behavior authority expected |
| worldEventMemoryInstruction | `buildWorldEventMemoryInstruction` | EPISTEMIC_AUTHORITY / EVIDENCE | canonical recall constraints; prevents contradiction collapse and false verification | GREEN domain authority, must be typed |
| worldStateAppraisalInstruction | `buildWorldStateAppraisalInstruction` | EPISTEMIC_AUTHORITY / EVIDENCE | read-only truth/evidence posture; explicitly cannot mutate social state | GREEN domain authority, must be typed |
| worldReasoningPolicyInstruction | `buildWorldReasoningPolicyInstruction` | EPISTEMIC_AUTHORITY | bounded permissions for speaking about retrieved world memory; explicitly not social behavior authority | GREEN domain authority, must be typed |
| epistemicInstruction | `buildKairaEpistemicInstruction` | EPISTEMIC_AUTHORITY | explicit knowledge claim boundary; cannot reopen relationship/behavior authority | GREEN domain authority, must be typed |
| selfMemoryInstruction | autobiographical recall runtime | EPISTEMIC_AUTHORITY / EVIDENCE | grounds Kaira self-memory and forces fail-closed behavior when unavailable | GREEN domain authority, must be typed |
| dialogueInstruction | `buildDialogueBoardInstruction` | intended EVIDENCE | includes direct instructions to choose a social move and ask clarification | **MIXED — confirmed shadow authority** |
| discourseInstruction | `buildDiscourseObservationalInstruction` | EVIDENCE | #260 fixed one direct imperative; still requires typed block protection | GREEN current example / structural typing gap |
| dialogueDecisionInstruction | `buildCanonicalDialogueMoveContext` | EVIDENCE / obligation projection | canonical move/target observation; question/advice budgets intentionally omitted | GREEN conceptually |
| responsePlanInstruction | `buildCanonicalBehaviorBlock` + spontaneity instruction | BEHAVIOR_AUTHORITY + mixed extension | canonical behavior block is intended sole WHAT/WHETHER owner; appended spontaneity currently has raw-reparse/selection risk | **MIXED container** |
| canonicalObservationalContext | `buildCanonicalObservationalContext` | EVIDENCE | explicit observation-only KDM context | GREEN conceptually |
| sessionWorkingMemory | session-history builder | EVIDENCE | transcript context; must not become decision owner | GREEN conceptually, production-parity proof pending |
| memoryContext | validated persistent memory | EVIDENCE | retrieved prior memory text | GREEN conceptually, surfacing appropriateness remains evidence gap |
| tone | behavior profile projection | HOW | final style hint; must never reopen permissions | GREEN conceptually / typing needed |
| final natural-message instruction | serializer literal | ASSEMBLY / realization | asks for natural Turkish message only; acceptable assembly-level realization directive | GREEN conceptually |

## Important distinction: multiple authority domains are allowed

`Single WHAT/WHETHER Authority` does not mean only one authority object exists in the entire system.

The architecture may legitimately have separate, non-overlapping canonical authorities:
- semantic truth → `SemanticInterpretation@2`,
- epistemic/world truth permission → epistemic/world reasoning policies,
- identity grounding → runtime/entity grounding,
- social/behavior WHAT/WHETHER → `KairaResponsePlan`.

The violation occurs when an evidence/HOW/assembly block opens or reverses a social behavior decision owned by ResponsePlan, or when a downstream block reinterprets raw language into competing canonical meaning.

## Confirmed mixed surfaces entering Phase 1
1. SpeechIdentity.
2. `server.ts` socialStyle.
3. production Dialogue Board.
4. Controlled Spontaneity appended inside responsePlanInstruction.
5. grounding instruction raw-text reinterpretation path.
6. post-assembly repair directive (not a `KairaFinalProviderPromptParts` field, but real provider-facing instruction surface).

## Phase 1 design requirement
Prompt typing must cover **all** provider-facing blocks and post-assembly extensions, not only blocks already known to be risky.
