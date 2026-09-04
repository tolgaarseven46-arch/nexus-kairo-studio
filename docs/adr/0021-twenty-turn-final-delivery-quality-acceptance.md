# ADR-0021: Twenty-turn final-delivery quality acceptance

- Status: Accepted
- Date: 2026-09-04

## Context

PR #41-#45 closed semantic-provider stabilization and established observable canonical semantic snapshots in KNT. Existing long-session coverage proves state continuity, persistence, canonical routing, local-language quality, isolated final-delivery enforcement and speech-identity fingerprints, but those guarantees were not exercised together across one canonical mixed 20-turn conversation.

The next verified development question is therefore higher-level product behavior: whether the same canonical session keeps natural delivered replies, speech identity and qualitative relationship reactions coherent over time without reopening already-settled semantic-provider, C1/C2, repetition or emotional-load architecture.

## Decision

Add a permanent mixed 20-turn final-delivery acceptance regression.

The regression follows this authority chain:

`canonical semantic snapshot -> KDM -> discourse -> behavior contract -> dialogue decision -> speech identity -> response plan -> local/AI route -> deterministic final enforcement -> delivery quality checks`

It must verify that:

- all turns consume the shared canonical semantic interpretation instead of reparsing raw text downstream;
- both local-language and AI routes remain eligible in the same session;
- delivered replies satisfy the response-plan and rhythm boundaries;
- speech rhythm remains identity-stable while qualitative relationship state changes HOW Kaira speaks;
- hurt/repair state cannot leak stale over-familiar humor, emoji or premature `sorun yok` closure into delivered text;
- generic assistant/list formatting does not become acceptable social delivery;
- meaningful recent replies do not collapse into exact repeated canned output.

## Authority invariant

This acceptance test does not introduce a new semantic or behavior authority. Canonical semantic interpretation remains upstream authority; KDM/dialogue/response-plan layers continue to decide behavior; the final-delivery enforcement and existing rhythm/plan validators remain the delivery boundary.

A failing acceptance must be patched only when the failure is reproduced through this canonical chain. Do not add raw-text special cases or reopen completed provider stabilization without new evidence.

## Verification

- Permanent regression: `src/services/kairaTwentyTurnFinalDeliveryQualityRegression.test.ts`.
- CI must pass architecture contracts, autonomous runtime contracts, beta runtime regression, beta conversation acceptance, full tests, TypeScript and production build.
