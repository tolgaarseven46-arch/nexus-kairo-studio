import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Keep CI memory bounded when long-session regression files run together.
    // Local development keeps Vitest's default worker count.
    maxWorkers: process.env.CI ? 1 : undefined,
  },
});
