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

const boundedTimeoutMs = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 30_000 || parsed > 300_000) return fallback;
  return parsed;
};

const baseUrl = new URL(required("KAIRA_AUTONOMOUS_LIFE_URL"));
if (baseUrl.protocol !== "https:") throw new Error("KAIRA_AUTONOMOUS_LIFE_URL must use https");
const secret = required("KAIRA_INTERNAL_WORKER_SECRET");
const runId = required("KAIRA_AUTONOMOUS_LIFE_RUN_ID");
if (!/^[A-Za-z0-9._:-]{1,160}$/.test(runId)) throw new Error("Invalid autonomous life run id");
const limit = positiveInteger(process.env.KAIRA_AUTONOMOUS_LIFE_LIMIT, 25);
const workerTimeoutMs = boundedTimeoutMs(process.env.KAIRA_AUTONOMOUS_LIFE_TIMEOUT_MS, 240_000);
const replayTimeoutMs = Math.min(workerTimeoutMs, 90_000);
const healthTimeoutMs = Math.min(workerTimeoutMs, 60_000);

async function request(path, init = {}, timeoutMs = workerTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Kaira worker request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const invoke = (timeoutMs = workerTimeoutMs) => request("/internal/workers/kaira/autonomous-life", {
  method: "POST",
  headers: { "x-kaira-worker-run-id": runId },
  body: JSON.stringify({ limit }),
}, timeoutMs);

const stageFailures = (summary) => ({
  planning: Number(summary?.planning?.failed || 0),
  recovery: Number(summary?.recovery?.failed || 0),
  schedules: Number(summary?.schedules?.failed || 0),
});

function assertTerminalStageSuccess(body) {
  const summary = body?.receipt?.summary;
  if (!summary) throw new Error("Autonomous life terminal durable summary is missing");
  const failures = stageFailures(summary);
  const failedStages = Object.entries(failures).filter(([, failed]) => failed > 0);
  if (failedStages.length) {
    throw new Error(`Autonomous life stage failures: ${failedStages.map(([stage, failed]) => `${stage}=${failed}`).join(", ")}`);
  }
  return summary;
}

const first = await invoke();
if (first.body?.runId !== runId) throw new Error("Autonomous life worker run correlation mismatch");
if (![200, 202].includes(first.response.status)) {
  const summary = first.body?.receipt?.summary;
  const failedPlanningItems = Array.isArray(first.body?.planningInbox?.result?.items)
    ? first.body.planningInbox.result.items
      .filter((item) => item?.status === "failed")
      .slice(0, 5)
      .map((item) => ({
        triggerId: String(item?.triggerId || "unknown").slice(0, 160),
        error: String(item?.error || "planning_trigger_processing_failed").slice(0, 500),
      }))
    : [];
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
    failedPlanningItems,
  }));
  throw new Error(`Autonomous life worker failed: HTTP ${first.response.status} ${first.body?.error || first.body?.status || "unknown"}`);
}
if (!["completed", "degraded", "busy"].includes(first.body?.status)) {
  throw new Error(`Unexpected autonomous life worker status: ${first.body?.status || "missing"}`);
}

const summary = first.body.status === "busy" ? undefined : assertTerminalStageSuccess(first.body);

let replay = null;
if (first.body.status !== "busy") {
  replay = await invoke(replayTimeoutMs);
  if (replay.response.status !== 200 || replay.body?.runId !== runId || replay.body?.deliveryStatus !== "replayed") {
    throw new Error("Autonomous life Firestore receipt replay verification failed");
  }
  if (replay.body?.status !== first.body?.status) {
    throw new Error("Autonomous life replay outcome drifted");
  }
  assertTerminalStageSuccess(replay.body);
}

const health = await request("/internal/workers/kaira/autonomous-life/health", {}, healthTimeoutMs);
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
  stages: summary ? {
    planning: summary.planning,
    recovery: summary.recovery,
    schedules: summary.schedules,
  } : undefined,
}));