import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import { runKairaProposalRecoveryWorker } from "./kairaProposalRecoveryWorkerRunCoordinator";

const clampLimit = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
};

export function registerKairaProposalRecoveryWorkerRoute(app: Express) {
  app.post("/internal/workers/kaira/proposal-recovery", async (req: Request, res: Response) => {
    const auth = authorizeKairaInternalWorker({
      authorizationHeader: req.get("authorization"),
      configuredSecret: process.env.KAIRA_INTERNAL_WORKER_SECRET,
    });
    if (auth.status !== "authorized") {
      return res.status(auth.httpStatus).json({ ok: false, error: auth.reason });
    }

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
}
