import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import { runKairaProposalRecoveryWorker } from "./kairaProposalRecoveryWorkerRunCoordinator";
import { readKairaProposalRecoveryWorkerHealth } from "./kairaProposalRecoveryWorkerHealthRuntime";
import { resolveKairaProposalRecoveryWorkerHealthConfig } from "./kairaProposalRecoveryWorkerHealthConfig";
import { runKairaAutonomousLifeWorkerDurable } from "./kairaAutonomousLifeWorkerDurableRunCoordinator";
import { readKairaAutonomousLifeWorkerHealth } from "./kairaAutonomousLifeWorkerHealthRuntime";

const clampLimit = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
};

function authorizeRequest(req: Request, res: Response) {
  const auth = authorizeKairaInternalWorker({
    authorizationHeader: req.get("authorization"),
    configuredSecret: process.env.KAIRA_INTERNAL_WORKER_SECRET,
  });
  if (auth.status !== "authorized") {
    res.status(auth.httpStatus).json({ ok: false, error: auth.reason });
    return false;
  }
  return true;
}

export function registerKairaProposalRecoveryWorkerRoute(app: Express) {
  app.post("/internal/workers/kaira/proposal-recovery", async (req: Request, res: Response) => {
    if (!authorizeRequest(req, res)) return;

    const runId = String(req.get("x-kaira-worker-run-id") || "").trim();
    if (!runId) {
      return res.status(400).json({ ok: false, error: "worker_run_id_required" });
    }

    const now = new Date().toISOString();
    const limit = clampLimit(req.body?.limit);
    try {
      const result = await runKairaProposalRecoveryWorker({
        runId,
        requestedLimit: limit,
        now,
      });
      if (result.status === "failed") {
        return res.status(500).json({
          ok: false,
          runId,
          status: result.status,
          error: result.error,
          receipt: result.receipt,
        });
      }
      return res.json({
        ok: true,
        runId,
        processedAt: now,
        limit,
        ...result,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        runId,
        error: error?.message || "proposal_recovery_worker_failed",
      });
    }
  });

  app.post("/internal/workers/kaira/autonomous-life", async (req: Request, res: Response) => {
    if (!authorizeRequest(req, res)) return;

    const runId = String(req.get("x-kaira-worker-run-id") || "").trim();
    if (!runId) {
      return res.status(400).json({ ok: false, error: "worker_run_id_required" });
    }

    const now = new Date().toISOString();
    const limit = clampLimit(req.body?.limit);
    try {
      const result = await runKairaAutonomousLifeWorkerDurable({
        runId,
        requestedLimit: limit,
        now,
      });
      if (result.status === "busy") {
        return res.status(202).json({ ok: true, runId, status: "busy", limit, receipt: result.receipt });
      }
      if (result.status === "replayed") {
        const status = result.receipt.summary?.outcome || "failed";
        const ok = status === "completed" || status === "degraded";
        return res.status(ok ? 200 : 500).json({
          ok,
          runId,
          status,
          deliveryStatus: "replayed",
          limit,
          receipt: result.receipt,
        });
      }
      if (result.status === "failed") {
        return res.status(500).json({
          ok: false,
          runId,
          status: "failed",
          limit,
          error: result.error,
          receipt: result.receipt,
        });
      }
      const ok = result.worker.status === "completed" || result.worker.status === "degraded";
      return res.status(ok ? 200 : 500).json({
        ok,
        limit,
        deliveryStatus: "executed",
        receipt: result.receipt,
        ...result.worker,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        runId,
        error: error?.message || "autonomous_life_worker_failed",
      });
    }
  });

  app.get("/internal/workers/kaira/autonomous-life/health", async (req: Request, res: Response) => {
    if (!authorizeRequest(req, res)) return;

    const config = resolveKairaProposalRecoveryWorkerHealthConfig();
    if (config.status === "disabled") {
      return res.status(503).json({ ok: false, error: config.reason });
    }
    if (config.status === "invalid") {
      return res.status(500).json({ ok: false, error: config.reason });
    }

    const now = new Date().toISOString();
    try {
      const health = await readKairaAutonomousLifeWorkerHealth({
        now,
        maxTerminalRunAgeMinutes: config.thresholds.maxSuccessfulRunAgeMinutes,
        recentRunLimit: config.recentRunLimit,
      });
      return res.status(health.status === "unhealthy" ? 503 : 200).json({
        ok: health.status !== "unhealthy",
        checkedAt: now,
        health,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error?.message || "autonomous_life_health_read_failed",
      });
    }
  });

  app.get("/internal/workers/kaira/proposal-recovery/health", async (req: Request, res: Response) => {
    if (!authorizeRequest(req, res)) return;

    const config = resolveKairaProposalRecoveryWorkerHealthConfig();
    if (config.status === "disabled") {
      return res.status(503).json({ ok: false, error: config.reason });
    }
    if (config.status === "invalid") {
      return res.status(500).json({ ok: false, error: config.reason });
    }

    const now = new Date().toISOString();
    try {
      const health = await readKairaProposalRecoveryWorkerHealth({
        now,
        thresholds: config.thresholds,
        recentRunLimit: config.recentRunLimit,
        backlogSampleLimit: config.backlogSampleLimit,
      });
      return res.status(health.status === "unhealthy" ? 503 : 200).json({
        ok: health.status !== "unhealthy",
        checkedAt: now,
        health,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error?.message || "proposal_recovery_health_read_failed",
      });
    }
  });
}
