# ADR-0021: Internal transcript transport syntax cannot reach final delivery

## Status
Accepted

## Context
A fresh 15-turn production chat after PR #83 produced a user-facing reply containing the internal prompt serialization verbatim: `[Mert]: ... [Kaira → Mert]: ...`. The history formatter intentionally uses bracketed speaker labels to preserve participant attribution for the model. Existing reply sanitization only removes a leading Kaira label; when the model echoes a user-labeled transcript segment first, that transport scaffolding survives and is accepted by final consistency.

Blindly stripping all labels is unsafe because the echoed user message could then be delivered as if Kaira had said it.

## Decision
Keep the internal attribution format. Add a deterministic structural conformance check at the canonical final-delivery boundary that rejects replies containing the formatter's transcript-wrapper syntax. It does not choose reply content or behavior; it only detects leakage of internal transport framing and lets the existing generation repair/fallback pipeline recover.

The check is generic over participant names. It rejects a leading bracketed speaker transport label or an embedded internal `Kaira/Kairo → participant` wrapper, while ordinary bracket usage remains valid.

## Consequences
- Prompt attribution scaffolding remains available to the generator.
- Internal transcript wrappers cannot be exposed as user-facing chat text.
- Recovery remains owned by the existing DialogueDecision → ResponsePlan → Realizer pipeline; no canned reply or string-rewrite authority is introduced.
- Future internal serialization formats must add equivalent non-leakage coverage if their syntax changes.
