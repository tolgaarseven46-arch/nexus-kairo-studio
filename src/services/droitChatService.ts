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
import {
  appraiseEventV0,
  type AppraisalEventKind,
} from "./appraisalEngine";
import {
  computeTemperamentResponse,
  temperamentFromFineTune,
} from "./temperamentEngine";
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

const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function readFineTuneProfile(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("kairo_character_finetune_v2");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function classifyAppraisalEvent(message: string): {
  kind: AppraisalEventKind;
  valence: "positive" | "negative" | "neutral";
  negativeLoad: number;
  frustrationLoad: number;
  threatLoad: number;
  rewardLoad: number;
} {
  const text = message.toLocaleLowerCase("tr-TR");
  const apology = /(özür|pardon|kusura bakma|hata ettim|yanlış yaptım)/.test(text);
  const insult = /(aptal|salak|gerizekalı|geri zekalı|mal\b|çirkin|kaşar|orospu|sürtük|piç|yavşak|şerefsiz|haysiyetsiz|ezik|defol|siktir|sus\b|kes\b|kaybol)/.test(text);
  const rejection = /(istemiyorum|git başımdan|konuşma benimle|bırak beni|defol|kaybol)/.test(text);
  const support = /(yanındayım|haklısın|seni anlıyorum|destekliyorum|merak etme)/.test(text);
  const compliment = /(harika|süper|mükemmel|çok iyisin|seviyorum|teşekkür|sağ ol|iyi ki varsın)/.test(text);
  const frustration = /(yeter|bıktım|sinir|sinirlen|aynı şeyi|kaç kere|neden anlamıyorsun|niye anlamıyorsun)/.test(text);

  if (apology) {
    return {
      kind: "apology",
      valence: "positive",
      negativeLoad: 0,
      frustrationLoad: 0,
      threatLoad: 0,
      rewardLoad: 0.55,
    };
  }
  if (insult) {
    return {
      kind: "insult",
      valence: "negative",
      negativeLoad: 1,
      frustrationLoad: frustration ? 1 : 0.85,
      threatLoad: 0.7,
      rewardLoad: 0,
    };
  }
  if (rejection) {
    return {
      kind: "rejection",
      valence: "negative",
      negativeLoad: 0.75,
      frustrationLoad: 0.5,
      threatLoad: 0.55,
      rewardLoad: 0,
    };
  }
  if (support) {
    return {
      kind: "support",
      valence: "positive",
      negativeLoad: 0,
      frustrationLoad: 0,
      threatLoad: 0,
      rewardLoad: 0.7,
    };
  }
  if (compliment) {
    return {
      kind: "compliment",
      valence: "positive",
      negativeLoad: 0,
      frustrationLoad: 0,
      threatLoad: 0,
      rewardLoad: 0.8,
    };
  }
  if (frustration) {
    return {
      kind: "neutral",
      valence: "negative",
      negativeLoad: 0.45,
      frustrationLoad: 0.75,
      threatLoad: 0.15,
      rewardLoad: 0,
    };
  }
  return {
    kind: "neutral",
    valence: "neutral",
    negativeLoad: 0,
    frustrationLoad: 0,
    threatLoad: 0,
    rewardLoad: 0,
  };
}

function minutesBetween(iso?: string) {
  if (!iso) return null;
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / 60000);
}

function applyTemperamentBeforeKdm(
  userMessage: string,
  dynamicState?: DroitDynamicState,
): DroitDynamicState | undefined {
  if (!dynamicState) return dynamicState;

  const fineTune = readFineTuneProfile();
  const temperament = temperamentFromFineTune(fineTune);
  const event = classifyAppraisalEvent(userMessage);
  const relationship = dynamicState.relationship;
  const interactionCount = Math.max(0, relationship?.interactionCount || 0);
  const firstSeenAt = relationship?.firstSeenAt
    ? new Date(relationship.firstSeenAt).getTime()
    : Date.now();
  const relationshipAgeMinutes = Number.isFinite(firstSeenAt)
    ? Math.max(0, (Date.now() - firstSeenAt) / 60000)
    : 0;
  const similarEventsFromSource =
    event.valence === "negative"
      ? Math.max(0, relationship?.negativeEvents || 0)
      : event.valence === "positive"
        ? Math.max(0, relationship?.positiveEvents || 0)
        : 0;

  const appraisal = appraiseEventV0(
    {
      kind: event.kind,
      sourceId: "active-user",
      targetIsKaira: true,
      valence: event.valence,
    },
    {
      relationshipAgeMinutes,
      interactionCount,
      similarEventsFromSource,
      similarEventsRecentGlobal: similarEventsFromSource,
      distinctSourcesRecentGlobal: 1,
      minutesSinceLastSimilarEvent:
        event.valence === "negative"
          ? minutesBetween(relationship?.lastConflictAt)
          : null,
    },
  );

  const warmth = Math.max(0, Math.min(100, relationship?.warmth ?? 50));
  const trust = Math.max(0, Math.min(100, relationship?.trust ?? 50));
  const conflict = Math.max(0, Math.min(100, relationship?.conflictScore ?? 0));
  const hurt = Math.max(0, Math.min(100, relationship?.hurtScore ?? 0));
  const relationshipSafety = Math.max(
    0,
    Math.min(1, (warmth * 0.35 + trust * 0.45 - conflict * 0.1 - hurt * 0.1) / 80),
  );

  const temperamentResponse = computeTemperamentResponse(temperament, {
    negativeLoad: event.negativeLoad,
    frustrationLoad: event.frustrationLoad,
    threatLoad: event.threatLoad,
    rewardLoad:
      event.rewardLoad * (0.65 + appraisal.positivePredictionError * 0.35),
    noveltyLoad: appraisal.novelty.value,
    repetitionLoad: 1 - appraisal.novelty.value,
    relationshipSafety,
    currentStress: Math.max(0, Math.min(1, dynamicState.stress / 100)),
    minutesSinceEvent: 0,
  });

  const delta = temperamentResponse.stateDelta;
  return {
    ...dynamicState,
    anger: clamp100(dynamicState.anger + delta.anger),
    stress: clamp100(dynamicState.stress + delta.stress),
    happiness: clamp100(dynamicState.happiness + delta.happiness),
    calmness: clamp100(dynamicState.calmness + delta.calmness),
    confidence: clamp100(dynamicState.confidence + delta.confidence),
    surprise: clamp100(dynamicState.surprise + delta.surprise),
  };
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
    const temperamentAdjustedState = applyTemperamentBeforeKdm(
      userMessage,
      dynamicState,
    );
    const clientPrepMs = Math.round(performance.now() - prepStart);
    const payload = {
      sessionId,
      userId,
      userName,
      userMessage,
      character: characterInfo,
      personality,
      behaviorProfile,
      dynamicState: temperamentAdjustedState,
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
