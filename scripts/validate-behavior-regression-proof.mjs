import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.resolve(root, "config/behavior-regression-proof.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.version !== 1 || !Array.isArray(manifest.clusters) || manifest.clusters.length === 0) {
  throw new Error("behavior regression proof manifest is missing clusters");
}

const ids = new Set();
for (const cluster of manifest.clusters) {
  if (!cluster?.id || typeof cluster.id !== "string") throw new Error("cluster id is required");
  if (ids.has(cluster.id)) throw new Error(`duplicate cluster id: ${cluster.id}`);
  ids.add(cluster.id);

  if (!cluster.invariant || typeof cluster.invariant !== "string") {
    throw new Error(`${cluster.id}: invariant is required`);
  }
  if (!/^[0-9a-f]{40}$/i.test(String(cluster.redSha ?? ""))) {
    throw new Error(`${cluster.id}: redSha must be an exact 40-char commit SHA`);
  }
  if (!cluster.testFile || !String(cluster.testFile).endsWith(".test.ts")) {
    throw new Error(`${cluster.id}: testFile must be a .test.ts file`);
  }
  if (!cluster.reported || typeof cluster.reported !== "string") {
    throw new Error(`${cluster.id}: one reported case is required`);
  }
  if (!Array.isArray(cluster.neighbors) || cluster.neighbors.length < 2) {
    throw new Error(`${cluster.id}: at least two same-class neighbor failures are required`);
  }
  if (!Array.isArray(cluster.counterexamples) || cluster.counterexamples.length < 1) {
    throw new Error(`${cluster.id}: at least one counterexample guard is required`);
  }

  const source = await readFile(path.resolve(root, cluster.testFile), "utf8");
  for (const name of [cluster.reported, ...cluster.neighbors, ...cluster.counterexamples]) {
    if (!source.includes(name)) {
      throw new Error(`${cluster.id}: test file does not contain declared case: ${name}`);
    }
  }
}

console.log(
  `Behavior regression proof manifest OK: ${manifest.clusters.length} clusters; each has 1 reported + >=2 neighbor failures + >=1 counterexample.`,
);
