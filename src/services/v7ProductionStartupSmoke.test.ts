import { afterAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

let child: ChildProcessWithoutNullStreams | null = null;
let dir = "";

afterAll(async () => {
  if (child && !child.killed) child.kill("SIGTERM");
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("V7 production startup smoke", () => {
  it("bundles the production server and reaches the listening state", async () => {
    dir = await mkdtemp(join(tmpdir(), "kaira-v7-startup-"));
    const outfile = join(dir, "server.cjs");
    await build({
      entryPoints: ["server.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      sourcemap: false,
      outfile,
    });

    const started = Date.now();
    const result = await new Promise<{ stdout: string; stderr: string; elapsedMs: number }>((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      child = spawn(process.execPath, [outfile], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_PATH: join(process.cwd(), "node_modules"),
        },
      });

      const timeout = setTimeout(() => {
        child?.kill("SIGTERM");
        reject(new Error(`startup timeout; stdout=${stdout}; stderr=${stderr}`));
      }, 15000);

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
        if (stdout.includes("NEXUS Kairo Studio running on http://0.0.0.0:3000")) {
          clearTimeout(timeout);
          const elapsedMs = Date.now() - started;
          child?.kill("SIGTERM");
          resolve({ stdout, stderr, elapsedMs });
        }
      });
      child.stderr.on("data", (chunk) => { stderr += String(chunk); });
      child.on("exit", (code) => {
        if (!stdout.includes("NEXUS Kairo Studio running on http://0.0.0.0:3000") && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`server exited ${code}; stdout=${stdout}; stderr=${stderr}`));
        }
      });
    });

    console.log("V7_STARTUP_SMOKE", JSON.stringify(result));
    expect(result.stdout).toContain("NEXUS Kairo Studio running on http://0.0.0.0:3000");
    expect(result.elapsedMs).toBeLessThan(15000);
  }, 25000);
});
