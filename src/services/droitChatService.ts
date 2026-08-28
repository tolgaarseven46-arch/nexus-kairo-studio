import {
  DroitPersonalityTraits,
  TestMessage,
  DroitDynamicState,
  ReasoningTrace,
} from "../types/nexus";
import {
  computeBehaviorProfile,
  BehaviorLayerProfile,
} from "./droitBehaviorEngine";
import {
  validateKairoResponse,
  ResponseConsistencyResult,
} from "./kairoResponseConsistency";
import { auth } from "../lib/firebase";
export type KairoProvider = "gemini" | "openrouter";
export type KairoProviderUsed = KairoProvider | "local_language";
export interface KairoTimingMetrics {
  clientPrepMs: number;
  serverTotalMs: number;
  memoryMs: number;
  kdmMs: number;
  aiMs: number;
  postProcessMs: number;
  networkAndOverheadMs: number;
  totalMs: number;
}
export interface SendKairoChatOptions {
  userMessage: string;
  personality: DroitPersonalityTraits;
  dynamicState?: DroitDynamicState;
  history?: TestMessage[];
  characterInfo?: { name?: string; roleTitle?: string; raceName?: string };
  provider?: KairoProvider;
  userId?: string;
  userName?: string;
  suppressRecentMemory?: boolean;
  sessionId?: string;
}
export interface KairoChatResponse {
  reply: string;
  profile: BehaviorLayerProfile;
  dynamicState?: DroitDynamicState;
  reasoningTrace?: ReasoningTrace;
  consistency?: ResponseConsistencyResult;
  providerUsed?: KairoProviderUsed;
  timings?: KairoTimingMetrics;
  sessionId?: string;
  turnId?: string;
}
function resolveConversationUserId(explicitUserId?: string) {
  if (explicitUserId?.trim()) return explicitUserId.trim();
  if (typeof window !== "undefined") {
    const id = window.localStorage.getItem("kairo_test_user_id");
    if (id?.trim()) return id.trim();
  }
  return auth.currentUser?.uid || "anonymous";
}
export const droitChatService = {
  async sendMessage({
    userMessage,
    personality,
    dynamicState,
    history = [],
    characterInfo = {
      name: "KAIRO",
      roleTitle: "Sunucu Yöneticisi",
      raceName: "Sentetik Droit",
    },
    provider = "openrouter",
    userId: explicitUserId,
    userName = "Kullanıcı",
    suppressRecentMemory = false,
    sessionId,
  }: SendKairoChatOptions): Promise<KairoChatResponse> {
    const totalStart = performance.now();
    const userId = resolveConversationUserId(explicitUserId);
    const prepStart = performance.now();
    const behaviorProfile = computeBehaviorProfile(personality, userMessage);
    const clientPrepMs = Math.round(performance.now() - prepStart);
    const payload = {
      sessionId,
      userId,
      userName,
      userMessage,
      character: characterInfo,
      personality,
      behaviorProfile,
      dynamicState,
      history: history
        .slice(-24)
        .map((m) => ({
          sender: m.sender,
          text: m.text,
          participantId: m.participantId,
          participantName: m.participantName,
          replyToParticipantId: m.replyToParticipantId,
          replyToParticipantName: m.replyToParticipantName,
        })),
      provider,
      suppressRecentMemory,
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Sunucu hatası: ${res.status}`);
      }
      const data = await res.json();
      const reply = data.reply || "";
      const nextDynamicState = data.kdm?.dynamicState as
        | DroitDynamicState
        | undefined;
      const reasoningTrace = data.kdm?.trace as ReasoningTrace | undefined;
      const consistency =
        (data.consistency as ResponseConsistencyResult | undefined) ??
        (reasoningTrace
          ? validateKairoResponse(reply, reasoningTrace)
          : undefined);
      const totalMs = Math.round(performance.now() - totalStart);
      const server = data.timings || {};
      const serverTotalMs = Number(server.serverTotalMs || 0);
      const timings: KairoTimingMetrics = {
        clientPrepMs,
        serverTotalMs,
        memoryMs: Number(server.memoryMs || 0),
        kdmMs: Number(server.kdmMs || 0),
        aiMs: Number(server.aiMs || 0),
        postProcessMs: Number(server.postProcessMs || 0),
        networkAndOverheadMs: Math.max(
          0,
          totalMs - clientPrepMs - serverTotalMs,
        ),
        totalMs,
      };
      return {
        reply,
        profile: behaviorProfile,
        dynamicState: nextDynamicState,
        reasoningTrace,
        consistency,
        providerUsed: data.providerUsed,
        timings,
        sessionId: data.sessionId,
        turnId: data.turnId,
      };
    } catch (err: any) {
      if (err?.name === "AbortError")
        throw new Error(
          "Kaira yanıtı 35 saniyeyi aştı. OpenRouter/model gecikmesi olabilir.",
        );
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  },
};
