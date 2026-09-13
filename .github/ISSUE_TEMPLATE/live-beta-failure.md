---
name: Live beta failure
description: Capture a real-human beta observation for deterministic replay and ownership analysis.
title: "[BETA] "
labels: []
assignees: []
---

## Session

- Session ID:
- Tester alias:
- App commit SHA:
- Provider/model:
- Character/instance ID:
- Conversation/user ID:
- Fresh state or hydrated:
- Restart/reload involved: yes/no

## Classification

- Primary class: LANGUAGE / DISCOURSE / RELATIONSHIP / MEMORY / AFFECT_APPRAISAL / DECISION_BEHAVIOR / SPEECH_REALIZATION / FINAL_DELIVERY / PERSISTENCE / PROVIDER_TRANSPORT / PRODUCT_UX / UNKNOWN
- Severity: S0 / S1 / S2 / S3
- Reproducible now: yes/no/unknown

## Exact failing window

Paste only the smallest contiguous conversation window needed to understand the failure. Preserve exact wording and order.

```text
<3-10 turns normally>
```

## Expected behavior

What should have happened, stated as an observable contract rather than a preferred phrase?

## Actual behavior

What was delivered or persisted?

## Captured runtime evidence

- Canonical `SemanticInterpretation@2` / LU event:
- Discourse/addressee/referent evidence:
- Relationship before -> after:
- Affect/reaction mode before -> after:
- Relevant memory read/write/lifecycle evidence:
- Dialogue decision / BehaviorContract:
- SpeechIdentity:
- Final-delivery decision/issues:
- Provider attempts/fallback/transport:
- Persistence/hydration evidence:

If a field was not captured, write `missing`. Do not reconstruct it from raw text.

## Suspected owning seam

Name the seam only if runtime evidence supports it. Otherwise write `unknown`.

## Deterministic reduction

- Minimal fixture/replay created: yes/no
- RED test path:
- RED command/run:
- Counterexample summary:

If no deterministic reduction exists yet, this issue is investigation-only. Do not patch production from the surface symptom.

## Fix / validation

Fill only after a measured RED exists.

- Owning-seam patch:
- Neighboring regressions:
- Full Tests:
- TypeScript:
- Production build:
- Architecture Review:

## Privacy check

- [ ] Secrets/API keys removed
- [ ] Unrelated personal data removed
- [ ] Only the minimum useful evidence window is included
