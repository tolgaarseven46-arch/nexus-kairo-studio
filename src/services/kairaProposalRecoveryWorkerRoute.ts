import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import { recoverSelectedKairaActivityProposalBatch } from "./kairaActivityProposalRecoveryBatch";

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

    const now = new Date().toISOString();
    const limit = clampLimit(req.body?.limit);
    try {
      const result = await recoverSelectedKairaActivityProposalBatch({ now, limit });
      return res.json({
        ok: true,
        processedAt: now,
        limit,
        ...result,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error?.message || "proposal_recovery_worker_failed",
      });
    }
  });
}
