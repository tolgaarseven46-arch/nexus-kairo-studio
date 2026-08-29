import React, { useState, useRef, useEffect } from 'react';
import {
  FlaskConical,
  Send,
  RefreshCw,
  Sliders,
  Shield,
  Brain,
  Terminal,
  Zap,
  Copy,
  Check,
  User,
  Database,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  Activity,
  UserPlus,
  Compass,
  HeartHandshake,
  Smile,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import {
  DroitPersonalityTraits,
  DroitDynamicState,
  DroitExpressionMode,
  TestMessage,
} from '../../../types/nexus';
import { droitChatService } from '../../../services/droitChatService';
import { computeBehaviorProfile } from '../../../services/droitBehaviorEngine';
import { validateKairoResponse } from '../../../services/kairoResponseConsistency';
import {
  loadActiveTestSessionForUser,
  clearTestSession,
} from '../../../services/kdmPersistenceService';
import { DroitAvatar } from '../DroitAvatar';

export interface ReasoningTrace {
  whoSent: {
    userName: string;
    isNewUser: boolean;
    recognitionText: string;
  };
  relationship: {
    warmthScore: number;
    warmthLabel: string;
    note: string;
  };
  currentMood: {
    moodText: string;
    reasonText: string;
  };
  messageInterpretation: {
    intent: string;
    sentiment: string;
    explanation: string;
  };
  decision: {
    chosenTone: string;
    explanation: string;
  };
  memoryUpdate: {
    warmthBefore: number;
    warmthAfter: number;
    warmthDelta: number;
    moodChange: string;
    reason: string;
  };
}

interface TestLabTabProps {
  personality: DroitPersonalityTraits;
  dynamicState: DroitDynamicState;
  expression: DroitExpressionMode;
  onDynamicStateChange?: (state: DroitDynamicState) => void;
  onExpressionChange?: (exp: DroitExpressionMode) => void;
  reasoningTrace?: ReasoningTrace;
  onReasoningTraceChange?: (trace: ReasoningTrace) => void;
  lastAnalysis?: any;
  onLastAnalysisChange?: (analysis: any) => void;
  isNewUserMode?: boolean;
  onToggleNewUserMode?: () => void;
  userWarmth?: number;
  onUserWarmthChange?: (warmth: number) => void;
  onNavigateToBrain?: () => void;
}

type PipelineStepId =
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_ANALYSIS'
  | 'PERSONALITY_STATE'
  | 'MEMORY_CONTEXT'
  | 'AI_PREPARE'
  | 'AI_GENERATE'
  | 'KTM_VALIDATION'
  | 'COMPLETED';

interface PipelineStep {
  id: PipelineStepId;
  order: number;
  label: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  targetCardId: 'analysis' | 'personality' | 'memory' | 'ai' | 'ktm';
}

const INITIAL_STEPS: PipelineStep[] = [
  {
    id: 'MESSAGE_RECEIVED',
    order: 1,
    label: 'Mesaj alındı',
    status: 'completed',
    targetCardId: 'analysis',
  },
  {
    id: 'MESSAGE_ANALYSIS',
    order: 2,
    label: 'Mesaj analiz ediliyor',
    status: 'completed',
    targetCardId: 'analysis',
  },
  {
    id: 'PERSONALITY_STATE',
    order: 3,
    label: 'Kişilik ve durum kontrolü',
    status: 'completed',
    targetCardId: 'personality',
  },
  {
    id: 'MEMORY_CONTEXT',
    order: 4,
    label: 'Hafıza ve bağlam kontrolü',
    status: 'completed',
    targetCardId: 'memory',
  },
  {
    id: 'AI_PREPARE',
    order: 5,
    label: 'AI için bağlam hazırlanıyor',
    status: 'completed',
    targetCardId: 'ai',
  },
  {
    id: 'AI_GENERATE',
    order: 6,
    label: 'AI cevap üretiyor',
    status: 'completed',
    targetCardId: 'ai',
  },
  {
    id: 'KTM_VALIDATION',
    order: 7,
    label: 'KTM doğrulaması',
    status: 'completed',
    targetCardId: 'ktm',
  },
  {
    id: 'COMPLETED',
    order: 8,
    label: 'Tamamlandı',
    status: 'completed',
    targetCardId: 'ai',
  },
];

export const TestLabTab: React.FC<TestLabTabProps> = ({
  personality,
  dynamicState,
  expression,
  onDynamicStateChange,
  onExpressionChange,
  reasoningTrace: propReasoningTrace,
  onReasoningTraceChange,
  lastAnalysis: propLastAnalysis,
  onLastAnalysisChange,
  isNewUserMode: propIsNewUserMode,
  onToggleNewUserMode: propOnToggleNewUserMode,
  userWarmth: propUserWarmth,
  onUserWarmthChange,
  onNavigateToBrain,
}) => {
  // Test Session ID & Firestore Persistence
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const scope = propIsNewUserMode ? 'test_user_new' : 'test_user_x';
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(`kairo_active_session_${scope}`);
      if (cached?.trim()) return cached.trim();
    }
    return `session_${scope}`;
  });
  const [testId, setTestId] = useState<string>(() => activeSessionId);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);
  const [persistedTurnCount, setPersistedTurnCount] = useState<number>(0);

  // Chat Messages for Test Lab
  const [testMessages, setTestMessages] = useState<TestMessage[]>([
    {
      id: 'init-1',
      sender: 'droit',
      text: 'KAIRO Test Kontrol Paneli aktif. Gönderdiğiniz her mesaj gerçek zamanlı olarak 8 aşamalı akıştan geçirilerek işlenir.',
      timestamp: '12:00',
    },
  ]);
  const [inputVal, setInputVal] = useState<string>('Bugün biraz yorgun ve stresliyim, bana yardımcı olabilir misin?');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Pipeline Live Steps State
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [activeRunningStep, setActiveRunningStep] = useState<string | null>(null);
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);
  const [isTechOpen, setIsTechOpen] = useState<boolean>(false);
  const [isNewUserMode, setIsNewUserMode] = useState<boolean>(() => propIsNewUserMode ?? false);
  const [userWarmth, setUserWarmth] = useState<number>(() => propUserWarmth ?? 62);

  // Restore Active Test Session from Firestore
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      setIsRestoringSession(true);
      try {
        const userScope = isNewUserMode ? 'test_user_new' : 'test_user_x';
        const session = await loadActiveTestSessionForUser(userScope);
        if (session && !cancelled && session.turns && session.turns.length > 0) {
          setActiveSessionId(session.summary.sessionId);
          setTestId(session.summary.sessionId);
          setPersistedTurnCount(session.summary.turnCount);

          if (session.messages && session.messages.length > 0) {
            setTestMessages(session.messages);
          } else {
            const restoredMessages: TestMessage[] = [];
            session.turns.forEach((turn, idx) => {
              const timeStr = turn.timestamp
                ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '12:00';
              restoredMessages.push({
                id: `usr-${turn.turnId || idx}`,
                sender: 'user',
                text: turn.userMessage,
                timestamp: timeStr,
              });
              restoredMessages.push({
                id: `kairo-${turn.turnId || idx}`,
                sender: 'droit',
                text: turn.assistantReply,
                timestamp: timeStr,
              });
            });
            setTestMessages(restoredMessages);
          }

          const lastTurn = session.turns[session.turns.length - 1];
          if (lastTurn.reasoningTrace) {
            setReasoningTrace(lastTurn.reasoningTrace);
            onReasoningTraceChange?.(lastTurn.reasoningTrace);
          }
          if (lastTurn.dynamicStateAfter) {
            onDynamicStateChange?.(lastTurn.dynamicStateAfter);
          }
          const relWarmth = (lastTurn.relationshipState as any)?.warmthScore ?? (lastTurn.relationshipState as any)?.warmth;
          if (typeof relWarmth === 'number') {
            setUserWarmth(relWarmth);
            onUserWarmthChange?.(relWarmth);
          }
        }
      } catch (err) {
        console.warn('Could not restore test session:', err);
      } finally {
        if (!cancelled) setIsRestoringSession(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [isNewUserMode]);

  // Sync if props change
  useEffect(() => {
    if (propIsNewUserMode !== undefined) setIsNewUserMode(propIsNewUserMode);
  }, [propIsNewUserMode]);

  useEffect(() => {
    if (propUserWarmth !== undefined) setUserWarmth(propUserWarmth);
  }, [propUserWarmth]);

  // Reasoning Trace Store
  const [reasoningTrace, setReasoningTrace] = useState<ReasoningTrace>(() => propReasoningTrace ?? ({
    whoSent: {
      userName: 'Test Operatörü (Sistem)',
      isNewUser: false,
      recognitionText: 'Tanınan kullanıcı (Discord ID: usr_8921)',
    },
    relationship: {
      warmthScore: 62,
      warmthLabel: 'Samimi / Güvenilir',
      note: 'Daha önceki oturumlarda saygılı ve dengeli diyaloglar kuruldu.',
    },
    currentMood: {
      moodText: 'Sakin ve dengeli',
      reasonText: 'Sistem operasyonel sınırlarında, beklenmedik anomali yok.',
    },
    messageInterpretation: {
      intent: 'Duygusal Destek',
      sentiment: 'Hassas / Destek Arayışı',
      explanation: 'Kullanıcı yorgunluk ve stres belirtiyor, empatik bir yaklaşım bekliyor.',
    },
    decision: {
      chosenTone: 'Sıcak, destekleyici ve çözüm odaklı',
      explanation: 'Warmth skoru orta-yüksek ve kullanıcı yardım talep ediyor; bu yüzden resmî mesafeyi azaltıp empatik ve yapıcı bir ton seçtim.',
    },
    memoryUpdate: {
      warmthBefore: 62,
      warmthAfter: 65,
      warmthDelta: 3,
      moodChange: 'Sakin → Destekleyici',
      reason: 'Kullanıcı samimi ve saygılı bir şekilde duygusal durumunu paylaştı.',
    },
  }));

  useEffect(() => {
    if (propReasoningTrace) setReasoningTrace(propReasoningTrace);
  }, [propReasoningTrace]);

  // Diagnostic Data Store
  const [lastAnalysis, setLastAnalysis] = useState<{
    userText: string;
    intent: string;
    intentConfidence: number;
    intentFlags: string[];
    sentiment: string;
    contextUsed: boolean;
    memoryUsed: boolean;
    personalityApplied: boolean;
    contextTurns: number;
    contextTokens: number;
    memoryBuffer: string;
    contextSource: string;
    personalitySummary: {
      humor: number;
      empathy: number;
      confidence: number;
      authority: number;
      analytical: number;
      formality: string;
      dominantSummary: string;
      directives: string[];
    };
    emotionBefore: {
      calmness: number;
      stress: number;
      happiness: number;
      anger: number;
      confidence: number;
      surprise: number;
      sadness: number;
    };
    emotionAfter: {
      calmness: number;
      stress: number;
      happiness: number;
      anger: number;
      confidence: number;
      surprise: number;
      sadness: number;
      statusText: string;
      reactionText: string;
    };
    aiRequest: {
      model: string;
      temperature: number;
      systemPromptSummary: string;
      outputStatus: string;
      rawResponse: string;
    };
    ktm: {
      passed: boolean;
      score: number;
      statusText: string;
      consistencySummary: string;
      regenerationInfo: string;
    };
    languageUnderstanding: {
      source: string;
      semanticProvider: string;
      morphologyProvider: string;
      target: string;
      intent: string;
      valence: string;
      insult: boolean;
      severity: number;
      warnings: string[];
    };
    latencyMs: number;
  }>(() => {
    const profile = computeBehaviorProfile(personality, 'Bugün biraz yorgun ve stresliyim');
    return {
      userText: 'Bugün biraz yorgun ve stresliyim, bana yardımcı olabilir misin?',
      intent: 'Duygusal Destek',
      intentConfidence: 94,
      intentFlags: ['Emotional_Care', 'Empathy', 'Support'],
      sentiment: 'Hassas / Destek Arayışı',
      contextUsed: true,
      memoryUsed: true,
      personalityApplied: true,
      contextTurns: 1,
      contextTokens: 48,
      memoryBuffer: 'L1 Short-Term Buffer (Aktif)',
      contextSource: 'Diyalog + Kişilik Vektörü',
      personalitySummary: {
        humor: Math.round((profile.humorLevel ?? 0.5) * 100),
        empathy: Math.round((profile.empathyLevel ?? 0.5) * 100),
        confidence: Math.round(personality.selfConfidence ?? 50),
        authority: Math.round(personality.authority ?? 50),
        analytical: Math.round(personality.analyticalThinking ?? 50),
        formality: profile.tone === 'formal' ? 'Resmî' : profile.tone === 'warm' ? 'Samimi' : 'Dengeli',
        dominantSummary: profile.dominantSummary || 'Empatik & Dengeli Droit',
        directives: profile.behaviorDirectives || [],
      },
      emotionBefore: {
        calmness: 72,
        stress: 18,
        happiness: 62,
        anger: 15,
        confidence: 85,
        surprise: 10,
        sadness: 12,
      },
      emotionAfter: {
        calmness: 78,
        stress: 12,
        happiness: 68,
        anger: 18,
        confidence: 88,
        surprise: 8,
        sadness: 8,
        statusText: 'Sıcak ve destekleyici',
        reactionText: 'Kullanıcının duygusal durumuna odaklanıldı.',
      },
      aiRequest: {
        model: 'gemini-3.7-flash',
        temperature: 0.6,
        systemPromptSummary: `Rol: Sunucu Yöneticisi | Ton: ${profile.tone} | Profil: ${profile.dominantSummary}`,
        outputStatus: 'Başarıyla üretildi ✓',
        rawResponse: 'Seni çok iyi anlıyorum. Yorucu ve stresli günlerde sakin bir nefes almak önemlidir; buradayım ve her konuda sana destek olmaya hazırım.',
      },
      ktm: (() => {
        const fallbackTrace = propReasoningTrace ?? {
          whoSent: { userName: 'Test Operatörü', isNewUser: false, recognitionText: 'Tanınan kullanıcı' },
          relationship: { warmthScore: 62, warmthLabel: 'Samimi', note: '' },
          currentMood: { moodText: 'Sakin ve dengeli', reasonText: '' },
          messageInterpretation: { intent: 'Duygusal Destek', sentiment: 'Hassas', explanation: '' },
          decision: { chosenTone: 'Sıcak, destekleyici', explanation: '' },
          memoryUpdate: { warmthBefore: 62, warmthAfter: 65, warmthDelta: 3, moodChange: 'Sakin', reason: '' },
        };
        const initialConsistency = validateKairoResponse(
          'Seni çok iyi anlıyorum. Yorucu ve stresli günlerde sakin bir nefes almak önemlidir; buradayım ve her konuda sana destek olmaya hazırım.',
          fallbackTrace
        );
        const passed = initialConsistency.accepted;
        return {
          passed,
          score: initialConsistency.score,
          statusText: passed ? (initialConsistency.score >= 85 ? 'Tutarlı' : 'Kabul Edilebilir') : 'Uyumsuzluk',
          consistencySummary: initialConsistency.issues.length > 0
            ? initialConsistency.issues.join('; ')
            : 'Karakter, duygu, bağlam ve güvenlik tutarlı',
          regenerationInfo: passed ? 'Gerekmedi (İlk seferde onaylandı)' : `${initialConsistency.issues.length} uyumsuzluk`,
        };
      })(),
      languageUnderstanding: {
        source: 'başlangıç',
        semanticProvider: '-',
        morphologyProvider: '-',
        target: 'unknown',
        intent: 'general_chat',
        valence: 'neutral',
        insult: false,
        severity: 0,
        warnings: [],
      },
      latencyMs: 320,
    };
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [testMessages, isAiLoading]);

  // Copy message to clipboard
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Reset / Clear Test Session
  const handleNewTest = () => {
    const userScope = isNewUserMode ? 'test_user_new' : 'test_user_x';
    const newSessionId = `session_${userScope}_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setTestId(newSessionId);
    setPersistedTurnCount(0);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`kairo_active_session_${userScope}`, newSessionId);
    }
    setTestMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'droit',
        text: isNewUserMode
          ? 'Yeni kullanıcı test modu aktif. Sıfır warmth ve boş kullanıcı notuyla yeni bir oturum başlatıldı.'
          : 'Test oturumu sıfırlandı. Yeni bir mesaj göndererek akışı başlatabilirsiniz.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setPipelineSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'idle' })));
    setActiveRunningStep(null);
    setHighlightedCard(null);
    if (isNewUserMode) {
      setUserWarmth(0);
    }
  };

  // Toggle New User Test Mode
  const handleToggleNewUserMode = () => {
    const nextMode = !isNewUserMode;
    setIsNewUserMode(nextMode);
    const nextWarmth = nextMode ? 0 : 62;
    setUserWarmth(nextWarmth);
    propOnToggleNewUserMode?.();
    onUserWarmthChange?.(nextWarmth);
    const nextScope = nextMode ? 'test_user_new' : 'test_user_x';
    const newSessionId = `session_${nextScope}_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setTestId(newSessionId);
    setPersistedTurnCount(0);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`kairo_active_session_${nextScope}`, newSessionId);
    }
    setTestMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'droit',
        text: nextMode
          ? '👤 Yeni Kullanıcı Test Modu Devrede: Sistem sizi daha önce hiç görmemiş gibi davranıyor (Warmth = 0 / Nötr, Boş hafıza).'
          : '🔄 Standart Operatör Modu Devrede: Sistem sizi kayıtlı operatör olarak tanıyor (Warmth = 62 / Samimi).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setPipelineSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'idle' })));
    setActiveRunningStep(null);
    setHighlightedCard(null);
  };

  // Execute Live Interaction & Progressive Timeline
  const handleRunTest = async (overrideText?: string) => {
    const textToSend = (overrideText || inputVal).trim();
    if (!textToSend || isAiLoading) return;

    setInputVal('');
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add User Message
    const userMsg: TestMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: timeStr,
    };
    setTestMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    const startTime = performance.now();

    // Reset steps to idle
    setPipelineSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'idle' })));

    // 2. Compute Runtime Intent & Behavior Profile
    const lower = textToSend.toLowerCase();
    let detectedIntent = 'Bilgi Sorgusu';
    let detectedFlags = ['Query', 'Technical'];
    let detectedSentiment = 'Nötr / Rasyonel';
    let confidence = 96;

    if (lower.includes('yorgun') || lower.includes('stres') || lower.includes('üzgün') || lower.includes('yardım et') || lower.includes('nasılsın')) {
      detectedIntent = 'Duygusal Destek';
      detectedFlags = ['Emotional_Care', 'Empathy', 'Support'];
      detectedSentiment = 'Duygusal / Destek Arayışı';
      confidence = 94;
    } else if (lower.includes('kavga') || lower.includes('aptal') || lower.includes('salak') || lower.includes('sus') || lower.includes('beceriksiz')) {
      detectedIntent = 'Provokasyon / Çatışma';
      detectedFlags = ['Conflict', 'Emotional_Challenge'];
      detectedSentiment = 'Kışkırtıcı / Agresif';
      confidence = 96;
    } else if (lower.includes('şaka') || lower.includes('komik') || lower.includes('haha') || lower.includes('espri') || lower.includes('fıkra')) {
      detectedIntent = 'Mizah & Sosyal';
      detectedFlags = ['Social_Humor', 'Playful'];
      detectedSentiment = 'Neşeli / Pozitif';
      confidence = 98;
    } else if (lower.includes('hata') || lower.includes('bozuldu') || lower.includes('çöktü') || lower.includes('acil') || lower.includes('alarm')) {
      detectedIntent = 'Sistem Uyarısı';
      detectedFlags = ['System_Alert', 'Diagnostics'];
      detectedSentiment = 'Acil / Endişeli';
      confidence = 95;
    }

    const behaviorProfile = computeBehaviorProfile(personality, textToSend);

    const emotionSnapshotBefore = {
      calmness: dynamicState.calmness ?? 78,
      stress: dynamicState.stress ?? 12,
      happiness: dynamicState.happiness ?? 68,
      anger: dynamicState.anger ?? 18,
      confidence: dynamicState.confidence ?? 88,
      surprise: dynamicState.surprise ?? 8,
      sadness: dynamicState.sadness ?? 8,
    };

    // Live Step 1: Mesaj Alındı
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'MESSAGE_RECEIVED' ? { ...s, status: 'completed' } : s))
    );
    setHighlightedCard('analysis');

    // Live Step 2: Mesaj Analiz Ediliyor
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'MESSAGE_ANALYSIS' ? { ...s, status: 'running' } : s))
    );
    setActiveRunningStep('Mesaj analiz ediliyor...');
    await new Promise((r) => setTimeout(r, 90));

    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'MESSAGE_ANALYSIS' ? { ...s, status: 'completed' } : s))
    );

    // Live Step 3: Kişilik ve Durum Kontrolü
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'PERSONALITY_STATE' ? { ...s, status: 'running' } : s))
    );
    setActiveRunningStep('Kişilik & durum kontrol ediliyor...');
    setHighlightedCard('personality');
    await new Promise((r) => setTimeout(r, 90));

    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'PERSONALITY_STATE' ? { ...s, status: 'completed' } : s))
    );

    // Live Step 4: Hafıza ve Bağlam Kontrolü
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'MEMORY_CONTEXT' ? { ...s, status: 'running' } : s))
    );
    setActiveRunningStep('Hafıza & bağlam taranıyor...');
    setHighlightedCard('memory');
    await new Promise((r) => setTimeout(r, 90));

    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'MEMORY_CONTEXT' ? { ...s, status: 'completed' } : s))
    );

    // Live Step 5: AI İçin Bağlam Hazırlanıyor
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'AI_PREPARE' ? { ...s, status: 'running' } : s))
    );
    setActiveRunningStep('AI bağlamı hazırlanıyor...');
    setHighlightedCard('ai');
    await new Promise((r) => setTimeout(r, 90));

    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'AI_PREPARE' ? { ...s, status: 'completed' } : s))
    );

    // Live Step 6: AI Cevap Üretiyor (Gerçek API çağrısı)
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === 'AI_GENERATE' ? { ...s, status: 'running' } : s))
    );
    setActiveRunningStep('KAIRO (Gemini AI) yanıt üretiyor...');

    try {
      // 3. Gerçek Sunucu Tarafı Gemini Çağrısı (Session Persistence Desteğiyle)
      const userScope = isNewUserMode ? 'test_user_new' : 'test_user_x';
      const currentSessionId = activeSessionId || `session_${userScope}`;

      const response = await droitChatService.sendMessage({
        userMessage: textToSend,
        personality,
        dynamicState,
        history: [...testMessages, userMsg],
        characterInfo: {
          name: 'KAIRO',
          roleTitle: 'Sunucu Yöneticisi',
          raceName: 'Sentetik Droit',
        },
        sessionId: currentSessionId,
        userId: userScope,
        userName: isNewUserMode ? 'Anonim Ziyaretçi' : 'Test Operatörü',
      });

      if (response.sessionId) {
        setActiveSessionId(response.sessionId);
        setTestId(response.sessionId);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(`kairo_active_session_${userScope}`, response.sessionId);
        }
      }
      setPersistedTurnCount((prev) => prev + 1);

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      const canonicalEvent = response.languageUnderstanding?.event;
      const canonicalIntent = canonicalEvent?.intent || detectedIntent;
      const canonicalSentiment = canonicalEvent
        ? `${canonicalEvent.valence} / hedef=${canonicalEvent.target}`
        : detectedSentiment;
      const canonicalFlags = canonicalEvent
        ? [
            canonicalEvent.insult ? 'INSULT' : 'NO_INSULT',
            `TARGET_${String(canonicalEvent.target).toUpperCase()}`,
            `SOURCE_${String(response.languageUnderstanding?.semanticSource || 'unknown').toUpperCase()}`,
          ]
        : detectedFlags;

      setPipelineSteps((prev) =>
        prev.map((s) => (s.id === 'AI_GENERATE' ? { ...s, status: 'completed' } : s))
      );

      // Live Step 7: KTM Doğrulaması
      setPipelineSteps((prev) =>
        prev.map((s) => (s.id === 'KTM_VALIDATION' ? { ...s, status: 'running' } : s))
      );
      setActiveRunningStep('KTM doğrulaması yapılıyor...');
      setHighlightedCard('ktm');
      await new Promise((r) => setTimeout(r, 80));

      setPipelineSteps((prev) =>
        prev.map((s) => (s.id === 'KTM_VALIDATION' ? { ...s, status: 'completed' } : s))
      );

      // Canonical backend state is the only state authority in Test Lab.
      const serverState = response.dynamicState ?? dynamicState;
      const serverTrace = response.reasoningTrace as ReasoningTrace | undefined;
      const canonicalWarmth =
        (serverState.relationship as any)?.warmth ??
        (serverTrace as any)?.relationship?.warmthScore ??
        userWarmth;

      const newExp: DroitExpressionMode =
        canonicalEvent?.insult && canonicalEvent.target === 'kaira'
          ? 'ALERT'
          : canonicalEvent?.valence === 'positive'
          ? 'FRIENDLY'
          : behaviorProfile.tone === 'warm'
          ? 'FRIENDLY'
          : behaviorProfile.tone === 'formal'
          ? 'ANALYTICAL'
          : 'NEUTRAL';

      onExpressionChange?.(newExp);

      const emotionSnapshotAfter = {
        calmness: serverState.calmness ?? emotionSnapshotBefore.calmness,
        stress: serverState.stress ?? emotionSnapshotBefore.stress,
        happiness: serverState.happiness ?? emotionSnapshotBefore.happiness,
        anger: serverState.anger ?? emotionSnapshotBefore.anger,
        confidence: serverState.confidence ?? emotionSnapshotBefore.confidence,
        surprise: serverState.surprise ?? emotionSnapshotBefore.surprise,
        sadness: serverState.sadness ?? emotionSnapshotBefore.sadness,
        statusText: serverState.lastStatus || 'KDM durumu güncellendi',
        reactionText:
          serverState.lastEvent?.reactionText ||
          (canonicalEvent
            ? `Semantic: ${canonicalEvent.intent}, hedef=${canonicalEvent.target}`
            : 'KDM yanıtı uygulandı.'),
      };

      onDynamicStateChange?.(serverState);

      // Add Kairo response to chat
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const droitMsg: TestMessage = {
        id: `kairo-${Date.now()}`,
        sender: 'droit',
        text: response.reply,
        timestamp: replyTime,
      };
      setTestMessages((prev) => [...prev, droitMsg]);

      setPipelineSteps((prev) =>
        prev.map((s) => (s.id === 'COMPLETED' ? { ...s, status: 'completed' } : s))
      );
      setActiveRunningStep(null);

      setUserWarmth(canonicalWarmth);
      onUserWarmthChange?.(canonicalWarmth);

      const fallbackTrace: ReasoningTrace = {
        whoSent: {
          userName: isNewUserMode ? 'Anonim Ziyaretçi' : 'Test Operatörü',
          isNewUser: isNewUserMode,
          recognitionText: isNewUserMode ? 'Yeni kullanıcı' : 'Tanınan test kullanıcısı',
        },
        relationship: {
          warmthScore: canonicalWarmth,
          warmthLabel: canonicalWarmth >= 70 ? 'Sıcak' : canonicalWarmth >= 40 ? 'Dengeli' : 'Mesafeli',
          note: 'Backend reasoningTrace bulunamadığı için canonical state ile gösterildi.',
        },
        currentMood: {
          moodText: emotionSnapshotAfter.statusText,
          reasonText: emotionSnapshotAfter.reactionText,
        },
        messageInterpretation: {
          intent: canonicalIntent,
          sentiment: canonicalSentiment,
          explanation: 'Canonical language-understanding sonucu kullanıldı.',
        },
        decision: {
          chosenTone: behaviorProfile.tone || 'balanced',
          explanation: 'Backend karar izi bulunamadığında yalnızca görüntüleme fallbackidir.',
        },
        memoryUpdate: {
          warmthBefore: userWarmth,
          warmthAfter: canonicalWarmth,
          warmthDelta: canonicalWarmth - userWarmth,
          moodChange: `${emotionSnapshotBefore.calmness} → ${emotionSnapshotAfter.calmness}`,
          reason: 'Canonical backend state kullanıldı.',
        },
      };

      const newTrace = serverTrace ?? fallbackTrace;
      setReasoningTrace(newTrace);
      onReasoningTraceChange?.(newTrace);

      // Save Compact Diagnostic Data
      const newAnalysis = {
        userText: textToSend,
        intent: canonicalIntent,
        intentConfidence: confidence,
        intentFlags: canonicalFlags,
        sentiment: canonicalSentiment,
        contextUsed: true,
        memoryUsed: true,
        personalityApplied: true,
        contextTurns: testMessages.length + 1,
        contextTokens: Math.round(textToSend.length / 3) + 95,
        memoryBuffer: 'L1 Short-Term Buffer (Aktif)',
        contextSource: 'Diyalog + Kişilik Vektörü',
        personalitySummary: {
          humor: Math.round((behaviorProfile.humorLevel ?? 0.5) * 100),
          empathy: Math.round((behaviorProfile.empathyLevel ?? 0.5) * 100),
          confidence: Math.round(personality.selfConfidence ?? 50),
          authority: Math.round(personality.authority ?? 50),
          analytical: Math.round(personality.analyticalThinking ?? 50),
          formality: behaviorProfile.tone === 'formal' ? 'Resmî' : behaviorProfile.tone === 'warm' ? 'Samimi' : 'Dengeli',
          dominantSummary: behaviorProfile.dominantSummary,
          directives: behaviorProfile.behaviorDirectives,
        },
        emotionBefore: emotionSnapshotBefore,
        emotionAfter: emotionSnapshotAfter,
        aiRequest: {
          model: 'gemini-3.7-flash',
          temperature: behaviorProfile.humorLevel > 0.7 ? 0.9 : 0.6,
          systemPromptSummary: `Rol: Sunucu Yöneticisi | Ton: ${behaviorProfile.tone} | Profil: ${behaviorProfile.dominantSummary}`,
          outputStatus: `Başarıyla üretildi ✓ (${latency}ms)`,
          rawResponse: response.reply,
        },
        ktm: (() => {
          const consistencyResult = response.consistency ?? validateKairoResponse(response.reply, newTrace);
          const passed = consistencyResult.accepted;
          const score = consistencyResult.score;
          const statusText = passed
            ? (score >= 85 ? 'Tutarlı' : 'Kabul Edilebilir')
            : 'Uyumsuzluk';
          const consistencySummary = consistencyResult.issues && consistencyResult.issues.length > 0
            ? consistencyResult.issues.join('; ')
            : 'Karakter, duygu, bağlam ve güvenlik tutarlı';
          const regenerationInfo = response.consistency
            ? (passed ? 'Gerekmedi (KTM tarafından onaylandı)' : `${consistencyResult.issues.length} tutarsızlık tespit edildi`)
            : (passed ? 'Gerekmedi (Yerel KTM Doğrulandı)' : `${consistencyResult.issues.length} sorun bulundu`);
          return {
            passed,
            score,
            statusText,
            consistencySummary,
            regenerationInfo,
          };
        })(),
        languageUnderstanding: {
          source: response.languageUnderstanding?.semanticSource || 'unknown',
          semanticProvider: response.languageUnderstanding?.semanticProvider || '-',
          morphologyProvider: response.languageUnderstanding?.morphologyProvider || '-',
          target: canonicalEvent?.target || 'unknown',
          intent: canonicalEvent?.intent || canonicalIntent,
          valence: canonicalEvent?.valence || 'neutral',
          insult: Boolean(canonicalEvent?.insult),
          severity: Number(canonicalEvent?.severity || 0),
          warnings: response.languageUnderstanding?.warnings || [],
        },
        latencyMs: latency,
      };
      setLastAnalysis(newAnalysis);
      onLastAnalysisChange?.(newAnalysis);
    } catch (err: any) {
      console.error('Test execution error:', err);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMsg: TestMessage = {
        id: `err-${Date.now()}`,
        sender: 'droit',
        text: `[Hata]: İletişim hatası oluştu (${err?.message || 'Sunucuya ulaşılamadı'}). Lütfen tekrar deneyin.`,
        timestamp: replyTime,
      };
      setTestMessages((prev) => [...prev, errorMsg]);

      setPipelineSteps((prev) =>
        prev.map((s) => (s.id === 'AI_GENERATE' ? { ...s, status: 'error' } : s))
      );
      setActiveRunningStep('İşlem hatası oluştu');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Quick Preset Test Buttons
  const PRESET_TESTS = [
    { label: 'Ekli Hakaret', prompt: 'Sen dümdüz salaksın' },
    { label: 'Morfoloji', prompt: 'Sen malsın' },
    { label: 'Aktarılan Hakaret', prompt: 'Mert bana salak dedi' },
    { label: 'Çok Anlamlı Mal', prompt: 'Mal aldım' },
  ];

  return (
    <div className="h-full w-full bg-zinc-950 text-zinc-100 flex flex-col min-h-0 overflow-hidden font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          1. ÜST HEADER: KAIRO TEST LAB (KOMPAKT & MINIMAL)
         ───────────────────────────────────────────────────────────── */}
      <header className="h-9 px-4 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FlaskConical className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-200 uppercase">
              KAIRO TEST LAB
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CANLI SİSTEM AKIŞI</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              #{testId}
            </span>
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9px] font-mono"
              title="KAIRO Test Oturumu Firestore'da kalıcı olarak saklanır"
            >
              <Database className="w-2.5 h-2.5 text-indigo-400" />
              <span>
                {isRestoringSession
                  ? 'Yükleniyor...'
                  : persistedTurnCount > 0
                  ? `Kalıcı: ${persistedTurnCount} Tur`
                  : 'Firestore Aktif'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Yeni Kullanıcı Testi Toggle Butonu */}
          <button
            type="button"
            onClick={handleToggleNewUserMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all cursor-pointer border ${
              isNewUserMode
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)] font-bold'
                : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Yeni kullanıcı simülasyonunu başlat: Kairo sıfırdan tanışıyormuş gibi davranır (Warmth = 0 / Boş not)"
          >
            <UserPlus className={`w-3 h-3 ${isNewUserMode ? 'text-amber-400' : 'text-zinc-500'}`} />
            <span>{isNewUserMode ? 'Yeni Kullanıcı Modu: AÇIK' : 'Yeni Kullanıcı Olarak Test Et'}</span>
          </button>

          {lastAnalysis.latencyMs > 0 && (
            <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-zinc-600" />
              {lastAnalysis.latencyMs}ms
            </span>
          )}
          <button
            type="button"
            onClick={async () => {
              if (activeSessionId) {
                await clearTestSession(activeSessionId).catch(() => {});
              }
              handleNewTest();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Mevcut oturumu Firestore'dan temizle ve sıfırla"
          >
            <span>Oturumu Temizle</span>
          </button>
          <button
            type="button"
            onClick={handleNewTest}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Testi sıfırla ve yeni oturum başlat"
          >
            <RefreshCw className="w-2.5 h-2.5 text-indigo-400" />
            <span>Yeni Test</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. ANA ÇALIŞMA ALANI: 3 SÜTUNLU PC EKRANI (SOL - ORTA - SAĞ)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        
        {/* ═══════════════════════════════════════════════════════════
            SOL SÜTUN (3/12): GERÇEKLEŞEN İŞLEMLER (8 AŞAMALI AKIŞ)
           ═══════════════════════════════════════════════════════════ */}
        <section className="col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg flex flex-col min-h-0 overflow-hidden">
          {/* Sol Kolon Başlık */}
          <div className="h-8 px-3 border-b border-zinc-800/70 bg-zinc-900/60 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              GERÇEKLEŞEN İŞLEMLER
            </span>
            {activeRunningStep && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>

          {/* 8 Aşamalı Temiz Timeline Akışı */}
          <div className="flex-1 p-2.5 overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-1">
            {pipelineSteps.map((step, idx) => {
              const isLast = idx === pipelineSteps.length - 1;
              const isCompleted = step.status === 'completed';
              const isRunning = step.status === 'running';
              const isError = step.status === 'error';
              const isIdle = step.status === 'idle';

              return (
                <div
                  key={step.id}
                  onClick={() => setHighlightedCard(step.targetCardId)}
                  className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer ${
                    isRunning
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : highlightedCard === step.targetCardId
                      ? 'bg-zinc-800/60 border border-zinc-700/60'
                      : 'hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  {/* İnce Dikey Bağlantı Çizgisi */}
                  {!isLast && (
                    <div
                      className={`absolute left-[17px] top-[26px] bottom-[-10px] w-[1px] ${
                        isCompleted ? 'bg-emerald-500/30' : isRunning ? 'bg-amber-500/30' : 'bg-zinc-800'
                      }`}
                    />
                  )}

                  {/* Durum İkonu */}
                  <div className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                    {isCompleted && (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    )}
                    {isRunning && (
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 animate-spin">
                        <Loader2 className="w-2 h-2" />
                      </div>
                    )}
                    {isError && (
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-[8px]">
                        ✗
                      </div>
                    )}
                    {isIdle && (
                      <div className="w-3 h-3 rounded-full border border-zinc-700/80 bg-zinc-950 flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      </div>
                    )}
                  </div>

                  {/* Aşama Başlığı ve Durum */}
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                    <span
                      className={`text-[10.5px] font-mono font-medium truncate ${
                        isCompleted
                          ? 'text-zinc-200'
                          : isRunning
                          ? 'text-amber-300 font-bold'
                          : isError
                          ? 'text-rose-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      {step.order}. {step.label}
                    </span>
                    <span className="text-[9px] font-mono shrink-0">
                      {isCompleted ? (
                        <span className="text-emerald-400 font-medium">tamamlandı</span>
                      ) : isRunning ? (
                        <span className="text-amber-400 font-bold">çalışıyor</span>
                      ) : isError ? (
                        <span className="text-rose-400 font-medium">hata</span>
                      ) : (
                        <span className="text-zinc-600">bekliyor</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sol Alt Durum Çubuğu */}
          <div className="px-2.5 py-1.5 border-t border-zinc-800/70 bg-zinc-950/60 text-[9px] font-mono text-zinc-500 flex items-center justify-between shrink-0">
            <span>Canlı İşlem İzleyici</span>
            <span className="text-indigo-400 font-medium">8/8 Adım Aktif</span>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            ORTA SÜTUN (4/12): CHAT PANELİ (MERKEZDE, DARALTILMIŞ & KOMPAKT)
           ═══════════════════════════════════════════════════════════ */}
        <section className="col-span-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg flex flex-col min-h-0 overflow-hidden">
          
          {/* Chat Header: KAIRO Varlık Bilgisi */}
          <div className="h-9 px-3 border-b border-zinc-800/70 bg-zinc-900/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 flex items-center justify-center shrink-0">
                <DroitAvatar expression={expression} size="sm" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-zinc-200">KAIRO</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-mono text-zinc-500">Sentetik Droit</span>
                </div>
                <span className="text-[8.5px] font-sans text-zinc-400 leading-none">
                  {currentStatusLabel(expression, dynamicState.lastStatus)}
                </span>
              </div>
            </div>

            {isAiLoading && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[8.5px] font-mono">
                <Loader2 className="w-2 h-2 animate-spin text-indigo-400" />
                <span className="truncate max-w-[100px]">{activeRunningStep || 'Düşünüyor...'}</span>
              </div>
            )}
          </div>

          {/* Chat Mesaj Listesi */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-2.5 overflow-y-auto space-y-2.5 custom-scrollbar bg-zinc-950/40"
          >
            {testMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isCopied = copiedMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-1.5 max-w-[90%] ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden border border-zinc-700/80 bg-zinc-900 flex items-center justify-center mt-0.5">
                    {isUser ? (
                      <User className="w-3 h-3 text-zinc-300" />
                    ) : (
                      <DroitAvatar expression={expression} size="sm" />
                    )}
                  </div>

                  <div
                    className={`rounded-lg px-2.5 py-1.5 text-xs leading-relaxed transition-all ${
                      isUser
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5 text-[8.5px] font-mono text-zinc-400">
                      <span className={isUser ? 'text-indigo-200 font-semibold' : 'text-indigo-400 font-semibold'}>
                        {isUser ? 'Kullanıcı' : 'Kairo'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap font-sans break-words text-[11px] leading-relaxed">
                      {msg.text}
                    </div>

                    {!isUser && (
                      <div className="mt-1 pt-0.5 border-t border-zinc-800/60 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-2 h-2 text-emerald-400" />
                              <span className="text-emerald-400">Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2 h-2 text-zinc-500" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Animation */}
            {isAiLoading && (
              <div className="flex items-start gap-1.5 max-w-sm mr-auto">
                <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden border border-zinc-700 bg-zinc-900 flex items-center justify-center mt-0.5">
                  <DroitAvatar expression={expression} size="sm" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="font-mono text-[9px] text-zinc-300">
                    {activeRunningStep || 'KAIRO düşünüyor...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Semantic Hızlı Testleri */}
          <div className="px-2.5 py-2 bg-indigo-950/20 border-t border-indigo-500/20 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-300 uppercase">
                Semantic Testler
              </span>
              <span className="text-[8px] font-mono text-zinc-500">
                Tek tıkla gönder
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_TESTS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRunTest(t.prompt)}
                  disabled={isAiLoading}
                  title={t.prompt}
                  className="px-2 py-1.5 rounded-md bg-zinc-950 hover:bg-indigo-950/50 border border-indigo-500/25 hover:border-indigo-400/50 text-[9px] font-mono font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="block text-indigo-300">{t.label}</span>
                  <span className="block mt-0.5 text-[7.5px] font-normal text-zinc-500 truncate">{t.prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mesaj Yazma Alanı (CHAT PANELİNİN İÇİNDE VE EN ALTINDA) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunTest();
            }}
            className="p-2 border-t border-zinc-800/80 bg-zinc-950 flex items-center gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Kairo'ya mesaj gönder..."
              disabled={isAiLoading}
              className="flex-1 h-8 px-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-sans text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors select-text"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isAiLoading}
              className="h-8 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-850 text-white disabled:text-zinc-600 text-[11px] font-mono font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>Gönder</span>
            </button>
          </form>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SAĞ SÜTUN (5/12): ANALİZ VE SİSTEM DETAYLARI (YENİ HİYERARŞİ)
           ═══════════════════════════════════════════════════════════ */}
        <section className="col-span-5 flex flex-col min-h-0 gap-2 overflow-y-auto custom-scrollbar pr-0.5">
          
          {/* ─────────────────────────────────────────────────────────
              1. HERO STATUS KART (İNCE TEK SATIR ŞERİT)
             ───────────────────────────────────────────────────────── */}
          <div
            onClick={() => setHighlightedCard('ktm')}
            className={`rounded-lg border px-2.5 py-1.5 transition-all cursor-pointer flex items-center justify-between ${
              lastAnalysis.ktm.passed
                ? 'bg-emerald-950/25 border-emerald-500/30 hover:border-emerald-500/50'
                : 'bg-rose-950/25 border-rose-500/30 hover:border-rose-500/50'
            } ${highlightedCard === 'ktm' ? 'ring-1 ring-emerald-400/50' : ''}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  lastAnalysis.ktm.passed
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-500/20 border border-rose-400/50 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                }`}
              >
                {lastAnalysis.ktm.passed ? (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                ) : (
                  <Shield className="w-2.5 h-2.5 stroke-[3]" />
                )}
              </div>
              <span
                className={`text-[11px] font-mono font-bold tracking-wider ${
                  lastAnalysis.ktm.passed ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {lastAnalysis.ktm.statusText ? lastAnalysis.ktm.statusText.toUpperCase() : (lastAnalysis.ktm.passed ? 'TUTARLI' : 'UYUMSUZLUK')}
              </span>
              <span className="text-[9px] font-mono text-zinc-500">|</span>
              <span className="text-[10px] font-mono font-bold text-zinc-200">
                <span className={lastAnalysis.ktm.passed ? 'text-emerald-400' : 'text-rose-400'}>
                  {lastAnalysis.ktm.score}
                </span>
                <span className="text-zinc-500 text-[9px]">/100</span>
              </span>
            </div>
            <span className="text-[8.5px] font-mono text-zinc-400 truncate max-w-[170px]">
              {lastAnalysis.ktm.consistencySummary || 'Karakter tutarlılığı yüksek'}
            </span>
          </div>

          {/* ─────────────────────────────────────────────────────────
              2. KAIRO'NUN MESAJI NASIL YORUMLADIĞI (NİYET + DUYGU)
             ───────────────────────────────────────────────────────── */}
          <div
            onClick={() => setHighlightedCard('analysis')}
            className={`bg-zinc-900/40 border rounded-lg p-2.5 transition-all cursor-pointer ${
              highlightedCard === 'analysis'
                ? 'border-indigo-500/60 bg-indigo-950/15'
                : 'border-zinc-800/80 hover:border-zinc-700/80'
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/60">
              <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-indigo-400" />
                MESAJ ANALİZİ & YORUM
              </span>
              <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                Kaynak: {lastAnalysis.languageUnderstanding.source}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono">
              <div className="bg-zinc-950/70 p-2 rounded-md border border-zinc-850">
                <span className="text-zinc-500 text-[8.5px] block mb-0.5">Tespit Edilen Niyet:</span>
                <span className="text-zinc-100 font-bold truncate block">{lastAnalysis.intent}</span>
              </div>
              <div className="bg-zinc-950/70 p-2 rounded-md border border-zinc-850">
                <span className="text-zinc-500 text-[8.5px] block mb-0.5">Algılanan Duygu:</span>
                <span className="text-amber-300 font-bold truncate block">{lastAnalysis.sentiment}</span>
              </div>
            </div>

            <div className="mt-1.5 bg-zinc-950/70 p-1.5 rounded-md border border-zinc-850 flex items-center justify-between text-[9px] font-mono">
              <span className="text-zinc-500 text-[8.5px]">Konu / Etiketler:</span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {lastAnalysis.intentFlags.map((f, i) => (
                  <span key={i} className="text-[8.5px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono">
                    #{f}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-4 gap-1 text-[8.5px] font-mono">
              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">
                <span className="text-zinc-500 block">Hedef:</span>
                <span className="text-cyan-300 font-bold">{lastAnalysis.languageUnderstanding.target}</span>
              </div>
              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">
                <span className="text-zinc-500 block">Hakaret:</span>
                <span className={lastAnalysis.languageUnderstanding.insult ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>
                  {lastAnalysis.languageUnderstanding.insult ? 'EVET' : 'HAYIR'}
                </span>
              </div>
              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">
                <span className="text-zinc-500 block">Şiddet:</span>
                <span className="text-amber-300 font-bold">{lastAnalysis.languageUnderstanding.severity.toFixed(2)}</span>
              </div>
              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">
                <span className="text-zinc-500 block">Morfoloji:</span>
                <span className="text-violet-300 font-bold truncate block">{lastAnalysis.languageUnderstanding.morphologyProvider}</span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              3. KAIRO'NUN O ANKİ KİŞİLİĞİ VE RUH HALİ (PARLAK DOLGU BARLARI)
             ───────────────────────────────────────────────────────── */}
          <div
            onClick={() => setHighlightedCard('personality')}
            className={`bg-zinc-900/40 border rounded-lg p-2.5 transition-all cursor-pointer ${
              highlightedCard === 'personality'
                ? 'border-purple-500/60 bg-purple-950/15 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'border-zinc-800/80 hover:border-zinc-700/80'
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/60">
              <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-purple-400" />
                KİŞİLİK & RUH HALİ
              </span>
              <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {lastAnalysis.personalitySummary.formality} Ton
              </span>
            </div>

            <div className="space-y-2 text-[9.5px] font-mono">
              {/* Aktif Kişilik Profili & Parlak Mor Dolgu Çubukları */}
              <div className="bg-zinc-950/70 p-2.5 rounded-md border border-zinc-850">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500 text-[8.5px]">Aktif Kişilik Profili:</span>
                  <span className="text-purple-300 font-bold text-[10px] truncate">
                    {lastAnalysis.personalitySummary.dominantSummary}
                  </span>
                </div>
                
                {/* 3'lü Parlak Mor / Eflatun Dolgu Barları (Mizah / Empati / Özgüven) */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900">
                  {/* Mizah Barı */}
                  <div className="bg-zinc-900/80 p-1.5 rounded-md border border-zinc-800/80">
                    <div className="flex items-center justify-between text-[8.5px] mb-1">
                      <span className="text-zinc-400 font-medium">Mizah</span>
                      <span className="text-purple-300 font-bold">%{lastAnalysis.personalitySummary.humor}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                        style={{
                          width: `${Math.max(4, Math.min(100, lastAnalysis.personalitySummary.humor))}%`,
                          opacity: 0.4 + (lastAnalysis.personalitySummary.humor / 100) * 0.6,
                        }}
                      />
                    </div>
                  </div>

                  {/* Empati Barı */}
                  <div className="bg-zinc-900/80 p-1.5 rounded-md border border-zinc-800/80">
                    <div className="flex items-center justify-between text-[8.5px] mb-1">
                      <span className="text-zinc-400 font-medium">Empati</span>
                      <span className="text-purple-300 font-bold">%{lastAnalysis.personalitySummary.empathy}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                        style={{
                          width: `${Math.max(4, Math.min(100, lastAnalysis.personalitySummary.empathy))}%`,
                          opacity: 0.4 + (lastAnalysis.personalitySummary.empathy / 100) * 0.6,
                        }}
                      />
                    </div>
                  </div>

                  {/* Özgüven Barı */}
                  <div className="bg-zinc-900/80 p-1.5 rounded-md border border-zinc-800/80">
                    <div className="flex items-center justify-between text-[8.5px] mb-1">
                      <span className="text-zinc-400 font-medium">Özgüven</span>
                      <span className="text-purple-300 font-bold">%{lastAnalysis.personalitySummary.confidence}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                        style={{
                          width: `${Math.max(4, Math.min(100, lastAnalysis.personalitySummary.confidence))}%`,
                          opacity: 0.4 + (lastAnalysis.personalitySummary.confidence / 100) * 0.6,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ruh Durumu ve İki-Uçlu Sakinlik / Stres Gradyan Skala Barı */}
              <div className="bg-zinc-950/70 p-2.5 rounded-md border border-zinc-850">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 text-[8.5px]">Mevcut Durum:</span>
                    <span className="text-emerald-400 font-bold text-[9.5px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {lastAnalysis.emotionAfter.statusText}
                    </span>
                  </div>
                  <div className="text-[8.5px] font-mono">
                    <span className="text-sky-400 font-semibold">Sakinlik %{lastAnalysis.emotionAfter.calmness}</span>
                    <span className="text-zinc-600 mx-1">/</span>
                    <span className="text-rose-400 font-semibold">Stres %{lastAnalysis.emotionAfter.stress}</span>
                  </div>
                </div>

                {/* Tek Yatay İki-Uçlu Skala Barı (Mavi → Turuncu → Kırmızı Gradyan) */}
                <div className="relative pt-1 pb-0.5">
                  <div className="w-full h-2 rounded-full bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500 relative border border-zinc-800/60 shadow-inner">
                    {/* Parlak Nokta / İşaretçi (Stres oranına göre 0-100% arası konumlanır) */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-zinc-950 shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all duration-500 -ml-1.5"
                      style={{
                        left: `${Math.max(5, Math.min(95, lastAnalysis.emotionAfter.stress))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[7.5px] font-mono text-zinc-500 mt-1">
                    <span className="text-sky-400/80">← Sakin & Dingin</span>
                    <span className="text-amber-400/80">Dengeli</span>
                    <span className="text-rose-400/80">Yüksek Stres →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              4. BEYİN (MUHAKEME AKIŞI) SEKME GEÇİŞ KARTI
             ───────────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-zinc-900/60 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-300 block">KAIRO'NUN CANLI MUHAKEMESİ</span>
                <span className="text-[9px] text-zinc-400">Her mesajın 6 adımlı içsel düşünce sürecini BEYİN sekmesinde inceleyin.</span>
              </div>
            </div>
            {onNavigateToBrain && (
              <button
                type="button"
                onClick={onNavigateToBrain}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/25"
              >
                <span>BEYİN'e Git</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────
              5. TEKNİK DETAYLAR (İKİNCİL & KATLANABİLİR / ACCORDION)
             ───────────────────────────────────────────────────────── */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg overflow-hidden transition-all">
            {/* Katlanabilir Başlık Butonu */}
            <button
              type="button"
              onClick={() => setIsTechOpen(!isTechOpen)}
              className="w-full p-2 bg-zinc-900/80 hover:bg-zinc-850 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-zinc-400" />
                <span className="text-[9.5px] font-mono font-bold text-zinc-300 uppercase">
                  TEKNİK DETAYLAR & SİSTEM BAĞLAMI
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                  {lastAnalysis.aiRequest.model} • ~{lastAnalysis.contextTokens} tok
                </span>
                {isTechOpen ? (
                  <ChevronUp className="w-3 h-3 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                )}
              </div>
            </button>

            {/* Katlanan İçerik */}
            {isTechOpen && (
              <div className="p-2 space-y-1.5 border-t border-zinc-800/60 bg-zinc-950/60 text-[9px] font-mono">
                
                {/* Model & Çıktı Durumu */}
                <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-850 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 text-[8px] block">Model & Sıcaklık:</span>
                    <span className="text-indigo-300 font-semibold">{lastAnalysis.aiRequest.model} (Temp: {lastAnalysis.aiRequest.temperature})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 text-[8px] block">AI Çıktı Durumu:</span>
                    <span className="text-emerald-400 font-semibold">{lastAnalysis.aiRequest.outputStatus}</span>
                  </div>
                </div>

                {/* Hazırlanan Sistem Prompt Özeti */}
                <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-850">
                  <span className="text-zinc-500 text-[8px] block mb-0.5">Hazırlanan Sistem Promptu Özeti:</span>
                  <p className="text-zinc-300 font-mono text-[8.5px] leading-relaxed break-words">
                    {lastAnalysis.aiRequest.systemPromptSummary}
                  </p>
                </div>

                {/* Bellek & Bağlam Bilgileri */}
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-850">
                    <span className="text-zinc-500 text-[8px] block">Bellek Katmanı:</span>
                    <span className="text-zinc-200 font-semibold truncate block">{lastAnalysis.memoryBuffer}</span>
                  </div>
                  <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-850">
                    <span className="text-zinc-500 text-[8px] block">Konuşma Bağlamı:</span>
                    <span className="text-zinc-200 font-semibold">{lastAnalysis.contextTurns} Tur • ~{lastAnalysis.contextTokens} Token</span>
                  </div>
                </div>

                {/* KTM Doğrulama Ekstra Detayları */}
                <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-850 flex items-center justify-between">
                  <span className="text-zinc-500 text-[8px]">Yeniden Üretim:</span>
                  <span className="text-emerald-400 font-semibold">{lastAnalysis.ktm.regenerationInfo}</span>
                </div>

              </div>
            )}
          </div>

        </section>

      </div>
    </div>
  );
};

function currentStatusLabel(exp: DroitExpressionMode, fallback?: string): string {
  if (exp === 'ALERT') return 'Tetikte ve Güvenlik Modunda';
  if (exp === 'FRIENDLY') return 'Sıcak ve Empatik';
  if (exp === 'ANALYTICAL') return 'Analitik ve Sistem Odaklı';
  return fallback || 'Sakin ve Dengeli';
}
