const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceRequired(source, needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`Missing ${label}: ${needle.slice(0, 180)}`);
  return source.replace(needle, replacement);
}

// 1) Deterministic world-response enforcement consumes the exact canonical
// appraisal/policy already derived by runtime. It must not independently
// rebuild reasoning authority from retrieved rows.
const guardPath = 'src/services/worldModelResponseGuard.ts';
let guard = read(guardPath);
guard = replaceRequired(
  guard,
  'import { appraiseRetrievedWorldState } from "./worldStateAppraisal";\nimport { deriveWorldReasoningPolicy } from "./worldReasoningPolicy";',
  'import type { WorldStateAppraisal } from "./worldStateAppraisal";\nimport type { WorldReasoningPolicy } from "./worldReasoningPolicy";',
  'guard reasoning imports',
);
guard = replaceRequired(
  guard,
  'export interface WorldModelResponseGuardResult {\n  reply: string;\n  changed: boolean;\n  issues: WorldModelResponseIssue[];\n  reason?: string;\n}\n',
  'export interface WorldModelResponseGuardResult {\n  reply: string;\n  changed: boolean;\n  issues: WorldModelResponseIssue[];\n  reason?: string;\n}\n\nexport interface WorldModelReasoningContext {\n  appraisal: WorldStateAppraisal;\n  policy: WorldReasoningPolicy;\n}\n',
  'WorldModelReasoningContext insertion',
);
guard = replaceRequired(
  guard,
  ' * The guard derives the same read-only WorldReasoningPolicy used by prompt\n * generation, so model compliance is not trusted as the only enforcement\n * mechanism. It never mutates relationship, emotion, personality or dynamic\n * state; it may only reject/replace the generated world-memory wording.',
  ' * The guard consumes the exact read-only appraisal/policy already derived by\n * the canonical runtime, so prompt generation and deterministic enforcement\n * share one reasoning authority. It never mutates relationship, emotion,\n * personality or dynamic state; it may only reject/replace generated\n * world-memory wording.',
  'guard authority comment',
);
guard = replaceRequired(
  guard,
  'export function findWorldModelResponseIssues(\n  reply: string,\n  items: RetrievedWorldEvent[],\n): WorldModelResponseIssue[] {\n  const appraisal = appraiseRetrievedWorldState(items);\n  const policy = deriveWorldReasoningPolicy(appraisal);',
  'export function findWorldModelResponseIssues(\n  reply: string,\n  items: RetrievedWorldEvent[],\n  context: WorldModelReasoningContext,\n): WorldModelResponseIssue[] {\n  const { appraisal, policy } = context;',
  'guard issue signature',
);
guard = replaceRequired(
  guard,
  'export function buildWorldModelRecallFallback(items: RetrievedWorldEvent[]): string {\n  const evidence = grounded(items);\n  if (!evidence.length) return "";\n\n  const appraisal = appraiseRetrievedWorldState(items);\n  const policy = deriveWorldReasoningPolicy(appraisal);',
  'export function buildWorldModelRecallFallback(\n  items: RetrievedWorldEvent[],\n  context: WorldModelReasoningContext,\n): string {\n  const evidence = grounded(items);\n  if (!evidence.length) return "";\n\n  const { policy } = context;',
  'fallback signature',
);
guard = replaceRequired(
  guard,
  'export function enforceWorldModelRecallResponse(\n  reply: string,\n  items: RetrievedWorldEvent[],\n): WorldModelResponseGuardResult {\n  const issues = findWorldModelResponseIssues(reply, items);',
  'export function enforceWorldModelRecallResponse(\n  reply: string,\n  items: RetrievedWorldEvent[],\n  context: WorldModelReasoningContext,\n): WorldModelResponseGuardResult {\n  const issues = findWorldModelResponseIssues(reply, items, context);',
  'enforcement signature',
);
guard = replaceRequired(
  guard,
  '  const fallback = buildWorldModelRecallFallback(items);',
  '  const fallback = buildWorldModelRecallFallback(items, context);',
  'fallback context use',
);
write(guardPath, guard);

// 2) Runtime owns one context object and passes it through every response seam.
const serverPath = 'server.ts';
let server = read(serverPath);
const policyPattern = /(^\s*)const worldReasoningPolicy = deriveWorldReasoningPolicy\(worldStateAppraisal\);\n/m;
if (!policyPattern.test(server)) throw new Error('Canonical worldReasoningPolicy declaration not found in server.ts');
server = server.replace(
  policyPattern,
  (_, indent) => `${indent}const worldReasoningPolicy = deriveWorldReasoningPolicy(worldStateAppraisal);\n${indent}const worldReasoningContext = { appraisal: worldStateAppraisal, policy: worldReasoningPolicy };\n`,
);

const findBefore = (server.match(/findWorldModelResponseIssues\(/g) || []).length;
const enforceBefore = (server.match(/enforceWorldModelRecallResponse\(/g) || []).length;
if (findBefore < 4) throw new Error(`Expected >=4 world issue seams, found ${findBefore}`);
if (enforceBefore < 2) throw new Error(`Expected >=2 world enforcement seams, found ${enforceBefore}`);

server = server.replace(
  /findWorldModelResponseIssues\(([\s\S]*?),\s*retrievedWorldEvents\)/g,
  'findWorldModelResponseIssues($1, retrievedWorldEvents, worldReasoningContext)',
);
server = server.replace(
  /enforceWorldModelRecallResponse\(([\s\S]*?),\s*retrievedWorldEvents\)/g,
  'enforceWorldModelRecallResponse($1, retrievedWorldEvents, worldReasoningContext)',
);

const findWithContext = (server.match(/findWorldModelResponseIssues\([\s\S]*?retrievedWorldEvents, worldReasoningContext\)/g) || []).length;
const enforceWithContext = (server.match(/enforceWorldModelRecallResponse\([\s\S]*?retrievedWorldEvents, worldReasoningContext\)/g) || []).length;
if (findWithContext < findBefore) throw new Error(`Not all world issue seams received canonical context (${findWithContext}/${findBefore})`);
if (enforceWithContext < enforceBefore) throw new Error(`Not all world enforcement seams received canonical context (${enforceWithContext}/${enforceBefore})`);
write(serverPath, server);

// 3) Direct guard contracts derive context explicitly at the test boundary.
const contractsPath = 'src/services/kairaWorldModelResponseGuardContracts.test.ts';
let contracts = read(contractsPath);
contracts = replaceRequired(
  contracts,
  'import { rankWorldEventObservations } from "./worldEventRetrieval";\n',
  'import { rankWorldEventObservations } from "./worldEventRetrieval";\nimport { appraiseRetrievedWorldState } from "./worldStateAppraisal";\nimport { deriveWorldReasoningPolicy } from "./worldReasoningPolicy";\n',
  'guard contract context imports',
);
const describeNeedle = 'describe("world-model response guard contracts", () => {';
contracts = replaceRequired(
  contracts,
  describeNeedle,
  'function reasoningContext(items: ReturnType<typeof rankWorldEventObservations>) {\n  const appraisal = appraiseRetrievedWorldState(items);\n  return { appraisal, policy: deriveWorldReasoningPolicy(appraisal) };\n}\n\n' + describeNeedle,
  'guard contract context helper',
);
contracts = contracts.replace(
  /findWorldModelResponseIssues\(([\s\S]*?),\s*retrieved\)/g,
  'findWorldModelResponseIssues($1, retrieved, reasoningContext(retrieved))',
);
contracts = contracts.replace(
  /enforceWorldModelRecallResponse\(([\s\S]*?),\s*retrieved\)/g,
  'enforceWorldModelRecallResponse($1, retrieved, reasoningContext(retrieved))',
);
if (/findWorldModelResponseIssues\([\s\S]*?,\s*retrieved\)/.test(contracts)) throw new Error('Unmigrated direct findWorldModelResponseIssues call remains');
if (/enforceWorldModelRecallResponse\([\s\S]*?,\s*retrieved\)/.test(contracts)) throw new Error('Unmigrated direct enforceWorldModelRecallResponse call remains');
write(contractsPath, contracts);

// 4) Integration contract locks the single-authority invariant and new seams.
const integrationPath = 'src/services/kairaWorldModelResponseGuardIntegrationContracts.test.ts';
let integration = read(integrationPath);
integration = replaceRequired(
  integration,
  'const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");',
  'const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");\nconst guard = fs.readFileSync(path.resolve(process.cwd(), "src/services/worldModelResponseGuard.ts"), "utf8");',
  'integration guard source',
);
integration = integration.replace(
  'findWorldModelResponseIssues(repairedReply, retrievedWorldEvents)',
  'findWorldModelResponseIssues(repairedReply, retrievedWorldEvents, worldReasoningContext)',
);
integration = integration.replace(
  'findWorldModelResponseIssues(fallback, retrievedWorldEvents)',
  'findWorldModelResponseIssues(fallback, retrievedWorldEvents, worldReasoningContext)',
);
integration = integration.replace(
  'const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents)',
  'const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext)',
);
integration = integration.replace(
  'enforceWorldModelRecallResponse(reply, retrievedWorldEvents)',
  'enforceWorldModelRecallResponse(reply, retrievedWorldEvents, worldReasoningContext)',
);
const persistNeedle = '  it("persists world reasoning observability fields", () => {';
integration = replaceRequired(
  integration,
  persistNeedle,
  '  it("shares one canonical appraisal/policy authority with deterministic enforcement", () => {\n    expect(server).toContain("const worldReasoningContext = { appraisal: worldStateAppraisal, policy: worldReasoningPolicy }");\n    expect(server).toContain("findWorldModelResponseIssues(repairedReply, retrievedWorldEvents, worldReasoningContext)");\n    expect(server).toContain("enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext)");\n    expect(guard).toContain("context: WorldModelReasoningContext");\n    expect(guard).not.toContain("appraiseRetrievedWorldState(");\n    expect(guard).not.toContain("deriveWorldReasoningPolicy(");\n  });\n\n' + persistNeedle,
  'single authority integration contract',
);
write(integrationPath, integration);

// 5) Runtime policy integration explicitly locks final enforcement consumption.
const policyIntegrationPath = 'src/services/kairaWorldReasoningPolicyIntegrationContracts.test.ts';
let policyIntegration = read(policyIntegrationPath);
const mutationNeedle = '  it("does not feed world reasoning policy into KDM state mutation", () => {';
policyIntegration = replaceRequired(
  policyIntegration,
  mutationNeedle,
  '  it("passes the canonical reasoning policy to deterministic final enforcement", () => {\n    expect(server).toContain("const worldReasoningContext = { appraisal: worldStateAppraisal, policy: worldReasoningPolicy }");\n    expect(server).toContain("retrievedWorldEvents, worldReasoningContext");\n  });\n\n' + mutationNeedle,
  'policy final enforcement contract',
);
write(policyIntegrationPath, policyIntegration);
