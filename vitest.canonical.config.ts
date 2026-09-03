import { defineConfig } from "vitest/config";

/**
 * Explicit CANONICAL test run (ADR-0006 foundation repair).
 *
 * The default `vitest run` keeps every canonical flag OFF, so the whole legacy
 * suite is exercised on the legacy engine unchanged. THIS config turns the wired
 * canonical flags ON and runs the curated set of tests that must pass on the
 * canonical path.
 *
 * Answer to "which engine are we testing?": `npm run test:canonical` = canonical.
 */
export default defineConfig({
  test: {
    name: "canonical",
    env: {
      RELATIONSHIP_REDUCER_V2: "1",
      PLAN_RESOLVER_V2: "1",
      CANONICAL_PROMPT_BUILDER: "1",
      UNIFIED_GUARD_PASS: "1",
    },
    include: [
      // canonical core
      "src/services/relationshipReducer.test.ts",
      "src/services/relationshipReducerGoldenSession.test.ts",
      "src/services/relationshipReducerRepairInvariant.test.ts",
      "src/services/kairaPlanResolver.test.ts",
      "src/services/kairaFlirtationBoundaryRegression.test.ts",
      "src/services/kairaCanonicalPromptBuilder.test.ts",
      "src/services/kairaCanonicalPromptAuthorityRegression.test.ts",
      "src/services/kairaResponseConstraintPass.test.ts",
      "src/services/semanticContextGrading.test.ts",
      "src/services/kdmRelationshipReducerBridge.test.ts",
      // foundation repair
      "src/services/discourseStateReducer.test.ts",
      "src/services/kairoLocalLanguageEngineAuthority.test.ts",
      "src/services/kairaFoundationFirstConversationRegression.test.ts",
      "src/services/kairaEmotionalLoadWiring.test.ts",
    ],
  },
});
