import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { KairoProviderUsed } from './droitChatService';

const server = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

describe('request-local provider observability regression', () => {
  it('does not keep provider observability in module-global mutable state', () => {
    expect(server).not.toContain('let activeAiProviderUsed = "gemini";');
    expect(server).toContain('type GeneratedTextResult = {');
    expect(server).toContain('providerUsed: Exclude<AiProviderUsed, "deterministic_fallback">;');
    expect(server).toContain('return (await generateTextResult(system, messages, temperature, preferredProvider)).text;');
  });

  it('binds the final provider to the generation result inside the current chat request', () => {
    expect(server).toContain('let activeAiProviderUsed: AiProviderUsed = provider === "gemini" ? "gemini" : "openrouter";');
    expect(server).toContain('const generated = await generateTextResult(system, msgs, 0.78, provider);');
    expect(server).toContain('activeAiProviderUsed = generated.providerUsed;');
    expect(server).toContain('activeAiProviderUsed = "deterministic_fallback";');
  });

  it('changes provider observability for a repair only when that repair is accepted', () => {
    const betterRepair = server.indexOf('if (repairedIssues.length < groundingIssues.length) {');
    const repairProvider = server.indexOf('activeAiProviderUsed = repairedGeneration.providerUsed;', betterRepair);
    const repairBlockEnd = server.indexOf('\n        }', repairProvider);

    expect(betterRepair).toBeGreaterThan(0);
    expect(repairProvider).toBeGreaterThan(betterRepair);
    expect(repairBlockEnd).toBeGreaterThan(repairProvider);
  });

  it('exposes deterministic fallback as an explicit client provider state', () => {
    const provider: KairoProviderUsed = 'deterministic_fallback';
    expect(provider).toBe('deterministic_fallback');
  });
});
