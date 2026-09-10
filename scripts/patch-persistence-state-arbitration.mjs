import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const branch = "codex/persistence-state-arbitration";
const read = (path) => readFileSync(path, "utf8");
const write = (path, value) => writeFileSync(path, value, "utf8");

let server = read("server.ts");
const importAnchor = 'import { analyzeKdmInteractionCanonicalTurn } from "./src/services/kdmConsistencyEngine";\n';
const selectorImport = 'import { selectEffectiveKdmDynamicState } from "./src/services/kdmEffectiveStateSelector";\n';
if (!server.includes(selectorImport)) {
  if (!server.includes(importAnchor)) throw new Error("server import anchor missing");
  server = server.replace(importAnchor, importAnchor + selectorImport);
}
const oldSelection = `      requestState = normalizeDynamicState(dynamicState),\n      effective = dynamicState?.relationship\n        ? requestState\n        : normalizeDynamicState(persistedState ?? dynamicState),\n`;
const newSelection = `      requestState = normalizeDynamicState(dynamicState),\n      effective = selectEffectiveKdmDynamicState({\n        requestState,\n        persistedState: kairaPolicy.persistentRelationship ? persistedState : null,\n        requestHasRelationship: Boolean(dynamicState?.relationship),\n      }),\n`;
if (server.includes(oldSelection)) server = server.replace(oldSelection, newSelection);
else if (!server.includes(newSelection)) throw new Error("server effective-state anchor missing");
write("server.ts", server);

write("src/services/kdmEffectiveStateSelectionWiringContracts.test.ts", `import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "vitest";\n\ndescribe("KDM effective-state server wiring contract", () => {\n  it("routes request/persisted arbitration through the canonical selector", () => {\n    const server = readFileSync("server.ts", "utf8");\n    expect(server).toContain('import { selectEffectiveKdmDynamicState } from "./src/services/kdmEffectiveStateSelector";');\n    expect(server).toContain("effective = selectEffectiveKdmDynamicState({");\n    expect(server).toContain("persistedState: kairaPolicy.persistentRelationship ? persistedState : null");\n    expect(server).toContain("requestHasRelationship: Boolean(dynamicState?.relationship)");\n    expect(server).not.toContain("effective = dynamicState?.relationship");\n  });\n});\n`);

const manifestPath = "config/behavior-regression-proof.json";
const manifest = JSON.parse(read(manifestPath));
if (!manifest.clusters.some((cluster) => cluster.id === "persistent-relationship-state-arbitration")) {
  manifest.clusters.push({
    id: "persistent-relationship-state-arbitration",
    invariant: "A stale client relationship snapshot must not rewind a fresher persisted Kaira-user relationship state; timestamp is primary chronology, interaction count breaks timestamp ties, and a genuinely newer request remains authoritative.",
    redSha: "42ecf41a741b10de5fb02d820ff2b3f19d17f927",
    testFile: "src/services/kdmEffectiveStateSelectionNeighborProofRegression.test.ts",
    reported: "reported: newer persisted relationship defeats a stale request relationship",
    neighbors: [
      "neighbor-1: higher persisted interaction count wins when timestamps tie",
      "neighbor-2: valid durable chronology defeats an invalid stale request timestamp",
    ],
    counterexamples: [
      "counterexample: genuinely newer request relationship remains authoritative",
    ],
  });
}
write(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

const statePath = "PROJECT_STATE.md";
let state = read(statePath);
const marker = "## 11. Provider-free memory + relationship combined behavior — ACTIVE";
if (state.includes(marker)) state = state.slice(0, state.indexOf(marker));
const activeMarker = "## 12. Persistent relationship effective-state arbitration — ACTIVE";
if (!state.includes(activeMarker)) {
  state += `## 11. Provider-free memory + relationship combined behavior — MERGED\n- PR #203 merge: \`47d5f5012c00e50cca6572bb777b0ca3b5d3905d\`.\n- Same canonical semantic + same established relationship A/B proof memory var/yok canonical KDM turn sınırında geçti.\n- Typed autobiographical memory yalnız material affective projection'ı derinleştirir; relationship state'i yeniden yorumlamaz.\n\n## 12. Persistent relationship effective-state arbitration — ACTIVE\n- Branch: \`codex/persistence-state-arbitration\`.\n- Production failure class: stale request relationship, daha yeni persisted relationship snapshot'ını ezebiliyordu.\n- RED baseline: \`42ecf41a741b10de5fb02d820ff2b3f19d17f927\`.\n- Timestamp chronology primary; tie/missing chronology interaction count ile çözülür; exact tie persisted lehine fail-closed olur.\n- Genuinely newer request authoritative kalır.\n- \`server.ts\` canonical effective-state selector üzerinden arbitrate eder.\n\n## 13. Sıradaki doğrulanmış iş\n- Fix CI + Architecture Review ile doğrulanıp merge edilecek.\n- Post-merge main CI yeşil doğrulanacak.\n- Sonra açık issue/main/runtime evidence yeniden ölçülecek.\n\n## 14. Latest checkpoint\n- Date: 2026-09-10\n- Base main: \`47d5f5012c00e50cca6572bb777b0ca3b5d3905d\`.\n- Active branch: \`codex/persistence-state-arbitration\`.\n- Active target: stale request vs fresher persisted relationship arbitration.\n- External AI API in deterministic tests: NO.\n- New downstream semantic authority: NO.\n- Semantic LLM removal: NO.\n`;
  write(statePath, state);
}

const changed = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
if (!changed) process.exit(0);
execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
execFileSync("git", ["add", "server.ts", "src/services/kdmEffectiveStateSelectionWiringContracts.test.ts", manifestPath, statePath]);
execFileSync("git", ["commit", "-m", "fix(persistence): wire effective-state arbitration"], { stdio: "inherit" });
execFileSync("git", ["push", "origin", `HEAD:${branch}`], { stdio: "inherit" });
