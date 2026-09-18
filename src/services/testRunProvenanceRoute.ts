import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import { buildRuntimeTestRunRecordV1 } from "./testRunRuntimeProvenance";

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

export function registerTestRunProvenanceRoute(app: Express): void {
  app.post("/api/test-runs/provenance", (req: Request, res: Response) => {
    if (!authorize(req, res)) return;

    try {
      const record = buildRuntimeTestRunRecordV1({
        testRunId: String(req.body?.testRunId || "").trim(),
        environmentId: req.body?.environmentId,
        mode: req.body?.mode,
        serverId: String(req.body?.serverId || "").trim(),
        kairaInstanceId: String(req.body?.kairaInstanceId || "").trim(),
        testerUserId: String(req.body?.testerUserId || "").trim(),
        privatRoomCommit: String(req.body?.privatRoomCommit || "").trim(),
        scenarioPackVersion: req.body?.scenarioPackVersion,
        trialState: req.body?.trialState,
        retryOf: req.body?.retryOf,
        idempotencyChain: Array.isArray(req.body?.idempotencyChain)
          ? req.body.idempotencyChain.map(String)
          : undefined,
        sourceRunId: req.body?.sourceRunId,
      });

      return res.json({ ok: true, record });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
