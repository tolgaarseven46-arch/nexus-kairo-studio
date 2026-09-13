import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) out[arg.slice(2)] = true;
    else out[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return out;
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

async function getJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}: ${body?.error || 'request failed'}`);
  }
  return body;
}

const args = parseArgs(process.argv.slice(2));
const sessionId = String(args.session || '').trim();
if (!sessionId) {
  throw new Error('Usage: node scripts/capture-live-beta-session.mjs --session=<sessionId> [--tester=<alias>] [--state=fresh|hydrated|unknown] [--restarted] [--instance=<id>] [--base=http://localhost:3000] [--out=<file.json>]');
}

const baseUrl = String(args.base || 'http://localhost:3000').replace(/\/$/, '');
const testerAlias = String(args.tester || 'beta_tester');
const initialState = ['fresh', 'hydrated', 'unknown'].includes(String(args.state))
  ? String(args.state)
  : 'unknown';
const restartOccurred = Boolean(args.restarted);
const instanceId = args.instance ? String(args.instance) : 'unknown';

const [runtimeInfo, sessionPayload] = await Promise.all([
  getJson(`${baseUrl}/api/runtime-info`),
  getJson(`${baseUrl}/api/test-sessions/${encodeURIComponent(sessionId)}`),
]);

const session = sessionPayload?.session ?? sessionPayload;
const turns = Array.isArray(session?.turns) ? session.turns : [];
const providersSeen = Array.from(
  new Set(
    turns
      .map((turn) => turn?.metadata?.providerUsed)
      .filter((value) => typeof value === 'string' && value.trim()),
  ),
);

const evidence = {
  reportType: 'KAIRA_LIVE_BETA_SESSION_EVIDENCE_V1',
  capturedAt: new Date().toISOString(),
  sessionId,
  testerAlias,
  appCommitSha: gitHead(),
  runtime: {
    baseUrl,
    activeProvider: runtimeInfo?.activeProvider ?? 'unknown',
    model: runtimeInfo?.model ?? 'unknown',
    providersSeen,
    persistence: runtimeInfo?.persistence ?? 'unknown',
  },
  character: {
    characterId: session?.summary?.characterId ?? session?.session?.characterId ?? 'kairo',
    instanceId,
  },
  conversation: {
    userId: session?.summary?.userId ?? session?.session?.userId ?? 'unknown',
    startedAt: session?.summary?.createdAt ?? session?.session?.createdAt ?? 'unknown',
    endedAt: session?.summary?.updatedAt ?? session?.session?.updatedAt ?? new Date().toISOString(),
    initialState,
    restartOccurred,
    turnCount: session?.summary?.turnCount ?? session?.session?.turnCount ?? turns.length,
  },
  session,
};

const json = JSON.stringify(evidence, null, 2);
if (args.out) {
  await writeFile(String(args.out), `${json}\n`, 'utf8');
  console.log(`Live beta evidence written to ${args.out}`);
} else {
  console.log(json);
}
