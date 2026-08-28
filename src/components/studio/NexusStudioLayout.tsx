import React, { useState, useCallback, useEffect } from "react";
import { StudioTopBar } from "./StudioTopBar";
import { KairoChatTab } from "./tabs/KairoChatTab";
import { CharacterTab } from "./tabs/CharacterTab";
import { TestLabTab } from "./tabs/TestLabTab";
import { BrainTab } from "./tabs/BrainTab";
import { MindMapTab } from "./tabs/MindMapTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { KdmMetricsPanel } from "../common/KdmMetricsPanel";
import { KdmAutoRelationshipTestPanel } from "../common/KdmAutoRelationshipTestPanel";
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
import {
  clearKairoConversation,
  loadKairoConversation,
  saveKairoConversationMessage,
} from "../../services/kairoConversationService";
import { resetKdmTestUser } from "../../services/kdmTestResetService";
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
    [reasoningTrace, setReasoningTrace] = useState<ReasoningTrace>(
      INITIAL_REASONING_TRACE,
    ),
    [lastAnalysis, setLastAnalysis] = useState<any>(null),
    [isNewUserMode, setIsNewUserMode] = useState(false),
    [userWarmth, setUserWarmth] = useState(62),
    [lastTimings, setLastTimings] = useState<KairoTimingMetrics | null>(null),
    [lastProviderUsed, setLastProviderUsed] = useState<string | null>(null),
    [selectedTestUser, setSelectedTestUser] = useState(() =>
      typeof window === "undefined"
        ? "test_user_x"
        : localStorage.getItem("kairo_test_user_id") || "test_user_x",
    ),
    [isSaved, setIsSaved] = useState(true),
    [isSaving, setIsSaving] = useState(false),
    [isolatedConversation, setIsolatedConversation] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("kairo_test_user_id", selectedTestUser);
    setDynamicState(INITIAL_DYNAMIC_STATE);
    setReasoningTrace(INITIAL_REASONING_TRACE);
    setLastAnalysis(null);
    setLastTimings(null);
    setLastProviderUsed(null);
    setIsolatedConversation(false);
  }, [selectedTestUser]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, e, m] = await Promise.all([
          droitPersonalityService.loadKairoPersonality(),
          droitExpressionAssetService.loadExpressionAssets("kairo"),
          loadKairoConversation(100).catch(() => []),
        ]);
        if (!mounted) return;
        if (p) {
          setPersonality(p.traits);
          if (p.docId) setKairoDocId(p.docId);
        }
        setExpressionAssets(e);
        if (m.length) setMessages(m);
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
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setLastTimings(null);
    setLastProviderUsed(null);
    setReasoningTrace(INITIAL_REASONING_TRACE);
    setLastAnalysis(null);
    setIsolatedConversation(true);
    void clearKairoConversation().catch(() => {});
  }, []);
  const handleResetTestUser = useCallback(async () => {
    if (isAiLoading) return;
    await resetKdmTestUser(selectedTestUser);
    setMessages([]);
    setDynamicState(INITIAL_DYNAMIC_STATE);
    setReasoningTrace(INITIAL_REASONING_TRACE);
    setLastAnalysis(null);
    setLastTimings(null);
    setLastProviderUsed(null);
    setUserWarmth(50);
    setIsolatedConversation(true);
    await clearKairoConversation().catch(() => {});
  }, [isAiLoading, selectedTestUser]);
  const handleSendMessage = useCallback(
    async (
      userText: string,
      options?: { relationshipLevel?: RelationshipTestLevel },
    ) => {
      if (!userText.trim() || isAiLoading) return;
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
      setMessages((p) => [...p, userMsg]);
      setIsAiLoading(true);
      setLastTimings(null);
      try {
        const isRelationshipTest = Boolean(options?.relationshipLevel);
        const requestDynamicState = options?.relationshipLevel
          ? buildRelationshipTestState(dynamicState, options.relationshipLevel)
          : dynamicState;
        const response = await droitChatService.sendMessage({
          userMessage: userText.trim(),
          userId: isRelationshipTest
            ? `knt_${activeParticipant.id}_${options?.relationshipLevel}`
            : activeParticipant.id,
          userName: activeParticipant.label,
          personality,
          dynamicState: requestDynamicState,
          history: isRelationshipTest ? [] : messages,
          suppressRecentMemory: isRelationshipTest || isolatedConversation,
          characterInfo: {
            name: "KAIRO",
            roleTitle: "Sunucu Yöneticisi",
            raceName: "Sentetik Droit",
          },
        });
        if (response.dynamicState) setDynamicState(response.dynamicState);
        if (response.reasoningTrace) {
          setReasoningTrace(response.reasoningTrace);
          setUserWarmth(response.reasoningTrace.relationship.warmthScore);
        }
        if (response.timings) setLastTimings(response.timings);
        setLastProviderUsed(response.providerUsed || null);
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
        if (!isRelationshipTest) {
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
      persistMessageSafely,
      isolatedConversation,
      selectedTestUser,
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
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="shrink-0 px-3 pt-2 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                <span className="text-[10px] font-mono font-bold">
                  KİŞİYE ÖZEL İLİŞKİ TESTİ
                </span>
                <div className="flex gap-1.5">
                  {TEST_USERS.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedTestUser(u.id)}
                      className={`px-3 py-1.5 rounded-md border text-[10px] font-mono ${selectedTestUser === u.id ? "bg-indigo-500/20 border-indigo-400/50" : "border-zinc-800"}`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
              <KdmAutoRelationshipTestPanel personality={personality} />
            </div>
            <div className="flex-1 min-h-0">
              <TestLabTab
                key={selectedTestUser}
                personality={personality}
                dynamicState={dynamicState}
                expression={expression}
                onDynamicStateChange={setDynamicState}
                onExpressionChange={setExpression}
                reasoningTrace={reasoningTrace}
                onReasoningTraceChange={setReasoningTrace}
                lastAnalysis={lastAnalysis}
                onLastAnalysisChange={setLastAnalysis}
                isNewUserMode={isNewUserMode}
                onToggleNewUserMode={() => setIsNewUserMode((p) => !p)}
                userWarmth={userWarmth}
                onUserWarmthChange={setUserWarmth}
                onNavigateToBrain={() => setActiveTab("BEYİN")}
              />
            </div>
            <KdmMetricsPanel compact userId={selectedTestUser} />
          </div>
        )}{" "}
        {(activeTab === "BEYIN" || activeTab === "BEYİN") && (
          <BrainTab
            reasoningTrace={reasoningTrace}
            onReasoningTraceChange={setReasoningTrace}
            personality={personality}
            dynamicState={dynamicState}
            onDynamicStateChange={setDynamicState}
            isNewUserMode={isNewUserMode}
            onToggleNewUserMode={() => setIsNewUserMode((p) => !p)}
            userWarmth={userWarmth}
            onUserWarmthChange={setUserWarmth}
            lastAnalysis={lastAnalysis}
            onNavigateToTest={() => setActiveTab("TEST")}
            onNavigateToCharacter={() => setActiveTab("KARAKTER")}
            onResetTrace={() => setReasoningTrace(INITIAL_REASONING_TRACE)}
          />
        )}{" "}
        {activeTab === "ZIHIN" && (
          <MindMapTab
            personality={personality}
            dynamicState={dynamicState}
            reasoningTrace={reasoningTrace}
            messages={messages}
            isLoading={isAiLoading}
            timings={lastTimings}
            providerUsed={lastProviderUsed}
            participants={TEST_USERS}
            selectedParticipantId={selectedTestUser}
            onSelectParticipant={setSelectedTestUser}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onResetTestUser={handleResetTestUser}
          />
        )}{" "}
        {activeTab === "AYARLAR" && <SettingsTab />}{" "}
        {activeTab === "KAIRO" && (
          <KairoChatTab
            expression={expression}
            dynamicState={dynamicState}
            messages={messages}
            isLoading={isAiLoading}
            onSendMessage={handleSendMessage}
            participants={TEST_USERS}
            selectedParticipantId={selectedTestUser}
            onSelectParticipant={setSelectedTestUser}
          />
        )}
      </main>
    </div>
  );
};
