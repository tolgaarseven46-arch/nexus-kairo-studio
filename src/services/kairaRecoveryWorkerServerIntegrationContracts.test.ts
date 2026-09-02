import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Kaira recovery worker server integration contracts", () => {
  it("registers exactly one authenticated proposal recovery worker route", () => {
    const source = fs.readFileSync("server.ts", "utf8");
    expect(source.match(/registerKairaProposalRecoveryWorkerRoute/g)?.length).toBe(2);
    expect(source).toContain(
      'import { registerKairaProposalRecoveryWorkerRoute } from "./src/services/kairaProposalRecoveryWorkerRoute";',
    );
    expect(source).toContain("app.use(express.json());\nregisterKairaProposalRecoveryWorkerRoute(app);");
  });

  it("does not add a process-local interval loop for recovery", () => {
    const source = fs.readFileSync("server.ts", "utf8");
    expect(source).not.toMatch(/setInterval\s*\([^)]*proposal-recovery/i);
    expect(source).not.toMatch(/setInterval\s*\([^)]*recoverSelectedKairaActivityProposals/i);
  });
});
