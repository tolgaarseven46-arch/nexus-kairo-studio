import { collection, doc, getDocs, limit, orderBy, query, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";

const COLLECTION = "kairaAutonomousLifeWorkerRuns";
const DEFAULT_LEASE_MINUTES = 10;

export type KairaAutonomousLifeWorkerOutcome =
  | "completed"
  | "degraded"
  | "partial_failure"
  | "failed";

export interface KairaAutonomousLifeWorkerRunSummary {
  outcome: KairaAutonomousLifeWorkerOutcome;
  planning: {
    status: "completed" | "failed";
    discovered: number;
    completed: number;
    busy: number;
    deferred: number;
    failed: number;
    error?: string;
  };
  recovery: {
    status: "completed" | "failed";
    outcome?: string;
    discovered: number;
    processed: number;
    failed: number;
    error?: string;
  };
  schedules: {
    status: "completed" | "failed";
    discovered: number;
    attempted: number;
    succeeded: number;
    failed: number;
    error?: string;
  };
}

export interface KairaAutonomousLifeWorkerRunReceipt {
  runId: string;
  status: "running" | "completed" | "failed";
  requestedLimit: number;
  startedAt: string;
  leaseUntil: string;
  completedAt?: string;
  summary?: KairaAutonomousLifeWorkerRunSummary;
  failure?: string;
}

export type KairaAutonomousLifeWorkerRunClaim =
  | { status: "claimed"; receipt: KairaAutonomousLifeWorkerRunReceipt }
  | { status: "busy"; receipt: KairaAutonomousLifeWorkerRunReceipt }
  | { status: "replayed"; receipt: KairaAutonomousLifeWorkerRunReceipt };

function normalizeRunId(value: string): string {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(normalized)) {
    throw new Error("Invalid Kaira autonomous life worker run id");
  }
  return normalized;
}

function normalizeTime(value: string, label: string): string {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`Invalid Kaira autonomous life worker ${label}`);
  return new Date(ms).toISOString();
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Invalid Kaira autonomous life worker limit");
  }
  return value;
}

function refFor(runId: string) {
  return doc(db, COLLECTION, normalizeRunId(runId));
}

export async function listRecentKairaAutonomousLifeWorkerRuns(input?: {
  limit?: number;
}): Promise<KairaAutonomousLifeWorkerRunReceipt[]> {
  const requested = Math.max(1, Math.min(100, Math.trunc(input?.limit || 20)));
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("startedAt", "desc"), limit(requested)),
  );
  return snapshot.docs.map((item) => item.data() as KairaAutonomousLifeWorkerRunReceipt);
}

export async function claimKairaAutonomousLifeWorkerRun(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  leaseMinutes?: number;
}): Promise<KairaAutonomousLifeWorkerRunClaim> {
  const runId = normalizeRunId(input.runId);
  const requestedLimit = normalizeLimit(input.requestedLimit);
  const now = normalizeTime(input.now, "claim time");
  const nowMs = Date.parse(now);
  const leaseMinutes = Math.max(1, Math.min(60, Math.trunc(input.leaseMinutes || DEFAULT_LEASE_MINUTES)));
  const leaseUntil = new Date(nowMs + leaseMinutes * 60_000).toISOString();
  const ref = refFor(runId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaAutonomousLifeWorkerRunReceipt;
      if (existing.runId !== runId || existing.requestedLimit !== requestedLimit) {
        throw new Error("Kaira autonomous life worker run idempotency conflict");
      }
      if (existing.status === "completed" || existing.status === "failed") {
        return { status: "replayed", receipt: existing } as const;
      }
      if (Date.parse(existing.leaseUntil) > nowMs) {
        return { status: "busy", receipt: existing } as const;
      }
      const reclaimed: KairaAutonomousLifeWorkerRunReceipt = {
        ...existing,
        status: "running",
        leaseUntil,
      };
      transaction.set(ref, reclaimed);
      return { status: "claimed", receipt: reclaimed } as const;
    }

    const created: KairaAutonomousLifeWorkerRunReceipt = {
      runId,
      status: "running",
      requestedLimit,
      startedAt: now,
      leaseUntil,
    };
    transaction.set(ref, created);
    return { status: "claimed", receipt: created } as const;
  });
}

export async function completeKairaAutonomousLifeWorkerRun(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  summary: KairaAutonomousLifeWorkerRunSummary;
}): Promise<KairaAutonomousLifeWorkerRunReceipt> {
  const runId = normalizeRunId(input.runId);
  const requestedLimit = normalizeLimit(input.requestedLimit);
  const completedAt = normalizeTime(input.now, "completion time");
  const ref = refFor(runId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira autonomous life worker run not found");
    const existing = snapshot.data() as KairaAutonomousLifeWorkerRunReceipt;
    if (existing.runId !== runId || existing.requestedLimit !== requestedLimit) {
      throw new Error("Kaira autonomous life worker run correlation mismatch");
    }
    if (existing.status === "completed") {
      if (JSON.stringify(existing.summary) !== JSON.stringify(input.summary)) {
        throw new Error("Kaira autonomous life worker run outcome conflict");
      }
      return existing;
    }
    if (existing.status === "failed") throw new Error("Failed Kaira autonomous life worker run cannot complete");
    const completed: KairaAutonomousLifeWorkerRunReceipt = {
      ...existing,
      status: "completed",
      completedAt,
      summary: input.summary,
    };
    transaction.set(ref, completed);
    return completed;
  });
}

export async function failKairaAutonomousLifeWorkerRun(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  failure: string;
}): Promise<KairaAutonomousLifeWorkerRunReceipt> {
  const runId = normalizeRunId(input.runId);
  const requestedLimit = normalizeLimit(input.requestedLimit);
  const completedAt = normalizeTime(input.now, "failure time");
  const failure = String(input.failure || "autonomous_life_worker_failed").slice(0, 500);
  const ref = refFor(runId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira autonomous life worker run not found");
    const existing = snapshot.data() as KairaAutonomousLifeWorkerRunReceipt;
    if (existing.runId !== runId || existing.requestedLimit !== requestedLimit) {
      throw new Error("Kaira autonomous life worker run correlation mismatch");
    }
    if (existing.status === "completed") return existing;
    if (existing.status === "failed") {
      if (existing.failure !== failure) throw new Error("Kaira autonomous life worker failure conflict");
      return existing;
    }
    const failed: KairaAutonomousLifeWorkerRunReceipt = {
      ...existing,
      status: "failed",
      completedAt,
      failure,
    };
    transaction.set(ref, failed);
    return failed;
  });
}
