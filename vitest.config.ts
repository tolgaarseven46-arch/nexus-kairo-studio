import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

const SEEDED_COMPLEX_LONG_SESSION =
  "**/kairaSeededComplexConversationLongSessionRegression.test.ts";
const explicitSeededComplexRun = process.argv.some((arg) =>
  arg.includes("kairaSeededComplexConversationLongSessionRegression.test.ts"),
);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // This heavy long-session acceptance already runs in the dedicated beta
    // acceptance gate. Avoid running it a second time during full-suite
    // auto-discovery, while preserving explicit/dedicated execution.
    exclude: explicitSeededComplexRun
      ? configDefaults.exclude
      : [...configDefaults.exclude, SEEDED_COMPLEX_LONG_SESSION],
  },
});
