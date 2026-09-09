import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const artifactDir = 'artifacts/fast-ci';
mkdirSync(artifactDir, { recursive: true });

const tests = [
  'src/services/kairaArchitectureContracts.test.ts',
  'src/services/kairaSemanticConsumerAuthorityContracts.test.ts',
  'src/services/kairaSemanticInterpretationV2AuthorityContracts.test.ts',
  'src/services/kairaKdmCanonicalSemanticAuthorityContracts.test.ts',
  'src/services/socialAppraisalContextModulation.test.ts',
  'src/services/kairaTypedRepairSignalContracts.test.ts',
  'src/services/kairaConversationStateLockContracts.test.ts',
  'src/services/kairaBehaviorPolicyBoundaryContracts.test.ts',
  'src/services/kairaResponsePlanFinalAuthorityContracts.test.ts',
];

function run(label, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env,
    ...options,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const combined = `${stdout}${stderr}`;
  writeFileSync(`${artifactDir}/${label}.log`, combined, 'utf8');
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return {
    label,
    command: [command, ...args].join(' '),
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    log: `${artifactDir}/${label}.log`,
  };
}

const vitest = run('vitest', 'npx', [
  'vitest',
  'run',
  ...tests,
  '--reporter=default',
  '--reporter=json',
  `--outputFile=${artifactDir}/vitest.json`,
]);

let typescript = {
  label: 'typescript',
  command: 'npm run lint',
  exitCode: 0,
  durationMs: 0,
  log: `${artifactDir}/typescript.log`,
};

if (vitest.exitCode === 0) {
  typescript = run('typescript', 'npm', ['run', 'lint']);
} else {
  writeFileSync(typescript.log, 'Skipped because fast Vitest failed.\n', 'utf8');
}

const summary = {
  schemaVersion: 1,
  lane: 'fast',
  providerCalls: false,
  generatedAt: new Date().toISOString(),
  tests,
  phases: [vitest, typescript],
  passed: vitest.exitCode === 0 && typescript.exitCode === 0,
};

writeFileSync(`${artifactDir}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`\nFAST_CI_SUMMARY ${JSON.stringify({ passed: summary.passed, artifactDir })}`);
process.exit(summary.passed ? 0 : 1);
