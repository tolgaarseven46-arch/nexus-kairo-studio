import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(root, "config/beta-conversation-acceptance.json"), "utf8"),
) as { tests: string[] };
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(root, "package.json"), "utf8"),
) as { scripts?: Record<string, string> };

const FINAL_DELIVERY_ACCEPTANCE =
  "src/services/kairaTwentyTurnFinalDeliveryQualityRegression.test.ts";

describe("beta final-delivery acceptance characterization", () => {
  it("promotes the durable 20-turn delivered-reply quality invariant into beta acceptance", () => {
    expect(manifest.tests).toContain(FINAL_DELIVERY_ACCEPTANCE);
  });

  it("keeps that acceptance invariant distinct from the beta regression package", () => {
    const betaCommand = packageJson.scripts?.["test:beta"] ?? "";
    expect(betaCommand).not.toContain(FINAL_DELIVERY_ACCEPTANCE);
  });

  it("targets an existing deterministic product-facing scenario", () => {
    expect(fs.existsSync(path.resolve(root, FINAL_DELIVERY_ACCEPTANCE))).toBe(true);
  });
});
