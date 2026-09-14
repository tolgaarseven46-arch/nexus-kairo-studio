# Compound interaction characterization

Status: RED characterization / no production fix yet

## Context

PR #262-#266 closed five neighboring text-first architecture gaps independently: bounded semantic propositions/modality, persistence integrity gating, fragmented-message episode boundary, typed reply/mention context, and long-history provenance.

Those mechanisms have not yet been proven in compound interactions where multiple mechanisms are active in the same turn. Claude review identified this as the highest-value missing evidence before treating the text architecture as beta-ready.

## First measured question

Can a non-assertive proposition (`question`, `hypothetical`, `wish`, or `prediction`) still materialize betrayal appraisal when typed attribution carries `commitmentViolation: present`?

The canonical semantic layer may carry both proposition modality and attribution evidence. Appraisal must not silently flatten a non-assertive proposition into an asserted real-world violation.

## Characterization contract

The new characterization holds prior commitment identity, scope, confidence, provenance and attribution constant while varying only proposition modality.

Expected invariant:
- `assertion` preserves existing betrayal semantics;
- non-assertive modalities must not produce `betrayal.status = present` or positive betrayal confidence solely from the same current-turn evidence.

## Discipline

This commit intentionally adds no production behavior change. A RED result is evidence only. If RED is confirmed in CI, the next step is owning-seam analysis and the smallest fix that consumes canonical modality without creating a second semantic authority or reparsing raw text.

Follow-up compound families remain separate characterizations:
- episode × reply/mention interruption;
- non-assertive → assertion truth transition/persistence;
- same-name/different-person identity collision;
- later privacy-scope and parallel-conversation REDs.
