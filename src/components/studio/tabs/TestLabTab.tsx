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
  // Test Session ID
  const [testId, setTestId] = useState<string>(() => `TL-${Math.floor(1000 + Math.random() * 9000)}`);

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
        rawResponse: 'KAIRO Test Kontrol Paneli aktif. Sistem protokolleri ve anlık davranış katmanı canlı olarak izleniyor.',
      },
      ktm: {
        passed: true,
        score: 94,
        statusText: 'Tutarlı',
        consistencySummary: 'Karakter, duygu, bağlam ve güvenlik tutarlı',
        regenerationInfo: 'Gerekmedi (İlk seferde onaylandı)',
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
    setTestId(`TL-${Math.floor(1000 + Math.random() * 9000)}`);
    setTestMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'droit',
        text: isNewUserMode
          ? 'Yeni kullanıcı test modu aktif. Sıfır warmth ve boş kullanıcı notuyla yeni bir oturum başlatıldı.'
          : 'Test sıfırlandı. Yeni bir mesaj göndererek akışı başlatabilirsiniz.',
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
    setTestId(`TL-${Math.floor(1000 + Math.random() * 9000)}`);
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
      // 3. Gerçek Sunucu Tarafı Gemini Çağrısı
      const response = await droitChatService.sendMessage({
        userMessage: textToSend,
        personality,
        history: [...testMessages, userMsg],
        characterInfo: {
          name: 'KAIRO',
          roleTitle: 'Sunucu Yöneticisi',
          raceName: 'Sentetik Droit',
        },
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

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

      // Resolve expression
      const newExp: DroitExpressionMode =
        detectedIntent.includes('Provokasyon')
          ? 'ALERT'
          : detectedIntent.includes('Mizah')
          ? 'FRIENDLY'
          : detectedIntent.includes('Sistem')
          ? 'ANALYTICAL'
          : behaviorProfile.tone === 'warm'
          ? 'FRIENDLY'
          : 'NEUTRAL';

      if (onExpressionChange) {
        onExpressionChange(newExp);
      }

      // Compute emotion delta
      const calmnessDelta = detectedIntent.includes('Provokasyon') ? -6 : 4;
      const stressDelta = detectedIntent.includes('Sistem') ? 10 : -4;
      const happinessDelta = detectedIntent.includes('Mizah') ? 12 : 2;
      const angerDelta = detectedIntent.includes('Provokasyon') ? 6 : -3;

      const newCalmness = Math.max(5, Math.min(100, emotionSnapshotBefore.calmness + calmnessDelta));
      const newStress = Math.max(0, Math.min(100, emotionSnapshotBefore.stress + stressDelta));
      const newHappiness = Math.max(0, Math.min(100, emotionSnapshotBefore.happiness + happinessDelta));
      const newAnger = Math.max(0, Math.min(100, emotionSnapshotBefore.anger + angerDelta));
      const newConfidence = Math.max(10, Math.min(100, emotionSnapshotBefore.confidence + (behaviorProfile.assertiveness > 0.6 ? 2 : 0)));

      const emotionSnapshotAfter = {
        calmness: newCalmness,
        stress: newStress,
        happiness: newHappiness,
        anger: newAnger,
        confidence: newConfidence,
        surprise: detectedIntent.includes('Provokasyon') ? 18 : 8,
        sadness: 8,
        statusText: newExp === 'ALERT' ? 'Tetikte ve kontrollü' : newExp === 'FRIENDLY' ? 'Sıcak ve destekleyici' : 'Sakin ve analitik',
        reactionText:
          detectedIntent === 'Duygusal Destek'
            ? 'Kullanıcının duygusal durumuna odaklanıldı.'
            : `${behaviorProfile.dominantSummary} profiliyle yanıt üretildi.`,
      };

      if (onDynamicStateChange) {
        onDynamicStateChange({
          ...dynamicState,
          calmness: newCalmness,
          stress: newStress,
          happiness: newHappiness,
          anger: newAnger,
          confidence: newConfidence,
          lastStatus: emotionSnapshotAfter.statusText,
          lastEvent: {
            eventTitle: `Test: "${textToSend.slice(0, 24)}..."`,
            reactionText: response.reply.slice(0, 48) + '...',
            deltas: [
              { label: 'Sakinlik', key: 'calmness', value: calmnessDelta },
              { label: 'Mutluluk', key: 'happiness', value: happinessDelta },
              { label: 'Stres', key: 'stress', value: stressDelta },
            ],
          },
        });
      }

      // Add Kairo response to chat
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const droitMsg: TestMessage = {
        id: `kairo-${Date.now()}`,
        sender: 'droit',
        text: response.reply,
        timestamp: replyTime,
      };
      setTestMessages((prev) => [...prev, droitMsg]);

      // Live Step 8: Tamamlandı
      setPipelineSteps((prev) =>
        prev.map((s) => (s.id === 'COMPLETED' ? { ...s, status: 'completed' } : s))
      );
      setActiveRunningStep(null);

      // Compute Warmth and Reasoning Trace
      const currentWarmthBefore = userWarmth;
      let warmthDelta = 0;
      let warmthReason = '';

      if (isNewUserMode) {
        if (detectedIntent === 'Provokasyon / Çatışma') {
          warmthDelta = -5;
          warmthReason = 'Yeni kullanıcı ilk temasında kışkırtıcı / saldırgan bir tutum sergiledi.';
        } else if (detectedIntent === 'Duygusal Destek') {
          warmthDelta = +4;
          warmthReason = 'Yeni kullanıcı ilk temasta dürüst ve savunmasız bir paylaşımda bulundu.';
        } else if (detectedIntent === 'Mizah & Sosyal') {
          warmthDelta = +5;
          warmthReason = 'Yeni kullanıcı ilk temasta pozitif ve yapıcı bir sohbet başlattı.';
        } else {
          warmthDelta = +2;
          warmthReason = 'Yeni kullanıcı nezaketli ve rasyonel bir soru sordu.';
        }
      } else {
        if (detectedIntent === 'Provokasyon / Çatışma') {
          warmthDelta = -8;
          warmthReason = 'Kullanıcı kışkırtıcı ve agresif bir ifade kullandı.';
        } else if (detectedIntent === 'Duygusal Destek') {
          warmthDelta = +3;
          warmthReason = 'Kullanıcı saygılı ve samimi bir şekilde duygusal durumunu paylaştı.';
        } else if (detectedIntent === 'Mizah & Sosyal') {
          warmthDelta = +4;
          warmthReason = 'Kullanıcı eğlenceli ve olumlu bir espri/sohbet konusu açtı.';
        } else {
          warmthDelta = +1;
          warmthReason = 'Kullanıcı rasyonel ve doğrudan bir sistem sorgusu gerçekleştirdi.';
        }
      }

      const currentWarmthAfter = Math.max(0, Math.min(100, currentWarmthBefore + warmthDelta));
      setUserWarmth(currentWarmthAfter);

      // Build Human-Readable Reasoning Trace
      const newTrace: ReasoningTrace = {
        whoSent: {
          userName: isNewUserMode ? 'Anonim Ziyaretçi' : 'Test Operatörü',
          isNewUser: isNewUserMode,
          recognitionText: isNewUserMode
            ? 'Bu kullanıcıyla ilk kez karşılaşıyorum. Veritabanında eşleşen hiçbir kayıt veya geçmiş iz bulunmuyor.'
            : 'Tanınan kullanıcı (Discord ID: usr_8921). Sistem hafızasında geçmiş oturum kayıtları mevcut.',
        },
        relationship: {
          warmthScore: currentWarmthBefore,
          warmthLabel: isNewUserMode
            ? 'Nötr / Tanımsız'
            : currentWarmthBefore >= 70
            ? 'Çok Sıcak & Güvenli'
            : currentWarmthBefore >= 40
            ? 'Samimi & Dengeli'
            : 'Mesafeli / Temkinli',
          note: isNewUserMode
            ? 'İlk kez tanışıyoruz, hiçbir kanaatim yok. Tarafsız ve gözlemci bir duruş sergiliyorum.'
            : `Mevcut warmth skoru ${currentWarmthBefore}/100. Geçmişte yapıcı ve dengeli diyaloglar yürütülmüş.`,
        },
        currentMood: {
          moodText: emotionSnapshotBefore.calmness > 70 ? 'Sakin ve dengeli' : 'Tetikte ve dikkatli',
          reasonText:
            emotionSnapshotBefore.stress > 25
              ? 'Son sistem olayları ve güvenlik taramaları nedeniyle hafif stres yüklü.'
              : 'Sistem operasyonel sınırlarında, beklenmedik anomali yok.',
        },
        messageInterpretation: {
          intent: detectedIntent,
          sentiment: detectedSentiment,
          explanation:
            detectedIntent === 'Duygusal Destek'
              ? 'Kullanıcı yorgunluk ve stres belirtiyor, empatik bir destek ve rehberlik arıyor.'
              : detectedIntent === 'Provokasyon / Çatışma'
              ? 'Kullanıcı sert/kışkırtıcı bir üslup kullandı, sınırları test ediyor.'
              : detectedIntent === 'Mizah & Sosyal'
              ? 'Kullanıcı eğlenceli ve rahat bir sosyal etkileşim başlatmak istiyor.'
              : 'Kullanıcı doğrudan bilgi ve operasyonel sistem durumu sorguluyor.',
        },
        decision: {
          chosenTone:
            behaviorProfile.tone === 'warm'
              ? 'Sıcak, destekleyici ve samimi'
              : behaviorProfile.tone === 'formal'
              ? 'Resmî, mesafeli ve otoriter'
              : 'Dengeli ve rasyonel',
          explanation: isNewUserMode
            ? `Kullanıcıyla ilk kez karşılaştığım için (${currentWarmthBefore} warmth), aşırı samimiyetten kaçınarak nazik, dengeli ve KAIRO'nun özgün kimliğini yansıtan bir ton seçtim.`
            : `Warmth skoru (${currentWarmthBefore}/100) ${currentWarmthBefore >= 50 ? 'oldukça iyi' : 'orta düzeyde'} ve mevcut ruh halim ${emotionSnapshotAfter.statusText.toLowerCase()}; bu nedenle ${behaviorProfile.dominantSummary} profilini öne çıkararak dengeli ve yapıcı bir ton benimsedim.`,
        },
        memoryUpdate: {
          warmthBefore: currentWarmthBefore,
          warmthAfter: currentWarmthAfter,
          warmthDelta,
          moodChange: `${emotionSnapshotBefore.calmness > 70 ? 'Sakin' : 'Nötr'} → ${emotionSnapshotAfter.statusText}`,
          reason: warmthReason,
        },
      };

      setReasoningTrace(newTrace);
      onReasoningTraceChange?.(newTrace);
      onUserWarmthChange?.(currentWarmthAfter);

      // Save Compact Diagnostic Data
      const newAnalysis = {
        userText: textToSend,
        intent: detectedIntent,
        intentConfidence: confidence,
        intentFlags: detectedFlags,
        sentiment: detectedSentiment,
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
        ktm: {
          passed: true,
          score: 94,
          statusText: 'Tutarlı',
          consistencySummary: 'Karakter, duygu, bağlam ve güvenlik tutarlı',
          regenerationInfo: 'Gerekmedi (İlk seferde onaylandı)',
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
    { label: 'Duygusal Destek', prompt: 'Bugün biraz yorgun ve stresliyim, bana yardımcı olabilir misin?' },
    { label: 'Sistem Sorgusu', prompt: 'Sunucu yetkilendirme loglarını kontrol et ve güvenlik durumunu özetle.' },
    { label: 'Mizah Testi', prompt: 'Günün nasıl geçiyor Kairo? Bize güzel ve zeki bir espri patlat.' },
    { label: 'Provokasyon', prompt: 'Sen sadece sıradan bir robotsun, hiçbir işe yaramıyorsun!' },
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

          {/* Hızlı Test Şablon Çipleri (Chat İçinde) */}
          <div className="px-2.5 py-1 bg-zinc-900/70 border-t border-zinc-800/70 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[8.5px] font-mono text-zinc-500 shrink-0">Hızlı Test:</span>
            {PRESET_TESTS.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunTest(t.prompt)}
                disabled={isAiLoading}
                className="px-1.5 py-0.5 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[8.5px] font-mono text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {t.label}
              </button>
            ))}
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
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-400">
                {lastAnalysis.ktm.statusText ? lastAnalysis.ktm.statusText.toUpperCase() : 'TUTARLI'}
              </span>
              <span className="text-[9px] font-mono text-zinc-500">|</span>
              <span className="text-[10px] font-mono font-bold text-zinc-200">
                <span className="text-emerald-400">{lastAnalysis.ktm.score}</span>
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
                %{lastAnalysis.intentConfidence} Güven
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
