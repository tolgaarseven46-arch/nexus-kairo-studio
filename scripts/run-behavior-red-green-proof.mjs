import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifest = JSON.parse(
  await readFile(path.resolve(root, "config/behavior-regression-proof.json"), "utf8"),
);
const vitest = path.resolve(root, "node_modules/.bin/vitest");
if (!existsSync(vitest)) throw new Error("vitest executable missing; install dependencies first");

function runCase(cwd, testFile, testName) {
  return spawnSync(vitest, ["run", testFile, "-t", testName], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
}

function assertStatus(result, expectedPass, label) {
  const passed = result.status === 0;
  if (passed !== expectedPass) {
    console.error(`\n${label}: expected ${expectedPass ? "GREEN" : "RED"}, got ${passed ? "GREEN" : "RED"}`);
    console.error(result.stdout ?? "");
    console.error(result.stderr ?? "");
    process.exit(1);
  }
  console.log(`${expectedPass ? "GREEN" : "RED  "} ${label}`);
}

const tempRoot = mkdtempSync(path.join(os.tmpdir(), "kaira-red-green-"));
try {
  for (const cluster of manifest.clusters) {
    const allGreen = [cluster.reported, ...cluster.neighbors, ...cluster.counterexamples];
    for (const testName of allGreen) {
      assertStatus(
        runCase(root, cluster.testFile, testName),
        true,
        `${cluster.id} HEAD :: ${testName}`,
      );
    }

    const redDir = path.join(tempRoot, cluster.id);
    const add = spawnSync("git", ["worktree", "add", "--detach", redDir, cluster.redSha], {
      cwd: root,
      encoding: "utf8",
    });
    if (add.status !== 0) {
      console.error(add.stdout ?? "");
      console.error(add.stderr ?? "");
      throw new Error(`${cluster.id}: could not create red-SHA worktree`);
    }

    const redNodeModules = path.join(redDir, "node_modules");
    if (!existsSync(redNodeModules)) symlinkSync(path.join(root, "node_modules"), redNodeModules, "dir");
    const targetTest = path.join(redDir, cluster.testFile);
    mkdirSync(path.dirname(targetTest), { recursive: true });
    cpSync(path.join(root, cluster.testFile), targetTest);

    for (const testName of [cluster.reported, ...cluster.neighbors]) {
      assertStatus(
        runCase(redDir, cluster.testFile, testName),
        false,
        `${cluster.id} ${cluster.redSha.slice(0, 7)} :: ${testName}`,
      );
    }
    for (const testName of cluster.counterexamples) {
      assertStatus(
        runCase(redDir, cluster.testFile, testName),
        true,
        `${cluster.id} ${cluster.redSha.slice(0, 7)} counterexample :: ${testName}`,
      );
    }

    spawnSync("git", ["worktree", "remove", "--force", redDir], { cwd: root });
  }
} finally {
  for (const cluster of manifest.clusters) {
    const redDir = path.join(tempRoot, cluster.id);
    if (existsSync(redDir)) spawnSync("git", ["worktree", "remove", "--force", redDir], { cwd: root });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Behavior RED→GREEN proof complete: every reported case and both neighbors were RED on the recorded pre-fix SHA and GREEN on HEAD; counterexamples stayed GREEN.");
