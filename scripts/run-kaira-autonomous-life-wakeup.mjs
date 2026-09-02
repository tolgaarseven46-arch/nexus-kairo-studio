const required = (name) => {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) return fallback;
  return parsed;
};

const baseUrl = new URL(required("KAIRA_AUTONOMOUS_LIFE_URL"));
if (baseUrl.protocol !== "https:") throw new Error("KAIRA_AUTONOMOUS_LIFE_URL must use https");
const secret = required("KAIRA_INTERNAL_WORKER_SECRET");
const runId = required("KAIRA_AUTONOMOUS_LIFE_RUN_ID");
if (!/^[A-Za-z0-9._:-]{1,160}$/.test(runId)) throw new Error("Invalid autonomous life run id");
const limit = positiveInteger(process.env.KAIRA_AUTONOMOUS_LIFE_LIMIT, 25);

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${secret}`,
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Kaira worker returned non-JSON HTTP ${response.status}`);
    }
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

const invoke = () => request("/internal/workers/kaira/autonomous-life", {
  method: "POST",
  headers: { "x-kaira-worker-run-id": runId },
  body: JSON.stringify({ limit }),
});

const first = await invoke();
if (first.body?.runId !== runId) throw new Error("Autonomous life worker run correlation mismatch");
if (![200, 202].includes(first.response.status)) {
  const summary = first.body?.receipt?.summary;
  console.error(JSON.stringify({
    ok: false,
    runId,
    httpStatus: first.response.status,
    outcome: first.body?.error || first.body?.status || "unknown",
    stages: summary ? {
      planning: summary.planning,
      recovery: summary.recovery,
      schedules: summary.schedules,
    } : undefined,
  }));
  throw new Error(`Autonomous life worker failed: HTTP ${first.response.status} ${first.body?.error || first.body?.status || "unknown"}`);
}
if (!["completed", "degraded", "busy"].includes(first.body?.status)) {
  throw new Error(`Unexpected autonomous life worker status: ${first.body?.status || "missing"}`);
}

let replay = null;
if (first.body.status !== "busy") {
  replay = await invoke();
  if (replay.response.status !== 200 || replay.body?.runId !== runId || replay.body?.deliveryStatus !== "replayed") {
    throw new Error("Autonomous life Firestore receipt replay verification failed");
  }
  if (replay.body?.status !== first.body?.status) {
    throw new Error("Autonomous life replay outcome drifted");
  }
}

const health = await request("/internal/workers/kaira/autonomous-life/health");
if (health.response.status !== 200 || !["healthy", "degraded"].includes(health.body?.health?.status)) {
  throw new Error(`Autonomous life health verification failed: HTTP ${health.response.status} ${health.body?.health?.status || health.body?.error || "unknown"}`);
}
if (first.body.status !== "busy" && health.body?.health?.latestRunId !== runId) {
  throw new Error("Autonomous life health does not observe the persisted run receipt");
}

console.log(JSON.stringify({
  ok: true,
  runId,
  outcome: first.body.status,
  deliveryStatus: first.body.deliveryStatus || first.body.status,
  replayVerified: replay !== null,
  health: health.body.health.status,
}));
