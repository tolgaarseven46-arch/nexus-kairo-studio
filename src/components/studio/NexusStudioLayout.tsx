import React, { useState, useCallback, useEffect, useRef } from "react";
import { StudioTopBar } from "./StudioTopBar";
import { CharacterTab } from "./tabs/CharacterTab";
import { MindMapTab } from "./tabs/MindMapTab";
import { InternalSystemsLabTab } from "./tabs/InternalSystemsLabTab";
import { SettingsTab } from "./tabs/SettingsTab";
import {
  DroitPersonalityTraits,
  DroitDynamicState,
  DroitExpressionMode,
  DroitExpressionId,
  DroitExpressionAsset,
  NexusTab,
  TestMessage,
  ReasoningTrace,
} from "../../types/nexus";
import {
  droitPersonalityService,
  DEFAULT_PERSONALITY_TRAITS,
} from "../../services/droitPersonalityService";
import { droitExpressionAssetService } from "../../services/droitExpressionAssetService";
import {
  droitChatService,
  KairoTimingMetrics,
} from "../../services/droitChatService";
import type { ResponseConsistencyResult } from "../../services/kairoResponseConsistency";
import {
  clearKairoConversation,
  loadKairoConversation,
  saveKairoConversationMessage,
} from "../../services/kairoConversationService";
import {
  clearAllKairoTestData,
  resetKdmTestUser,
} from "../../services/kdmTestResetService";
import {
  loadActiveTestSessionForUser,
  clearTestSession,
} from "../../services/kdmPersistenceService";
const INITIAL_PERSONALITY: DroitPersonalityTraits = {
  ...DEFAULT_PERSONALITY_TRAITS,
};
const INITIAL_EXPRESSIONS: Record<
  DroitExpressionId,
  DroitExpressionAsset | null
> = {
  NEUTRAL: null,
  HAPPY: null,
  PLAYFUL: null,
  SAD: null,
  ANGRY: null,
  SURPRISED: null,
  THINKING: null,
  CONFUSED: null,
};
const INITIAL_DYNAMIC_STATE: DroitDynamicState = {
  calmness: 75,
  anger: 20,
  stress: 15,
  happiness: 65,
  confidence: 85,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};
const INITIAL_MESSAGES: TestMessage[] = [
  {
    id: "msg-1",
    sender: "droit",
    text: "Merhaba. Ben Kairo (#001).",
    timestamp: "12:00",
  },
];
const INITIAL_REASONING_TRACE: ReasoningTrace = {
  whoSent: {
    userName: "Test Operatörü (Sistem)",
    isNewUser: false,
    recognitionText: "Tanınan kullanıcı",
  },
  relationship: {
    warmthScore: 62,
    warmthLabel: "Samimi / Güvenilir",
    note: "İlişki verisi hazır.",
  },
  currentMood: {
    moodText: "Sakin ve dengeli",
    reasonText: "Sistem operasyonel.",
  },
  messageInterpretation: {
    intent: "genel_sohbet",
    sentiment: "nötr",
    explanation: "Mesaj bekleniyor.",
  },
  decision: { chosenTone: "Dengeli", explanation: "KDM kararı bekleniyor." },
  memoryUpdate: {
    warmthBefore: 62,
    warmthAfter: 62,
    warmthDelta: 0,
    moodChange: "Stabil",
    reason: "Henüz yeni etkileşim yok.",
  },
};
const TEST_USERS = [
  { id: "test_user_x", label: "Mert" },
  { id: "test_user_y", label: "Ali" },
] as const;
type RelationshipTestLevel = "new" | "familiar" | "close";
const buildRelationshipTestState = (
  base: DroitDynamicState,
  level: RelationshipTestLevel,
): DroitDynamicState => {
  const now = Date.now();
  const profile =
    level === "close"
      ? { interactionCount: 80, familiarityDays: 90, warmth: 85, trust: 85 }
      : level === "familiar"
        ? { interactionCount: 20, familiarityDays: 14, warmth: 62, trust: 60 }
        : { interactionCount: 0, familiarityDays: 0, warmth: 50, trust: 50 };
  return {
    ...base,
    relationship: {
      firstSeenAt: new Date(
        now - profile.familiarityDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
      lastInteractionAt: new Date(now - 60_000).toISOString(),
      ...profile,
      positiveEvents: Math.round(profile.interactionCount * 0.35),
      negativeEvents: 0,
      conflictScore: 0,
      hurtScore: 0,
      repairProgress: 0,
      repeatedNegativeCount: 0,
    },
  };
};
export const NexusStudioLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NexusTab>("KARAKTER"),
    [personality, setPersonality] =
      useState<DroitPersonalityTraits>(INITIAL_PERSONALITY),
    [kairoDocId, setKairoDocId] = useState("kairo"),
    [expressionAssets, setExpressionAssets] = useState(INITIAL_EXPRESSIONS),
    [dynamicState, setDynamicState] = useState<DroitDynamicState>(
      INITIAL_DYNAMIC_STATE,
    ),
    [expression, setExpression] = useState<DroitExpressionMode>("NEUTRAL"),
    [messages, setMessages] = useState<TestMessage[]>(INITIAL_MESSAGES),
    [isAiLoading, setIsAiLoading] = useState(false),
    [isResettingSession, setIsResettingSession] = useState(false),
    [reasoningTrace, setReasoningTrace] = useState<ReasoningTrace>(
      INITIAL_REASONING_TRACE,
    ),
    [lastAnalysis, setLastAnalysis] =
      useState<ResponseConsistencyResult | null>(null),
    [lastTimings, setLastTimings] = useState<KairoTimingMetrics | null>(null),
    [lastProviderUsed, setLastProviderUsed] = useState<string | null>(null),
    [lastWorldStateAppraisal, setLastWorldStateAppraisal] = useState<unknown>(null),
    [lastWorldReasoningPolicy, setLastWorldReasoningPolicy] = useState<unknown>(null),
    [lastWorldMemoryGuard, setLastWorldMemoryGuard] = useState<unknown>(null),
    [lastResponsePlan, setLastResponsePlan] = useState<unknown>(null),
    [activeConversationScope, setActiveConversationScope] = useState<
      string | null
    >(null),
    [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
      if (typeof window !== "undefined") {
        return (
          localStorage.getItem("kairo_active_session_id") ||
          localStorage.getItem("kairo_active_session_test_user_x") ||
          null
        );
      }
      return null;
    }),
    [isRestoringSession, setIsRestoringSession] = useState(false),
    [selectedTestUser, setSelectedTestUser] = useState(() =>
      typeof window === "undefined"
        ? "test_user_x"
        : localStorage.getItem("kairo_test_user_id") || "test_user_x",
    ),
    [isSaved, setIsSaved] = useState(true),
    [isSaving, setIsSaving] = useState(false),
    [isolatedConversation, setIsolatedConversation] = useState(false);
  const restoreGenerationRef = useRef(0);

  // Restore Active Test Session from Firestore whenever participant changes or on mount
  useEffect(() => {
    let isCurrent = true;
    const generation = ++restoreGenerationRef.current;
    const restoreIsCurrent = () =>
      isCurrent && generation === restoreGenerationRef.current;

    async function hydrateSession() {
      if (typeof window !== "undefined") {
        localStorage.setItem("kairo_test_user_id", selectedTestUser);
      }
      setIsRestoringSession(true);

      try {
        const restored = await loadActiveTestSessionForUser(selectedTestUser);
        if (!restoreIsCurrent()) return;

        if (restored && restored.turns && restored.turns.length > 0) {
          setMessages(restored.messages);
          if (restored.lastDynamicState) {
            setDynamicState(restored.lastDynamicState);
          }
          if (restored.lastReasoningTrace) {
            setReasoningTrace(restored.lastReasoningTrace);
          }
          if (restored.lastConsistency) {
            setLastAnalysis(restored.lastConsistency);
          }
          if (restored.lastTimings) {
            setLastTimings(restored.lastTimings);
          }
          if (restored.lastProviderUsed) {
            setLastProviderUsed(restored.lastProviderUsed);
          }
          setLastWorldStateAppraisal(restored.lastWorldStateAppraisal ?? null);
          setLastWorldReasoningPolicy(restored.lastWorldReasoningPolicy ?? null);
          setLastWorldMemoryGuard(restored.lastWorldMemoryGuard ?? null);
          setLastResponsePlan(restored.lastResponsePlan ?? null);
          setActiveConversationScope(restored.summary.userId);
          setActiveSessionId(restored.summary.sessionId);
          setIsolatedConversation(false);

          if (typeof window !== "undefined") {
            localStorage.setItem("kairo_active_session_id", restored.summary.sessionId);
            localStorage.setItem(`kairo_active_session_${selectedTestUser}`, restored.summary.sessionId);
          }
          setIsRestoringSession(false);
          return;
        }
      } catch (err) {
        console.warn("[NexusStudioLayout] Failed to restore test session:", err);
      }

      if (!restoreIsCurrent()) return;
      setDynamicState(INITIAL_DYNAMIC_STATE);
      setReasoningTrace(INITIAL_REASONING_TRACE);
      setLastAnalysis(null);
      setLastTimings(null);
      setLastProviderUsed(null);
    setLastWorldStateAppraisal(null);
    setLastWorldReasoningPolicy(null);
    setLastWorldMemoryGuard(null);
    setLastResponsePlan(null);
      setMessages([]);
      setActiveConversationScope(null);
      setActiveSessionId(null);
      setIsolatedConversation(false);
      setIsRestoringSession(false);
    }

    hydrateSession();

    return () => {
      isCurrent = false;
    };
  }, [selectedTestUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, e] = await Promise.all([
          droitPersonalityService.loadKairoPersonality(),
          droitExpressionAssetService.loadExpressionAssets("kairo"),
        ]);
        if (!mounted) return;
        if (p) {
          setPersonality(p.traits);
          if (p.docId) setKairoDocId(p.docId);
        }
        setExpressionAssets(e);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const handlePersonalityChange = (
    partial: Partial<DroitPersonalityTraits>,
  ) => {
    setPersonality((p) => ({ ...p, ...partial }));
    setIsSaved(false);
  };
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await droitPersonalityService.saveKairoPersonality(
        personality,
        kairoDocId,
      );
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };
  const persistMessageSafely = useCallback(async (m: TestMessage) => {
    try {
      await saveKairoConversationMessage(m);
    } catch {}
  }, []);
  const handleResetTestUser = useCallback(async () => {
    if (isAiLoading || isResettingSession) return;

    const sessionToClear = activeSessionId;
    const scopeToReset = activeConversationScope || selectedTestUser;

    // Invalidate an in-flight Firestore restore before clearing the UI. Otherwise
    // a late restore response can repopulate the just-reset conversation.
    restoreGenerationRef.current += 1;
    setIsRestoringSession(false);
    setIsResettingSession(true);

    // Reset the visible test state immediately. Firestore cleanup can take a few
    // seconds, but the user should never need F5 to see a fresh session.
    setMessages([]);
    setDynamicState(INITIAL_DYNAMIC_STATE);
    setReasoningTrace(INITIAL_REASONING_TRACE);
    setLastAnalysis(null);
    setLastTimings(null);
    setLastProviderUsed(null);
    setLastWorldStateAppraisal(null);
    setLastWorldReasoningPolicy(null);
    setLastWorldMemoryGuard(null);
    setLastResponsePlan(null);
    setIsolatedConversation(true);
    setActiveConversationScope(null);
    setActiveSessionId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("kairo_active_session_id");
      localStorage.removeItem(`kairo_active_session_${selectedTestUser}`);
    }

    try {
      await Promise.allSettled([
        sessionToClear
          ? clearTestSession(sessionToClear)
          : Promise.resolve(),
        resetKdmTestUser(scopeToReset),
        clearKairoConversation(),
      ]);
    } finally {
      setIsResettingSession(false);
    }
  }, [
    activeConversationScope,
    activeSessionId,
    isAiLoading,
    isResettingSession,
    selectedTestUser,
  ]);
  const handleClearAllTestData = useCallback(async () => {
    if (isAiLoading || isResettingSession) return;
    if (activeSessionId) {
      await clearTestSession(activeSessionId).catch(() => {});
    }
    await clearAllKairoTestData();
    setMessages([]);
    setDynamicState(INITIAL_DYNAMIC_STATE);
    setReasoningTrace(INITIAL_REASONING_TRACE);
    setLastAnalysis(null);
    setLastTimings(null);
    setLastProviderUsed(null);
    setLastWorldStateAppraisal(null);
    setLastWorldReasoningPolicy(null);
    setLastWorldMemoryGuard(null);
    setLastResponsePlan(null);
    setActiveConversationScope(null);
    setActiveSessionId(null);
    setIsolatedConversation(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem("kairo_active_session_id");
      for (const user of TEST_USERS) {
        localStorage.removeItem(`kairo_active_session_${user.id}`);
      }
    }
  }, [activeSessionId, isAiLoading, isResettingSession]);
  const handleSendMessage = useCallback(
    async (
      userText: string,
      options?: { relationshipLevel?: RelationshipTestLevel },
    ) => {
      if (!userText.trim() || isAiLoading || isResettingSession) return;
      const activeParticipant =
        TEST_USERS.find((user) => user.id === selectedTestUser) ??
        TEST_USERS[0];
      const userMsg: TestMessage = {
        id: `msg-${Date.now()}`,
        sender: "user",
        text: userText.trim(),
        participantId: activeParticipant.id,
        participantName: activeParticipant.label,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      const relationshipLevel = options?.relationshipLevel;
      const conversationScope = relationshipLevel
        ? `knt_${activeParticipant.id}_${relationshipLevel}`
        : activeParticipant.id;
      const continuesCurrentConversation =
        activeConversationScope === conversationScope ||
        Boolean(activeSessionId);
      setMessages((p) =>
        continuesCurrentConversation ? [...p, userMsg] : [userMsg],
      );
      setIsAiLoading(true);
      setLastTimings(null);
      try {
        const requestDynamicState =
          relationshipLevel && !continuesCurrentConversation
            ? buildRelationshipTestState(dynamicState, relationshipLevel)
            : dynamicState;
        const response = await droitChatService.sendMessage({
          userMessage: userText.trim(),
          userId: conversationScope,
          userName: activeParticipant.label,
          personality,
          dynamicState: requestDynamicState,
          history: continuesCurrentConversation ? messages : [],
          suppressRecentMemory:
            !continuesCurrentConversation || isolatedConversation,
          characterInfo: {
            name: "KAIRO",
            roleTitle: "Sunucu Yöneticisi",
            raceName: "Sentetik Droit",
          },
          sessionId: activeSessionId || undefined,
        });
        if (response.dynamicState) setDynamicState(response.dynamicState);
        if (response.reasoningTrace) {
          setReasoningTrace(response.reasoningTrace);
        }
        if (response.timings) setLastTimings(response.timings);
        setLastAnalysis(response.consistency ?? null);
        setLastProviderUsed(response.providerUsed || null);
        setLastWorldStateAppraisal(response.worldStateAppraisal ?? null);
        setLastWorldReasoningPolicy(response.worldReasoningPolicy ?? null);
        setLastWorldMemoryGuard(response.worldMemoryGuard ?? null);
        setLastResponsePlan(response.responsePlan ?? null);
        setActiveConversationScope(conversationScope);
        if (response.sessionId) {
          setActiveSessionId(response.sessionId);
          if (typeof window !== "undefined") {
            localStorage.setItem("kairo_active_session_id", response.sessionId);
            localStorage.setItem(
              `kairo_active_session_${activeParticipant.id}`,
              response.sessionId,
            );
          }
        }
        setIsolatedConversation(false);
        const dm: TestMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "droit",
          text: response.reply,
          replyToParticipantId: activeParticipant.id,
          replyToParticipantName: activeParticipant.label,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((p) => [...p, dm]);
        if (!relationshipLevel) {
          void persistMessageSafely(userMsg);
          void persistMessageSafely(dm);
        }
      } catch (e: any) {
        setMessages((p) => [
          ...p,
          {
            id: `err-${Date.now()}`,
            sender: "droit",
            text: `[Hata]: ${e?.message || "Bağlantı kurulamadı"}`,
            replyToParticipantId: activeParticipant.id,
            replyToParticipantName: activeParticipant.label,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } finally {
        setIsAiLoading(false);
      }
    },
    [
      personality,
      dynamicState,
      messages,
      isAiLoading,
      isResettingSession,
      persistMessageSafely,
      isolatedConversation,
      selectedTestUser,
      activeConversationScope,
      activeSessionId,
    ],
  );
  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans">
      <StudioTopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSave={handleSave}
        isSaved={isSaved}
        isSaving={isSaving}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "KARAKTER" && (
          <CharacterTab
            personality={personality}
            dynamicState={dynamicState}
            expression={expression}
            onExpressionChange={setExpression}
            expressionAssets={expressionAssets}
            onPersonalityChange={handlePersonalityChange}
            onSave={handleSave}
            isSaved={isSaved}
            isSaving={isSaving}
          />
        )}{" "}
        {activeTab === "TEST" && (
          <MindMapTab
            personality={personality}
            dynamicState={dynamicState}
            reasoningTrace={reasoningTrace}
            messages={messages}
            isLoading={isAiLoading || isResettingSession}
            timings={lastTimings}
            providerUsed={lastProviderUsed}
            consistency={lastAnalysis}
            worldStateAppraisal={lastWorldStateAppraisal}
            worldReasoningPolicy={lastWorldReasoningPolicy}
            worldMemoryGuard={lastWorldMemoryGuard}
            responsePlan={lastResponsePlan}
            participants={TEST_USERS}
            selectedParticipantId={selectedTestUser}
            activeSessionId={activeSessionId}
            isRestoring={isRestoringSession}
            onSelectParticipant={setSelectedTestUser}
            onSendMessage={handleSendMessage}
            onResetTestUser={handleResetTestUser}
            onClearAllTestData={handleClearAllTestData}
          />
        )}{" "}
        {activeTab === "IC_SISTEMLER" && <InternalSystemsLabTab />}{" "}
        {activeTab === "AYARLAR" && <SettingsTab />}
      </main>
    </div>
  );
};