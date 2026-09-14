# Compound interaction characterization

Status: Accepted / GREEN

## Context

PR #262-#266 closed five neighboring text-first architecture gaps independently: bounded semantic propositions/modality, persistence integrity gating, fragmented-message episode boundary, typed reply/mention context, and long-history provenance.

Those mechanisms had not yet been proven in compound interactions where multiple mechanisms are active in the same turn. Claude review identified this as the highest-value missing evidence before treating the text architecture as beta-ready.

## First measured question

Can a non-assertive proposition (`question`, `hypothetical`, `wish`, or `prediction`) still materialize betrayal appraisal when typed attribution carries `commitmentViolation: present`?

The canonical semantic layer may carry both proposition modality and attribution evidence. Appraisal must not silently flatten a non-assertive proposition into an asserted real-world violation.

## Measured RED

PR #267 first added only the characterization contract. On RED head `9175c881b71e05ff944fcd746f297f845c9848ed`:
- Architecture Review was GREEN;
- docs-guard and behavior-guard were GREEN;
- architecture contracts, autonomous runtime contracts, beta runtime regression, Phase-0 deterministic harness/report, beta conversation acceptance/KNT replay, proof manifest, and historical RED→GREEN proof all passed;
- the full `Tests` step failed before TypeScript/build.

Source inspection confirmed the owning seam: `assessCommitmentBetrayal()` consumed canonical typed violation attribution but did not consume `SemanticProposition.modality` at all.

## Minimal fix

The appraisal seam now mirrors the already-established persistence integrity rule without creating a new semantic authority:
- if proposition evidence exists and **none** is `assertion`, betrayal fails closed to `unknown` with confidence `0`;
- if proposition evidence is absent, legacy compatibility is preserved;
- if at least one assertion exists, existing betrayal semantics are preserved.

No raw text is reparsed and no regex/phrase classifier is added.

Neighboring coverage additionally proves:
- all four non-assertive modalities fail closed;
- a single assertion still allows existing betrayal behavior;
- legacy semantic interpretations without propositions remain compatible;
- mixed proposition evidence containing an assertion is not incorrectly suppressed.

## GREEN evidence

Fix/test head `227d861e18f3a34bcd48c1f076c87a6145e8910f`, CI run `34858776042`:
- docs-guard GREEN;
- behavior-guard GREEN;
- Architecture Review GREEN on the same fix sequence;
- architecture contracts GREEN;
- autonomous runtime contracts GREEN;
- beta runtime regression GREEN;
- Phase-0 deterministic harness/report GREEN;
- beta conversation acceptance/KNT replay GREEN;
- bug-class proof manifest GREEN;
- Historical RED → GREEN proof GREEN;
- full Tests GREEN;
- TypeScript GREEN;
- production build GREEN.

The final documentation-only head must still satisfy repository governance before merge.

## Follow-up compound families

Keep these as separate measured characterizations rather than bundling speculative production work into this PR:
- episode × reply/mention interruption;
- non-assertive → assertion truth transition/persistence;
- same-name/different-person identity collision;
- later privacy-scope and parallel-conversation REDs.
