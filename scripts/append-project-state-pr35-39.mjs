import fs from "node:fs";

const path = "PROJECT_STATE.md";
const marker = "## 133. Single semantic authority end-to-end — PR #35";
const source = fs.readFileSync(path, "utf8");
if (source.includes(marker)) {
  console.log("project state checkpoint already present");
  process.exit(0);
}

const appendix = `

## 133. Single semantic authority end-to-end — PR #35 — 2026-09-03
- PR #35 merged as commit \`183ceb925f69157ce38177fab732b285521ff598\` and closed the measured dual semantic-authority defect.
- Canonical per-turn truth is immutable \`SemanticInterpretation@2\`; provider output that is invalid/incomplete fails explicitly to \`fallback_regex\` rather than being silently default-filled.
- Live/history/client-server/persistence/hydration carry the semantic snapshot; historical discourse replay consumes persisted snapshots and never reparses raw historical text.
- Production KDM consumes \`canonicalSemantic.interpretation\` plus its deterministic grounded event projection through \`analyzeKdmInteractionCanonicalTurn(...)\`.
- Relationship scope is produced upstream at the language-understanding/entity-grounding boundary; third-party turns cannot damage/reward the dyadic Kaira-user relationship.
- \`stopQuestions\` and full-conversation \`stopRequest/stopTalking\` remain separate semantics.
- ADR-0012 records the accepted single-authority model. Full CI and Architecture Review passed before merge.

## 134. Semantic content / dialogue policy decoupling — PR #36 — 2026-09-03
- PR #36 merged as commit \`704343baff46788cf599cbd348369d67f7c0399c\`.
- Generic complaint/confusion classification no longer forces \`repair_or_rephrase\`.
- Clarification dependency and repair policy require explicit typed \`repairSignal\` evidence plus conversational dependency; stale or externally supplied clarification state cannot manufacture repair by itself.
- This preserves the authority split: semantic classification describes what the user turn contains; dialogue policy decides what Kaira should do.
- Full CI and Architecture Review passed before merge.

## 135. Binding social repetition policy — PR #37 — 2026-09-03
- PR #37 merged as commit \`160a04720972518f73d844192f39fd0bec7424bf\`.
- \`DiscourseState.selfRepeat\` is no longer observational-only. It projects into typed \`DialogueDecisionPlan.repeatGuard\` while preserving the already-chosen semantic move.
- Final dialogue validation deterministically rejects the same repeated Kaira social act; deterministic greeting/ack fallbacks are repetition-safe.
- Farewell is intentionally exempt because completing a user's goodbye remains a social obligation.
- Repetition evidence may constrain delivery surface, but may not reinterpret factual/recall/repair/correction/emotional semantics.
- ADR-0014 and permanent repetition contracts/regressions lock this behavior.

## 136. Emotional-load trust and threshold calibration — PR #38 — 2026-09-03
- PR #38 merged as commit \`da89bf6b6cac9c945335d992bc8bd7d475c63b69\`.
- Shared emotional-load policy now uses explicit bands: none < 0.30, mild 0.30–0.59, salient 0.60–0.79, intense >= 0.80.
- Canonical model emotional load may raise legacy/appraisal projection only when evidence confidence >= 0.65 and overall uncertainty <= 0.55; deterministic regex floor remains independently preserved.
- KDM maps to coarse \`duygusal_yük\` only at salient-or-higher load (>= 0.60). Mild trusted emotion remains numerically observable without being flattened into the full coarse label.
- ADR-0015 and permanent wiring/calibration regressions lock the policy. Final full suite, TypeScript, production build, guards and Architecture Review passed.

## 137. Canonical mixed 20-turn product acceptance — PR #39 — 2026-09-03
- PR #39 merged as commit \`7db585f3f36776a883cb9a09d8f7f096b0cf7dda\`.
- The existing high-level mixed local/AI + reported recall + relationship repair 20-turn regression was promoted from legacy test ingress to the live canonical boundary.
- Every turn now enters through \`understandTurkishMessage(...)\` with an immutable v2 snapshot, then feeds the gateway's interpretation + grounded event into \`analyzeKdmInteractionCanonicalTurn(...)\`.
- Every user history turn persists its exact \`semanticInterpretation\` snapshot and DiscourseState is derived from canonical history.
- The acceptance flow keeps both local and AI routing, world-memory reported-attribution guard checks, insult continuity, repair movement, repetition-aware discourse and monotonic interaction history.
- ADR-0016 records this test authority. Architecture contracts, autonomous runtime contracts, beta regression, beta conversation acceptance, full tests, TypeScript, production build, docs-guard, behavior-guard and Architecture Review all passed.

### Current verified checkpoint
- No open PR or open issue existed immediately before PR #39 work; PR #39 is now merged.
- PR #30–#39 are complete. Do not reopen canonical rollout compatibility, C1/C2, repetition or emotional-load work without a new measured regression.
- The architecture-migration/hardening phase is closed. Current work should remain in higher-level product behavior and quality validation.

### Next verified development question
- Audit **semantic-provider quality at the canonical ingestion boundary** separately from downstream behavior authority: build a deterministic recorded-output / fixture matrix for natural Turkish turns (social routine, emotional opening, complaint/confusion, repair signal, recall, third-party report, insult ambiguity, explicit stop, advice request) and measure whether provider-produced \`SemanticInterpretation@2\` preserves the field semantics now relied on by the canonical-only runtime. Do not loosen downstream policy to compensate for provider misclassification; fix producer/schema/prompt evidence only when a measured case proves it.
`;

fs.writeFileSync(path, source.replace(/\s*$/, "") + appendix + "\n");
console.log("appended PR35-39 checkpoint to PROJECT_STATE.md");
