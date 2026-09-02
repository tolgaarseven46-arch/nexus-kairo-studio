import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const manifestUrl = new URL('../config/beta-conversation-acceptance.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

if (!Array.isArray(manifest.tests) || manifest.tests.length === 0) {
  throw new Error('beta conversation acceptance manifest has no tests');
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', ...manifest.tests],
  { stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
