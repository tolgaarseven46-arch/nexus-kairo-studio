import fs from "node:fs";
import { describe, expect, it } from "vitest";

const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const autonomous = fs.readFileSync(".github/workflows/kaira-autonomous-life.yml", "utf8");

const checkoutV5Sha = "fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09";
const setupNodeV5Sha = "a0853c24544627f65ddf259abe73b1d18a591444";

function expectSupportedNode24Actions(workflow: string) {
  expect(workflow).toMatch(new RegExp(`actions/checkout@(?:v5|${checkoutV5Sha})`));
  expect(workflow).toMatch(new RegExp(`actions/setup-node@(?:v5|${setupNodeV5Sha})`));
  expect(workflow).toContain("node-version: 24");
  expect(workflow).not.toContain("actions/checkout@v4");
  expect(workflow).not.toContain("actions/setup-node@v4");
  expect(workflow).not.toContain("node-version: 20");
}

describe("GitHub Actions runtime contracts", () => {
  it.each([
    ["ci", ci],
    ["autonomous-life", autonomous],
  ])("keeps %s on the supported Node 24 action/runtime family", (_name, workflow) => {
    expectSupportedNode24Actions(workflow);
  });
});
