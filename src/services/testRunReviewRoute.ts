import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import { loadTestSession } from "./kdmPersistenceService";
import { buildTestRunReviewPacket } from "./testRunReviewPacket";

function authorize(req: Request, res: Response): boolean {
  const decision = authorizeKairaInternalWorker({
    authorizationHeader: req.get("authorization"),
    configuredSecret:
      process.env.PRIVATROOM_INTEGRATION_TOKEN ||
      process.env.KAIRA_INTERNAL_TOKEN,
  });
  if (decision.status !== "authorized") {
    res.status(decision.httpStatus).json({ ok: false, error: decision.reason });
    return false;
  }
  return true;
}

export function registerTestRunReviewRoute(app: Express): void {
  app.get("/api/test-runs/:testRunId/review", async (req, res) => {
    if (!authorize(req, res)) return;

    try {
      const testRunId = String(req.params.testRunId || "").trim();
      if (!testRunId) {
        return res.status(400).json({ ok: false, error: "test_run_id_required" });
      }

      const restored = await loadTestSession(testRunId);
      if (!restored) {
        return res.status(404).json({ ok: false, error: "test_run_not_found" });
      }

      const packet = buildTestRunReviewPacket(restored);
      return res.json({ ok: true, packet });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
