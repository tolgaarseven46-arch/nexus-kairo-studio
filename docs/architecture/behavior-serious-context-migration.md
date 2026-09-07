# Behavior serious-context migration

Canonical production path:

`SemanticInterpretation@2 -> SocialAppraisal behavior seriousness -> computeBehaviorProfile(context)`

The raw-message distress keyword path is compatibility-only while legacy callers remain. It must not be used by `analyzeKdmInteractionCanonicalTurn`.

Removal criterion: once all remaining noncanonical direct callers supply structured context or are retired, delete the raw-message compatibility fallback entirely.
