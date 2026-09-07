import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverPath = path.resolve(process.cwd(), "server.ts");

function serverSource() {
  return fs.readFileSync(serverPath, "utf8");
}

describe("production final-provider prompt source contract", () => {
  it("routes production system prompt assembly through the shared serializer", () => {
    const source = serverSource();

    expect(source).toContain(
      'import { buildKairaFinalProviderSystemPrompt } from "./src/services/kairaFinalProviderPrompt";',
    );
    expect(source).toContain("const system = buildKairaFinalProviderSystemPrompt({");
  });

  it("does not reintroduce the historical inline production template", () => {
    const source = serverSource();

    expect(source).not.toContain(
      "const system = `${buildKairaRuntimeIdentityInstruction(kairaInstance, kairaPolicy, character)}\\n",
    );
  });
});
