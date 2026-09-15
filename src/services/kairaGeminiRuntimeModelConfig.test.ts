import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Gemini runtime model configuration", () => {
  it("overrides the hard-coded SDK request model through GEMINI_MODEL", () => {
    const root = mkdtempSync(join(tmpdir(), "kaira-gemini-model-"));
    const fakePackage = join(root, "node_modules", "@google", "genai");
    mkdirSync(fakePackage, { recursive: true });
    writeFileSync(
      join(fakePackage, "package.json"),
      JSON.stringify({ name: "@google/genai", version: "0.0.0-test", main: "index.cjs" }),
    );
    writeFileSync(
      join(fakePackage, "index.cjs"),
      `class GoogleGenAI {\n  constructor() {\n    this.models = {\n      generateContent: async (params) => ({ text: params.model })\n    };\n  }\n}\nmodule.exports = { GoogleGenAI };\n`,
    );
    const probe = join(root, "probe.cjs");
    writeFileSync(
      probe,
      `const { GoogleGenAI } = require('@google/genai');\n(async () => {\n  const ai = new GoogleGenAI({ apiKey: 'test' });\n  const result = await ai.models.generateContent({ model: 'gemini-3.6-flash', contents: [] });\n  process.stdout.write(String(result.text));\n})().catch((error) => { console.error(error); process.exit(1); });\n`,
    );

    const preload = resolve("scripts/kaira-gemini-model-preload.cjs");
    const output = execFileSync(process.execPath, [probe], {
      cwd: root,
      env: {
        ...process.env,
        GEMINI_MODEL: "gemini-2.5-flash-lite",
        NODE_OPTIONS: `--require=${preload}`,
      },
      encoding: "utf8",
    });

    expect(output).toContain("gemini-2.5-flash-lite");
    expect(output).not.toContain("gemini-3.6-flash");
  });
});
