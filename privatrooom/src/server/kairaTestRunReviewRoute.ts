import type { Express, Request, Response } from "express";
import { getPrivatRoomAdminAuth, getPrivatRoomAdminDb } from "./firebaseAdmin";

const safeId = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);

const resolveKairaReviewEndpoint = (testRunId: string): string | null => {
  const base = process.env.KAIRA_API_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/test-runs/${encodeURIComponent(testRunId)}/review`;
};

const extractBearer = (value?: string | null): string | null => {
  const raw = String(value || "").trim();
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

async function verifyOwnerAccess(input: {
  authorizationHeader?: string | null;
  roomId: string;
}): Promise<{ ok: true; uid: string } | { ok: false; status: number; error: string }> {
  const auth = getPrivatRoomAdminAuth();
  const db = getPrivatRoomAdminDb();
  if (!auth || !db) {
    return { ok: false, status: 503, error: "firebase_admin_not_ready" };
  }

  const token = extractBearer(input.authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, error: "missing_auth_token" };
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const roomSnap = await db.collection("rooms").doc(input.roomId).get();
    if (!roomSnap.exists) {
      return { ok: false, status: 404, error: "room_not_found" };
    }

    const room = roomSnap.data() || {};
    if (String(room.creatorUid || "") !== decoded.uid) {
      return { ok: false, status: 403, error: "owner_required" };
    }

    return { ok: true, uid: decoded.uid };
  } catch (error) {
    console.warn("[Kaira TestRun Review] auth failed:", error);
    return { ok: false, status: 401, error: "invalid_auth_token" };
  }
}

export const registerKairaTestRunReviewRoute = (app: Express): void => {
  app.get(
    "/api/integrations/kaira/test-runs/:testRunId/review",
    async (req: Request, res: Response) => {
      const roomId = String(req.query.roomId || "").trim();
      const testRunId = String(req.params.testRunId || "").trim();

      if (!roomId || !testRunId) {
        return res.status(400).json({ ok: false, error: "room_and_test_run_required" });
      }

      const expectedRunId = `TR_live_beta_${safeId(roomId)}`;
      if (testRunId !== expectedRunId) {
        return res.status(400).json({ ok: false, error: "test_run_room_mismatch" });
      }

      const owner = await verifyOwnerAccess({
        authorizationHeader: req.header("authorization"),
        roomId,
      });
      if (owner.ok === false) {
        return res.status(owner.status).json({ ok: false, error: owner.error });
      }

      const endpoint = resolveKairaReviewEndpoint(testRunId);
      const token = process.env.KAIRA_INTEGRATION_TOKEN?.trim();

      if (!endpoint || !token) {
        return res.status(503).json({ ok: false, error: "kaira_review_not_configured" });
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        let upstream: globalThis.Response;
        try {
          upstream = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "X-PrivatRoom-Review-Owner": owner.uid,
            },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        const payload = await upstream.json().catch(() => null);
        if (!upstream.ok) {
          return res.status(upstream.status).json(
            payload && typeof payload === "object"
              ? payload
              : { ok: false, error: `kaira_review_http_${upstream.status}` },
          );
        }

        return res.json(payload);
      } catch (error: any) {
        return res.status(502).json({
          ok: false,
          error:
            error?.name === "AbortError"
              ? "kaira_review_timeout"
              : error?.message || "kaira_review_failed",
        });
      }
    },
  );
};
