import fs from "node:fs";
import { describe, expect, it } from "vitest";

const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const autonomous = fs.readFileSync(".github/workflows/kaira-autonomous-life.yml", "utf8");

describe("GitHub Actions runtime contracts", () => {
  it.each([
    ["ci", ci],
    ["autonomous-life", autonomous],
  ])("keeps %s on the supported Node 24 action/runtime family", (_name, workflow) => {
    expect(workflow).toContain("actions/checkout@v5");
    expect(workflow).toContain("actions/setup-node@v5");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).not.toContain("actions/checkout@v4");
    expect(workflow).not.toContain("actions/setup-node@v4");
    expect(workflow).not.toContain("node-version: 20");
  });
});
