import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

const DEDICATED_ACCEPTANCE_TESTS = [
  "**/kairaSeededComplexConversationLongSessionRegression.test.ts",
  "**/kairaSeededAdversarialConversationExploration.test.ts",
] as const;

const explicitDedicatedAcceptanceRun = process.argv.some((arg) =>
  DEDICATED_ACCEPTANCE_TESTS.some((pattern) =>
    arg.includes(pattern.replace("**/", "")),
  ),
);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Heavy seeded acceptance suites run through the dedicated beta gate.
    // Avoid duplicate full-suite auto-discovery while preserving explicit runs.
    exclude: explicitDedicatedAcceptanceRun
      ? configDefaults.exclude
      : [...configDefaults.exclude, ...DEDICATED_ACCEPTANCE_TESTS],
  },
});
