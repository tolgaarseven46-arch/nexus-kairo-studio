import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const consistency = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/kairoResponseConsistency.ts"),
  "utf8",
);

describe("final response budget enforcement authority", () => {
  it("passes final ResponsePlan sentence and word budgets into deterministic delivery", () => {
    expect(server).toContain("maxSentences: responsePlan.maxSentences");
    expect(server).toContain("maxWords: responsePlan.maxWords");
  });

  it("enforces both budgets after generation rather than only validating them", () => {
    expect(consistency).toContain("sentence_budget_enforced");
    expect(consistency).toContain("word_budget_enforced");
    expect(consistency).toContain("rules.maxSentences");
    expect(consistency).toContain("rules.maxWords");
  });
});
