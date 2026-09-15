# ADR — Gemini live-test model cost control

Date: 2026-09-15
Status: Accepted

## Context

Pre-AI architecture A–S is frozen. The next validation phase is model-in-the-loop answer-quality testing. Production `server.ts` currently passes `gemini-3.6-flash` directly to `@google/genai`, which is unnecessarily expensive for broad live-quality exploration.

## Decision

Do not reopen or modify the frozen pre-AI architecture for model cost selection.

Render may preload `scripts/kaira-gemini-model-preload.cjs` through `NODE_OPTIONS`. When `GEMINI_MODEL` is set, the preload replaces only the `model` field of outbound `@google/genai` `generateContent` requests. It does not alter semantic interpretation, state ownership, memory, relationship, behavior, response-plan, prompt assembly, validation, persistence, or final-delivery logic.

For the low-cost live test phase, Render will use:

- `GEMINI_MODEL=gemini-2.5-flash-lite`
- `NODE_OPTIONS=--require=./scripts/kaira-gemini-model-preload.cjs`

The override is reversible by changing/removing environment variables; no architecture migration is required.

## Proof

`src/services/kairaGeminiRuntimeModelConfig.test.ts` uses a fake `@google/genai` module and a real Node preload process to prove that a request whose source model is `gemini-3.6-flash` is dispatched as the configured `gemini-2.5-flash-lite` value.

No external provider call is made by this deterministic proof.

## Boundary

This ADR controls provider/model cost only. Answer-quality results belong to the model-in-the-loop phase. A weak answer from the cheaper model does not reopen pre-AI architecture unless a frozen reopening condition is independently measured.
