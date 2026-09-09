import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const artifactDir = 'artifacts/fast-ci';
mkdirSync(artifactDir, { recursive: true });

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', env: process.env });
  return result.status === 0 ? String(result.stdout ?? '') : '';
}

const changedPaths = capture('git', ['diff', '--name-only', 'origin/main...HEAD'])
  .split(/\r?\n/u)
  .map((item) => item.trim())
  .filter(Boolean);

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

const naturalV2Touched = changedPaths.some((path) =>
  path === 'config/kairaNaturalCharacterizationV2Scenarios.json' ||
  path === 'src/services/kairaNaturalCharacterizationV2.ts' ||
  path === 'src/services/kairaNaturalCharacterizationV2.characterization.test.ts' ||
  path === 'src/services/kairaPreAiPhase0Harness.ts' ||
  path === 'scripts/run-natural-characterization-v2.ts'
);

if (naturalV2Touched) {
  tests.push('src/services/kairaNaturalCharacterizationV2.characterization.test.ts');
}

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

let characterization = {
  label: 'natural-characterization-v2',
  command: 'not-selected',
  exitCode: 0,
  durationMs: 0,
  log: `${artifactDir}/natural-characterization-v2.log`,
};

if (vitest.exitCode === 0 && naturalV2Touched) {
  characterization = run('natural-characterization-v2', 'npx', [
    'tsx',
    'scripts/run-natural-characterization-v2.ts',
    `${artifactDir}/natural-characterization-v2-report.json`,
  ]);
} else {
  writeFileSync(
    characterization.log,
    naturalV2Touched
      ? 'Skipped because fast Vitest failed.\n'
      : 'Skipped because Natural Characterization v2 files were not touched.\n',
    'utf8',
  );
}

let typescript = {
  label: 'typescript',
  command: 'npm run lint',
  exitCode: 0,
  durationMs: 0,
  log: `${artifactDir}/typescript.log`,
};

if (vitest.exitCode === 0 && characterization.exitCode === 0) {
  typescript = run('typescript', 'npm', ['run', 'lint']);
} else {
  writeFileSync(typescript.log, 'Skipped because an earlier fast phase failed.\n', 'utf8');
}

const phases = [vitest, characterization, typescript];
const summary = {
  schemaVersion: 3,
  lane: 'fast',
  providerCalls: false,
  generatedAt: new Date().toISOString(),
  changedPaths,
  tests,
  naturalV2Touched,
  phases,
  passed: phases.every((phase) => phase.exitCode === 0),
};

writeFileSync(`${artifactDir}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`\nFAST_CI_SUMMARY ${JSON.stringify({ passed: summary.passed, artifactDir, tests: tests.length, naturalV2Touched })}`);
process.exit(summary.passed ? 0 : 1);
