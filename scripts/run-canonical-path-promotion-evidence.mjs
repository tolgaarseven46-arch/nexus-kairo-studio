import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const betaManifestUrl = new URL('../config/beta-conversation-acceptance.json', import.meta.url);
const promotionManifestUrl = new URL('../config/canonical-path-promotion-evidence.json', import.meta.url);

const betaManifest = JSON.parse(await readFile(betaManifestUrl, 'utf8'));
const promotionManifest = JSON.parse(await readFile(promotionManifestUrl, 'utf8'));

const canonicalFlags = [
  'SEMANTIC_SCHEMA_V2',
  'RELATIONSHIP_REDUCER_V2',
  'PLAN_RESOLVER_V2',
  'CANONICAL_PROMPT_BUILDER',
  'UNIFIED_GUARD_PASS',
];

function requireTestList(name, value) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`${name} must be a non-empty string array`);
  }
  return value;
}

const betaTests = requireTestList('beta acceptance tests', betaManifest.tests);
const recordedSessionTests = requireTestList('recorded session tests', promotionManifest.recordedSessionTests);
const rollbackTests = requireTestList('rollback tests', promotionManifest.rollbackTests);
const diffReviewTests = requireTestList('shared-corpus diff review tests', promotionManifest.diffReviewTests);

function envFor(enabled) {
  const env = { ...process.env };
  for (const flag of canonicalFlags) env[flag] = enabled ? '1' : '0';
  return env;
}

function runVitest(label, tests, enabled) {
  console.log(`\n=== ${label} ===`);
  console.log(`canonical flags at process start: ${enabled ? 'ON' : 'OFF'}`);
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vitest', 'run', ...tests],
    { stdio: 'inherit', env: envFor(enabled) },
  );
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

runVitest('Promotion evidence 1/4: beta acceptance on canonical path', betaTests, true);
runVitest('Promotion evidence 2/4: recorded-session replay on canonical path', recordedSessionTests, true);
runVitest('Promotion evidence 3/4: rollback drill on legacy path', rollbackTests, false);
// This test toggles all five flags internally for the exact same inputs and
// contains only classified/justified differences. Starting OFF keeps the test
// isolated from an inherited CI environment.
runVitest('Promotion evidence 4/4: canonical-vs-legacy shared-corpus diff review', diffReviewTests, false);

console.log('\nCANONICAL_PATH_PROMOTION_GATE automated + encoded review evidence is green.');
console.log('Any future unclassified shared-corpus behavior delta must fail the permanent diff regression.');
