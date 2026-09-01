const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceRequired(source, needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`Missing ${label}: ${needle.slice(0, 180)}`);
  return source.replace(needle, replacement);
}

const guardPath = 'src/services/worldModelResponseGuard.ts';
let guard = read(guardPath);
guard = replaceRequired(guard, 'import { appraiseRetrievedWorldState } from "./worldStateAppraisal";\nimport { deriveWorldReasoningPolicy } from "./worldReasoningPolicy";', 'import type { WorldStateAppraisal } from "./worldStateAppraisal";\nimport type { WorldReasoningPolicy } from "./worldReasoningPolicy";', 'guard reasoning imports');
guard = replaceRequired(guard, 'export interface WorldModelResponseGuardResult {\n  reply: string;\n  changed: boolean;\n  issues: WorldModelResponseIssue[];\n  reason?: string;\n}\n', 'export interface WorldModelResponseGuardResult {\n  reply: string;\n  changed: boolean;\n  issues: WorldModelResponseIssue[];\n  reason?: string;\n}\n\nexport interface WorldModelReasoningContext {\n  appraisal: WorldStateAppraisal;\n  policy: WorldReasoningPolicy;\n}\n', 'WorldModelReasoningContext insertion');
guard = replaceRequired(guard, ' * The guard derives the same read-only WorldReasoningPolicy used by prompt\n * generation, so model compliance is not trusted as the only enforcement\n * mechanism. It never mutates relationship, emotion, personality or dynamic\n * state; it may only reject/replace the generated world-memory wording.', ' * The guard consumes the exact read-only appraisal/policy already derived by\n * the canonical runtime, so prompt generation and deterministic enforcement\n * share one reasoning authority. It never mutates relationship, emotion,\n * personality or dynamic state; it may only reject/replace generated\n * world-memory wording.', 'guard authority comment');
guard = replaceRequired(guard, 'export function findWorldModelResponseIssues(\n  reply: string,\n  items: RetrievedWorldEvent[],\n): WorldModelResponseIssue[] {\n  const appraisal = appraiseRetrievedWorldState(items);\n  const policy = deriveWorldReasoningPolicy(appraisal);', 'export function findWorldModelResponseIssues(\n  reply: string,\n  items: RetrievedWorldEvent[],\n  context: WorldModelReasoningContext,\n): WorldModelResponseIssue[] {\n  const { appraisal, policy } = context;', 'guard issue signature');
guard = replaceRequired(guard, 'export function buildWorldModelRecallFallback(items: RetrievedWorldEvent[]): string {\n  const evidence = grounded(items);\n  if (!evidence.length) return "";\n\n  const appraisal = appraiseRetrievedWorldState(items);\n  const policy = deriveWorldReasoningPolicy(appraisal);', 'export function buildWorldModelRecallFallback(\n  items: RetrievedWorldEvent[],\n  context: WorldModelReasoningContext,\n): string {\n  const evidence = grounded(items);\n  if (!evidence.length) return "";\n\n  const { policy } = context;', 'fallback signature');
guard = replaceRequired(guard, 'export function enforceWorldModelRecallResponse(\n  reply: string,\n  items: RetrievedWorldEvent[],\n): WorldModelResponseGuardResult {\n  const issues = findWorldModelResponseIssues(reply, items);', 'export function enforceWorldModelRecallResponse(\n  reply: string,\n  items: RetrievedWorldEvent[],\n  context: WorldModelReasoningContext,\n): WorldModelResponseGuardResult {\n  const issues = findWorldModelResponseIssues(reply, items, context);', 'enforcement signature');
guard = replaceRequired(guard, '  const fallback = buildWorldModelRecallFallback(items);', '  const fallback = buildWorldModelRecallFallback(items, context);', 'fallback context use');
write(guardPath, guard);

const serverPath = 'server.ts';
let server = read(serverPath);
const policyPattern = /(^\s*)const worldReasoningPolicy = deriveWorldReasoningPolicy\(worldStateAppraisal\);\n/m;
if (!policyPattern.test(server)) throw new Error('Canonical worldReasoningPolicy declaration not found in server.ts');
server = server.replace(policyPattern, (_, indent) => `${indent}const worldReasoningPolicy = deriveWorldReasoningPolicy(worldStateAppraisal);\n${indent}const worldReasoningContext = { appraisal: worldStateAppraisal, policy: worldReasoningPolicy };\n`);
const findBefore = (server.match(/findWorldModelResponseIssues\(/g) || []).length;
const enforceBefore = (server.match(/enforceWorldModelRecallResponse\(/g) || []).length;
if (findBefore < 4) throw new Error(`Expected >=4 world issue seams, found ${findBefore}`);
if (enforceBefore < 2) throw new Error(`Expected >=2 world enforcement seams, found ${enforceBefore}`);
server = server.replace(/findWorldModelResponseIssues\(([\s\S]*?),\s*retrievedWorldEvents\)/g, 'findWorldModelResponseIssues($1, retrievedWorldEvents, worldReasoningContext)');
server = server.replace(/enforceWorldModelRecallResponse\(([\s\S]*?),\s*retrievedWorldEvents\)/g, 'enforceWorldModelRecallResponse($1, retrievedWorldEvents, worldReasoningContext)');
write(serverPath, server);

const contractsPath = 'src/services/kairaWorldModelResponseGuardContracts.test.ts';
let contracts = read(contractsPath);
contracts = replaceRequired(contracts, 'import { rankWorldEventObservations } from "./worldEventRetrieval";\n', 'import { rankWorldEventObservations } from "./worldEventRetrieval";\nimport { appraiseRetrievedWorldState } from "./worldStateAppraisal";\nimport { deriveWorldReasoningPolicy } from "./worldReasoningPolicy";\n', 'guard contract context imports');
contracts = replaceRequired(contracts, 'describe("world-model response guard contracts", () => {', 'function reasoningContext(items: ReturnType<typeof rankWorldEventObservations>) {\n  const appraisal = appraiseRetrievedWorldState(items);\n  return { appraisal, policy: deriveWorldReasoningPolicy(appraisal) };\n}\n\ndescribe("world-model response guard contracts", () => {', 'guard contract context helper');
contracts = contracts.replace(/findWorldModelResponseIssues\(([\s\S]*?),\s*retrieved\)/g, 'findWorldModelResponseIssues($1, retrieved, reasoningContext(retrieved))');
contracts = contracts.replace(/enforceWorldModelRecallResponse\(([\s\S]*?),\s*retrieved\)/g, 'enforceWorldModelRecallResponse($1, retrieved, reasoningContext(retrieved))');
write(contractsPath, contracts);

const integrationPath = 'src/services/kairaWorldModelResponseGuardIntegrationContracts.test.ts';
let integration = read(integrationPath);
integration = replaceRequired(integration, 'const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");', 'const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");\nconst guard = fs.readFileSync(path.resolve(process.cwd(), "src/services/worldModelResponseGuard.ts"), "utf8");', 'integration guard source');
integration = integration.replace('findWorldModelResponseIssues(repairedReply, retrievedWorldEvents)', 'findWorldModelResponseIssues(repairedReply, retrievedWorldEvents, worldReasoningContext)');
integration = integration.replace('findWorldModelResponseIssues(fallback, retrievedWorldEvents)', 'findWorldModelResponseIssues(fallback, retrievedWorldEvents, worldReasoningContext)');
integration = integration.replace('const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents)', 'const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext)');
integration = integration.replace('enforceWorldModelRecallResponse(reply, retrievedWorldEvents)', 'enforceWorldModelRecallResponse(reply, retrievedWorldEvents, worldReasoningContext)');
integration = replaceRequired(integration, '  it("persists world reasoning observability fields", () => {', '  it("shares one canonical appraisal/policy authority with deterministic enforcement", () => {\n    expect(server).toContain("const worldReasoningContext = { appraisal: worldStateAppraisal, policy: worldReasoningPolicy }");\n    expect(server).toContain("findWorldModelResponseIssues(repairedReply, retrievedWorldEvents, worldReasoningContext)");\n    expect(server).toContain("enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext)");\n    expect(guard).toContain("context: WorldModelReasoningContext");\n    expect(guard).not.toContain("appraiseRetrievedWorldState(");\n    expect(guard).not.toContain("deriveWorldReasoningPolicy(");\n  });\n\n  it("persists world reasoning observability fields", () => {', 'single authority integration contract');
write(integrationPath, integration);

const policyIntegrationPath = 'src/services/kairaWorldReasoningPolicyIntegrationContracts.test.ts';
let policyIntegration = read(policyIntegrationPath);
policyIntegration = replaceRequired(policyIntegration, '  it("does not feed world reasoning policy into KDM state mutation", () => {', '  it("passes the canonical reasoning policy to deterministic final enforcement", () => {\n    expect(server).toContain("const worldReasoningContext = { appraisal: worldStateAppraisal, policy: worldReasoningPolicy }");\n    expect(server).toContain("retrievedWorldEvents, worldReasoningContext");\n  });\n\n  it("does not feed world reasoning policy into KDM state mutation", () => {', 'policy final enforcement contract');
write(policyIntegrationPath, policyIntegration);

const epistemicRuntimePath = 'src/services/kairaEpistemicRuntimeContracts.test.ts';
let epistemicRuntime = read(epistemicRuntimePath);
epistemicRuntime = replaceRequired(epistemicRuntime, 'const candidateWorld = server.indexOf("const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents)");', 'const candidateWorld = server.indexOf("const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents, worldReasoningContext)");', 'epistemic final authority world seam');
write(epistemicRuntimePath, epistemicRuntime);

const finalDeliveryPath = 'src/services/kairaFinalDeliveryAuthorityRegression.test.ts';
let finalDelivery = read(finalDeliveryPath);
finalDelivery = replaceRequired(finalDelivery, "import { rankWorldEventObservations } from './worldEventRetrieval';\n", "import { rankWorldEventObservations } from './worldEventRetrieval';\nimport { appraiseRetrievedWorldState } from './worldStateAppraisal';\nimport { deriveWorldReasoningPolicy } from './worldReasoningPolicy';\n", 'final delivery reasoning imports');
finalDelivery = replaceRequired(finalDelivery, '    const guarded = enforceWorldModelRecallResponse(result.enforced.reply, retrieved);', '    const appraisal = appraiseRetrievedWorldState(retrieved);\n    const guarded = enforceWorldModelRecallResponse(result.enforced.reply, retrieved, { appraisal, policy: deriveWorldReasoningPolicy(appraisal) });', 'final delivery direct guard context');
write(finalDeliveryPath, finalDelivery);

const mixedPath = 'src/services/kairaMixedConversationQualityRegression.test.ts';
let mixed = read(mixedPath);
mixed = replaceRequired(mixed, "        recallGuards.push(enforceWorldModelRecallResponse('Mert yarın istifa edecek.', retrieved));", "        recallGuards.push(enforceWorldModelRecallResponse('Mert yarın istifa edecek.', retrieved, { appraisal, policy }));", 'mixed quality direct guard context');
write(mixedPath, mixed);

const twentyPath = 'src/services/kairaTwentyTurnEndToEndContracts.test.ts';
let twenty = read(twentyPath);
const oldTwentyCall = '    const guard = enforceWorldModelRecallResponse("Ali yarın istifa edecek.", retrieved);';
const newTwentyCall = '    const guard = enforceWorldModelRecallResponse("Ali yarın istifa edecek.", retrieved, { appraisal, policy });';
if (!twenty.includes(oldTwentyCall)) throw new Error('No legacy twenty-turn guard calls found');
twenty = twenty.split(oldTwentyCall).join(newTwentyCall);
if (twenty.includes(oldTwentyCall)) throw new Error('Legacy twenty-turn guard call remains after migration');
write(twentyPath, twenty);

const parityPath = 'src/services/kairaLocalAiParityContracts.test.ts';
let parity = read(parityPath);
parity = replaceRequired(parity, '"const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents)"', '"const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext)"', 'local parity world guard literal');
parity = replaceRequired(parity, '"const worldMemoryGuard = enforceWorldModelRecallResponse(reply, retrievedWorldEvents)"', '"const worldMemoryGuard = enforceWorldModelRecallResponse(reply, retrievedWorldEvents, worldReasoningContext)"', 'AI parity world guard literal');
write(parityPath, parity);
