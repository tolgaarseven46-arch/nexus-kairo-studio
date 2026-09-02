import { doc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";

const COLLECTION = "kairaProposalRecoveryWorkerRuns";
const DEFAULT_LEASE_MINUTES = 10;

export type KairaProposalRecoveryWorkerItemOutcome =
  | "materialized"
  | "already_materialized"
  | "cancelled"
  | "busy"
  | "replayed"
  | "failed";

export interface KairaProposalRecoveryWorkerRunSummary {
  discovered: number;
  processed: number;
  failed: number;
  items: Array<{
    proposalId: string;
    outcome: KairaProposalRecoveryWorkerItemOutcome;
    error?: string;
  }>;
}

export interface KairaProposalRecoveryWorkerRunReceipt {
  runId: string;
  status: "running" | "completed" | "failed";
  requestedLimit: number;
  startedAt: string;
  leaseUntil: string;
  completedAt?: string;
  summary?: KairaProposalRecoveryWorkerRunSummary;
  failure?: string;
}

export type KairaProposalRecoveryWorkerRunClaim =
  | { status: "claimed"; receipt: KairaProposalRecoveryWorkerRunReceipt }
  | { status: "busy"; receipt: KairaProposalRecoveryWorkerRunReceipt }
  | { status: "replayed"; receipt: KairaProposalRecoveryWorkerRunReceipt };

function normalizeRunId(value: string): string {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(normalized)) {
    throw new Error("Invalid Kaira proposal recovery worker run id");
  }
  return normalized;
}

function normalizeTime(value: string, label: string): string {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`Invalid Kaira proposal recovery worker ${label}`);
  return new Date(ms).toISOString();
}

function normalizedLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Invalid Kaira proposal recovery worker limit");
  }
  return value;
}

function refFor(runId: string) {
  return doc(db, COLLECTION, normalizeRunId(runId));
}

export async function claimKairaProposalRecoveryWorkerRun(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  leaseMinutes?: number;
}): Promise<KairaProposalRecoveryWorkerRunClaim> {
  const runId = normalizeRunId(input.runId);
  const requestedLimit = normalizedLimit(input.requestedLimit);
  const now = normalizeTime(input.now, "claim time");
  const nowMs = Date.parse(now);
  const leaseMinutes = Math.max(1, Math.min(60, Math.trunc(input.leaseMinutes || DEFAULT_LEASE_MINUTES)));
  const leaseUntil = new Date(nowMs + leaseMinutes * 60_000).toISOString();
  const ref = refFor(runId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaProposalRecoveryWorkerRunReceipt;
      if (existing.runId !== runId || existing.requestedLimit !== requestedLimit) {
        throw new Error("Kaira proposal recovery worker run idempotency conflict");
      }
      if (existing.status === "completed" || existing.status === "failed") {
        return { status: "replayed", receipt: existing } as const;
      }
      if (Date.parse(existing.leaseUntil) > nowMs) {
        return { status: "busy", receipt: existing } as const;
      }
      const reclaimed: KairaProposalRecoveryWorkerRunReceipt = {
        ...existing,
        status: "running",
        leaseUntil,
      };
      transaction.set(ref, reclaimed);
      return { status: "claimed", receipt: reclaimed } as const;
    }

    const created: KairaProposalRecoveryWorkerRunReceipt = {
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

export async function completeKairaProposalRecoveryWorkerRun(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  summary: KairaProposalRecoveryWorkerRunSummary;
}): Promise<KairaProposalRecoveryWorkerRunReceipt> {
  const runId = normalizeRunId(input.runId);
  const requestedLimit = normalizedLimit(input.requestedLimit);
  const now = normalizeTime(input.now, "completion time");
  const ref = refFor(runId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira proposal recovery worker run not found");
    const existing = snapshot.data() as KairaProposalRecoveryWorkerRunReceipt;
    if (existing.runId !== runId || existing.requestedLimit !== requestedLimit) {
      throw new Error("Kaira proposal recovery worker run correlation mismatch");
    }
    if (existing.status === "completed") {
      if (JSON.stringify(existing.summary) !== JSON.stringify(input.summary)) {
        throw new Error("Kaira proposal recovery worker run outcome conflict");
      }
      return existing;
    }
    if (existing.status === "failed") throw new Error("Failed Kaira proposal recovery worker run cannot complete");
    const completed: KairaProposalRecoveryWorkerRunReceipt = {
      ...existing,
      status: "completed",
      completedAt: now,
      summary: input.summary,
    };
    transaction.set(ref, completed);
    return completed;
  });
}

export async function failKairaProposalRecoveryWorkerRun(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  failure: string;
}): Promise<KairaProposalRecoveryWorkerRunReceipt> {
  const runId = normalizeRunId(input.runId);
  const requestedLimit = normalizedLimit(input.requestedLimit);
  const now = normalizeTime(input.now, "failure time");
  const failure = String(input.failure || "unknown_worker_failure").slice(0, 500);
  const ref = refFor(runId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira proposal recovery worker run not found");
    const existing = snapshot.data() as KairaProposalRecoveryWorkerRunReceipt;
    if (existing.runId !== runId || existing.requestedLimit !== requestedLimit) {
      throw new Error("Kaira proposal recovery worker run correlation mismatch");
    }
    if (existing.status === "completed") return existing;
    if (existing.status === "failed") {
      if (existing.failure !== failure) throw new Error("Kaira proposal recovery worker failure conflict");
      return existing;
    }
    const failed: KairaProposalRecoveryWorkerRunReceipt = {
      ...existing,
      status: "failed",
      completedAt: now,
      failure,
    };
    transaction.set(ref, failed);
    return failed;
  });
}
