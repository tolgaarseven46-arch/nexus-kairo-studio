import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/services/kdmPersistenceService.ts';
let source = readFileSync(path, 'utf8');
source = source.replace(
  `export interface KntTracePayload { userId?: string; userMessage: string; reply: string; reasoningTrace: ReasoningTrace; dynamicState: DroitDynamicState; timings: Record<string, number>; providerUsed?: string; speechIdentity?: unknown; worldStateAppraisal?: unknown; worldReasoningPolicy?: unknown; worldMemoryGuard?: unknown; responsePlan?: unknown; createdAt?: string; }`,
  `export interface KntTracePayload { userId?: string; userMessage: string; reply: string; reasoningTrace: ReasoningTrace; dynamicState: DroitDynamicState; timings: Record<string, number>; providerUsed?: string; controlledSpontaneity?: unknown; speechIdentity?: unknown; worldStateAppraisal?: unknown; worldReasoningPolicy?: unknown; worldMemoryGuard?: unknown; responsePlan?: unknown; createdAt?: string; }`,
);
source = source.replace(
  `    providerUsed?: string;\n    model?: string;\n    timings?: Record<string, number>;\n    speechIdentity?: unknown;`,
  `    providerUsed?: string;\n    model?: string;\n    timings?: Record<string, number>;\n    controlledSpontaneity?: unknown;\n    speechIdentity?: unknown;`,
);
if (!source.includes('controlledSpontaneity?: unknown')) throw new Error('controlled spontaneity metadata type was not inserted');
writeFileSync(path, source);
