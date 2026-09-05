# ADR-0042: Conversation-quality social move and grounding boundaries

## Status
Accepted

## Context
A natural 15-turn quality session exposed five related failures after the hardening phase: Kaira-directed intimacy/repair requests collapsed to generic `he anladım`; semantically rich third-party causal turns could enter the local renderer; colloquial second-person evidence (`senle`) could disagree with semantic target; accountability complaints could be labeled as insult patterns; and generic activity permission copy duplicated the noun.

## Decision
1. DialogueDecision owns a typed `respond_to_relational_bid` move. PlanResolver resolves that move into one explicit plan-owned social action (`accept_repair`, non-romantic reciprocity, warm deflection, boundary, or boundary maintenance). Final validators may reject acknowledgement-only realization but may not choose a different action.
2. Local rendering remains a verbalizer only and is ineligible for knowledge/causal queries, typed relational acts, or emotionally loaded third-party turns. Existing dyadic HOW-style selection, relationship-level projection, learned-language memory, and trivial `how_are_you`/routine behavior remain unchanged; the quality change is only a semantic-richness eligibility gate before the accepted verbalizer.
3. Entity resolution recognizes ordinary Turkish comitative pronoun forms and the language-understanding gateway reconciles a conflicting third-party target only when high-confidence explicit Kaira reference exists and no explicit third party exists.
4. Accountability complaints are not insult-pattern events without an explicit typed insult/mockery signal. Real insults remain injury-bearing.
5. Activity permission presentation fixes generic copy without changing planner identity or dialogue authority.

## Authority alignment
Target reconciliation mutates the canonical `SemanticInterpretation@2` value inside the language-understanding gateway before the single compatibility projection. `buildResult` still projects exactly once through `projectSemanticEvent(interpretation)`. Entity evidence therefore constrains the existing semantic authority rather than introducing a second semantic-event authority.

## Consequences
The changes add no parallel behavior authority. Semantic/entity reconciliation occurs inside the canonical language-understanding gateway; social action remains plan-owned; local routing consumes existing canonical semantics; and final delivery only validates the selected action.
