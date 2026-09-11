# Provider-neutral canonical semantic boundary

Status: Accepted
Date: 2026-09-11

## Context

`resolveServerLanguageUnderstanding` previously named the LLM semantic provider from the requested transport (`llm_semantic_${preferredProvider}`). The transport layer may transparently fall back from OpenRouter to Gemini, so the requested provider is not a trustworthy canonical semantic identity.

## Decision

Canonical `SemanticInterpretation@2` parsing uses the stable provider-neutral identity `llm_semantic_runtime`. `preferredProvider` remains an input only to the text-generation transport selection. Concrete runtime provider/fallback identity remains observability metadata and must not influence canonical semantic/state transitions.

## Consequences

- Switching or falling back between OpenRouter and Gemini cannot rename the canonical semantic authority.
- Canonical KDM/state behavior remains provider-neutral.
- Runtime provider identity can still be recorded separately for diagnostics and cost/availability telemetry.
- A regression contract locks this boundary.
