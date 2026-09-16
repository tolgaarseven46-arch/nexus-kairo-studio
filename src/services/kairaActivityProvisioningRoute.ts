import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import {
  loadActiveKairaActivityCatalog,
  publishKairaActivityCatalogAtomic,
} from "./kairaActivityCatalogStore";
import {
  loadKairaActivityEnvironmentSnapshot,
  saveKairaActivityEnvironmentSnapshot,
} from "./kairaActivityEnvironmentStore";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import type { KairaActivityEnvironmentEntry } from "./kairaActivityEnvironmentAuthority";

function authorize(req: Request, res: Response): boolean {
  const decision = authorizeKairaInternalWorker({
    authorizationHeader: req.get("authorization"),
    configuredSecret: process.env.KAIRA_INTERNAL_WORKER_SECRET,
  });
  if (decision.status !== "authorized") {
    res.status(decision.httpStatus).json({ ok: false, error: decision.reason });
    return false;
  }
  return true;
}

function instanceType(value: unknown): KairaInstanceContext["instanceType"] | null {
  return value === "individual" || value === "reference" || value === "welcome" ? value : null;
}

/** Trusted provisioning/admin surface. It never accepts client-authored timestamps. */
export function registerKairaActivityProvisioningRoute(app: Express) {
  app.get("/internal/kaira/activity-catalog", async (req: Request, res: Response) => {
    if (!authorize(req, res)) return;
    const kairaInstanceId = String(req.query?.kairaInstanceId || "").trim();
    const resolvedType = instanceType(req.query?.instanceType);
    if (!kairaInstanceId || !resolvedType) {
      return res.status(400).json({ ok: false, error: "invalid_activity_catalog_identity" });
    }
    try {
      const snapshot = await loadActiveKairaActivityCatalog({ kairaInstanceId, instanceType: resolvedType });
      if (!snapshot) return res.status(404).json({ ok: false, error: "activity_catalog_missing" });
      return res.json({ ok: true, snapshot });
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: error?.message || "activity_catalog_read_failed" });
    }
  });

  app.post("/internal/kaira/activity-catalog", async (req: Request, res: Response) => {
    if (!authorize(req, res)) return;
    const catalogVersion = String(req.body?.catalogVersion || "").trim();
    const kairaInstanceId = String(req.body?.kairaInstanceId || "").trim();
    const resolvedType = instanceType(req.body?.instanceType);
    const entries = req.body?.entries;
    if (!kairaInstanceId || !resolvedType || !catalogVersion || !Array.isArray(entries)) {
      return res.status(400).json({ ok: false, error: "invalid_activity_catalog_payload" });
    }
    try {
      const publishedAt = new Date().toISOString();
      const result = await publishKairaActivityCatalogAtomic({
        kairaInstanceId,
        instanceType: resolvedType,
        catalogVersion,
        entries: entries as KairaActivityCatalogEntry[],
        publishedAt,
      });
      return res.json({ ok: true, publishedAt, ...result });
    } catch (error: any) {
      return res.status(400).json({ ok: false, error: error?.message || "activity_catalog_publish_failed" });
    }
  });

  app.get("/internal/kaira/activity-environment", async (req: Request, res: Response) => {
    if (!authorize(req, res)) return;
    const kairaInstanceId = String(req.query?.kairaInstanceId || "").trim();
    const resolvedType = instanceType(req.query?.instanceType);
    if (!kairaInstanceId || !resolvedType) {
      return res.status(400).json({ ok: false, error: "invalid_activity_environment_identity" });
    }
    try {
      const snapshot = await loadKairaActivityEnvironmentSnapshot({
        kairaInstanceId,
        instanceType: resolvedType,
      });
      if (!snapshot) return res.status(404).json({ ok: false, error: "activity_environment_missing" });
      return res.json({ ok: true, snapshot });
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: error?.message || "activity_environment_read_failed" });
    }
  });

  app.post("/internal/kaira/activity-environment", async (req: Request, res: Response) => {
    if (!authorize(req, res)) return;
    const kairaInstanceId = String(req.body?.kairaInstanceId || "").trim();
    const resolvedType = instanceType(req.body?.instanceType);
    const entries = req.body?.entries;
    if (!kairaInstanceId || !resolvedType || !Array.isArray(entries)) {
      return res.status(400).json({ ok: false, error: "invalid_activity_environment_payload" });
    }
    try {
      const observedAt = new Date().toISOString();
      const result = await saveKairaActivityEnvironmentSnapshot({
        kairaInstanceId,
        instanceType: resolvedType,
        authority: "kaira_environment_controller",
        snapshot: {
          schemaVersion: 1,
          kairaInstanceId,
          observedAt,
          entries: entries as KairaActivityEnvironmentEntry[],
        },
      });
      return res.json({ ok: true, observedAt, ...result });
    } catch (error: any) {
      return res.status(400).json({ ok: false, error: error?.message || "activity_environment_publish_failed" });
    }
  });
}
