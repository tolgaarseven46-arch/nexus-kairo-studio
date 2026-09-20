import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdminStatus, getPrivatRoomAdminDb } from "./src/server/firebaseAdmin";
import { isKairaDmMessageCreatedEventV0 } from "./src/integrations/kaira/contracts";
import { dispatchKairaOutboxEvent } from "./src/server/kairaGateway";
import { enqueueKairaOutboxEvent, getKairaOutboxEvent } from "./src/server/kairaOutboxStore";
import { registerKairaDmIngressRoute } from "./src/server/kairaDmIngressRoute";
import {
  ensureKairaPrincipal,
  registerKairaPrincipalRoute,
  startKairaRoomMembershipProjection,
} from "./src/server/kairaPrincipalRoute";
import { registerKairaBetaRoomChatRoute } from "./src/server/kairaBetaRoomChatRoute";
import { registerKairaTestRunReviewRoute } from "./src/server/kairaTestRunReviewRoute";
import { registerBetaRoomCreateRoute } from "./src/server/betaRoomCreateRoute";

const hasInternalIntegrationAccess = (req: express.Request): boolean => {
  const expected = process.env.KAIRA_INTERNAL_TOKEN?.trim();
  if (!expected) return false;
  const supplied = req.header("x-kaira-internal-token")?.trim();
  return supplied === expected;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "256kb" }));
  registerKairaDmIngressRoute(app);
  registerKairaPrincipalRoute(app);
  registerKairaBetaRoomChatRoute(app);
  registerKairaTestRunReviewRoute(app);
  registerBetaRoomCreateRoute(app);

  const bootstrapKairaPrincipal = async (): Promise<void> => {
    const bootstrapInstanceId = process.env.KAIRA_DEFAULT_INSTANCE_ID?.trim();
    if (!bootstrapInstanceId) {
      console.warn("[Kaira Principal] bootstrap skipped: default_instance_not_configured");
      return;
    }

    const firebaseAdmin = getFirebaseAdminStatus();
    const db = getPrivatRoomAdminDb();
    if (!db) {
      console.warn(
        `[Kaira Principal] bootstrap skipped: firebase_admin_not_ready configured=${firebaseAdmin.configured} error=${firebaseAdmin.error || "none"}`,
      );
      return;
    }

    try {
      const bootstrappedPrincipal = await ensureKairaPrincipal(db, {
        instanceId: bootstrapInstanceId,
        displayName: process.env.KAIRA_DEFAULT_DISPLAY_NAME || "Kaira",
        roleTitle: process.env.KAIRA_DEFAULT_ROLE_TITLE || "Sunucu Yöneticisi",
        avatarUrl: process.env.KAIRA_DEFAULT_AVATAR_URL || "",
      });
      console.log(`[Kaira Principal] ready: ${bootstrappedPrincipal.instanceId} -> ${bootstrappedPrincipal.uid}`);
      startKairaRoomMembershipProjection(db, bootstrappedPrincipal);
    } catch (error) {
      console.error("[Kaira Principal] bootstrap failed:", error);
    }
  };

  console.log("[Kaira Beta Room] direct browser -> PrivatRoom -> Kaira bridge enabled; Firestore auto-reply listener disabled");

  app.get("/api/integration/status", (_req, res) => {
    const firebaseAdmin = getFirebaseAdminStatus();
    res.json({
      ok: true,
      firebaseAdmin: {
        configured: firebaseAdmin.configured,
        ready: firebaseAdmin.ready,
        projectId: firebaseAdmin.projectId,
        error: firebaseAdmin.error,
      },
      kaira: {
        configured: Boolean(process.env.KAIRA_API_URL?.trim()),
        internalAuthConfigured: Boolean(process.env.KAIRA_INTERNAL_TOKEN?.trim()),
        integrationAuthConfigured: Boolean(process.env.KAIRA_INTEGRATION_TOKEN?.trim()),
        defaultInstanceConfigured: Boolean(process.env.KAIRA_DEFAULT_INSTANCE_ID?.trim()),
      },
    });
  });

  app.post("/api/integrations/kaira/outbox", async (req, res) => {
    if (!hasInternalIntegrationAccess(req)) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    const db = getPrivatRoomAdminDb();
    if (!db) {
      return res.status(503).json({ ok: false, error: "firebase_admin_not_ready" });
    }
    if (!isKairaDmMessageCreatedEventV0(req.body)) {
      return res.status(400).json({ ok: false, error: "invalid_kaira_dm_event" });
    }

    try {
      const record = await enqueueKairaOutboxEvent(db, req.body);
      const dispatch = await dispatchKairaOutboxEvent(db, record.eventId);
      return res.status(202).json({ ok: true, eventId: record.eventId, dispatch });
    } catch (error) {
      console.error("[Kaira Outbox] enqueue/dispatch failed:", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/integrations/kaira/outbox/:eventId/dispatch", async (req, res) => {
    if (!hasInternalIntegrationAccess(req)) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    const db = getPrivatRoomAdminDb();
    if (!db) {
      return res.status(503).json({ ok: false, error: "firebase_admin_not_ready" });
    }
    try {
      const result = await dispatchKairaOutboxEvent(db, req.params.eventId);
      return res.json({ ok: true, eventId: req.params.eventId, dispatch: result });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/integrations/kaira/outbox/:eventId", async (req, res) => {
    if (!hasInternalIntegrationAccess(req)) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    const db = getPrivatRoomAdminDb();
    if (!db) {
      return res.status(503).json({ ok: false, error: "firebase_admin_not_ready" });
    }
    const record = await getKairaOutboxEvent(db, req.params.eventId);
    if (!record) return res.status(404).json({ ok: false, error: "not_found" });
    return res.json({ ok: true, record });
  });

  // Legacy AI endpoint. Kept temporarily while the Kaira integration seam is built.
  // It must not become the authority for Kaira behavior or platform admin actions.
  app.post("/api/chat/zipo", async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Görüş talebi veya mesaj içeriği bulunamadı." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      console.log("[Zipo API] Received prompt:", prompt, "| API Key present:", !!apiKey);

      if (!apiKey) {
        console.warn("[Zipo API] GEMINI_API_KEY is missing from process.env");
        return res.json({
          reply: "Merhaba! Ben Zipo 🤖. Sunucuda GEMINI_API_KEY henüz ayarlanmamış, bu yüzden şu an canlı yapay zeka yanıtı üretemiyorum.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const cleanPrompt = prompt.replace(/@zipo/gi, "").trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Sen Private Room oda sohbetlerinin eğlenceli, samimi ve akıllı yapay zeka asistanı Zipo'sun.
Kullanıcılar odada mesaj atarken sana @Zipo diyerek soru sorabilir.
Lütfen çok uzun olmayan, samimi, net ve Türkçe yanıt ver.

Kullanıcı Mesajı: ${cleanPrompt || prompt}`,
      });

      const reply = response.text || "Şu anda yanıt üretemedim, lütfen tekrar dene!";
      console.log("[Zipo API] Generated reply successfully:", reply.substring(0, 50) + "...");
      return res.json({ reply });
    } catch (err: any) {
      console.error("[Zipo API Error]:", err?.status, err?.message || err);
      return res.status(500).json({
        reply: "Üzgünüm, Zipo şu an küçük bir bağlantı sorunu yaşıyor. Lütfen tekrar dene!",
        error: err?.message || String(err),
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Private Room Server running on http://0.0.0.0:${PORT}`);
    void bootstrapKairaPrincipal();
  });
}

startServer();
