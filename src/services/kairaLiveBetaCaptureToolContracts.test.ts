import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(
  new URL('../../scripts/capture-live-beta-session.mjs', import.meta.url),
);

describe('live beta evidence capture tool contracts', () => {
  it('fails closed when session identity is missing', () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}\n${result.stdout}`).toContain(
      'Usage: node scripts/capture-live-beta-session.mjs --session=<sessionId>',
    );
  });
});
