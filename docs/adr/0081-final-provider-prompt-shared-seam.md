# ADR-0081 — Shared final-provider prompt seam

Date: 2026-09-07
Status: Accepted

## Context

Phase 0 previously reconstructed only a production-core prompt snapshot while `server.ts` independently assembled the real provider system prompt inline. That meant a passing no-AI audit could still miss production-only ordering, formatting, or instruction drift.

The measurement gate requires production and the Phase 0 harness to share one final-provider system-prompt serializer before Phase 1 scale-up. This is an assembly refactor only: upstream services remain owners of their typed semantic, dialogue, response-plan, speech, memory, world, and epistemic blocks.

## Decision

`buildKairaFinalProviderSystemPrompt` is the single serializer for the provider system prompt boundary.

- `server.ts` must call this serializer rather than owning an inline template literal.
- The Phase 0 harness must call the same serializer.
- A regression source-contract test prevents production from drifting back to inline assembly.
- Byte-contract tests preserve the historical production ordering, including the existing no-separator behavior between language-style memory and dyadic alignment.
- Context fidelity remains a separate measurement dimension: sharing the serializer does not by itself claim that every Phase 0 upstream context input is production-equivalent.

## Consequences

- Production and Phase 0 can no longer silently diverge at the final system-prompt assembly seam.
- Prompt-format changes now have one explicit owner and one regression surface.
- No Gemini/OpenRouter call is added to Phase 0.
- No Test C behavior fix is introduced by this change.
- Phase 1 remains blocked until final CI/architecture review passes and the post-merge 423-turn report is reviewed with the updated prompt-coverage claim.
