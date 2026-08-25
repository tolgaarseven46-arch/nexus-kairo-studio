import React, { useState, useCallback, useEffect } from 'react';
import { StudioTopBar } from './StudioTopBar';
import { KairoChatTab } from './tabs/KairoChatTab';
import { CharacterTab } from './tabs/CharacterTab';
import { TestLabTab } from './tabs/TestLabTab';
import { BrainTab } from './tabs/BrainTab';
import { SettingsTab } from './tabs/SettingsTab';
import { KdmMetricsPanel } from '../common/KdmMetricsPanel';
import { DroitPersonalityTraits, DroitDynamicState, DroitExpressionMode, DroitExpressionId, DroitExpressionAsset, NexusTab, TestMessage, ReasoningTrace } from '../../types/nexus';
import { droitPersonalityService, DEFAULT_PERSONALITY_TRAITS } from '../../services/droitPersonalityService';
import { droitExpressionAssetService } from '../../services/droitExpressionAssetService';
import { droitChatService } from '../../services/droitChatService';
import { loadKairoConversation, saveKairoConversationMessage } from '../../services/kairoConversationService';

const INITIAL_PERSONALITY: DroitPersonalityTraits = { ...DEFAULT_PERSONALITY_TRAITS };
const INITIAL_EXPRESSIONS: Record<DroitExpressionId, DroitExpressionAsset | null> = { NEUTRAL: null, HAPPY: null, PLAYFUL: null, SAD: null, ANGRY: null, SURPRISED: null, THINKING: null, CONFUSED: null };
const INITIAL_DYNAMIC_STATE: DroitDynamicState = { calmness: 75, anger: 20, stress: 15, happiness: 65, confidence: 85, surprise: 10, lastStatus: 'Sakin ve kontrollü', lastEvent: { eventTitle: 'Sistem hazır ve kullanıcı mesajı bekleniyor.', reactionText: 'Nexus Core stabil, veri akışı senkronize.', deltas: [{ label: 'Sakinlik', key: 'calmness', value: 3 }, { label: 'Güven', key: 'confidence', value: 5 }, { label: 'Stres', key: 'stress', value: -2 }] } };
const INITIAL_MESSAGES: TestMessage[] = [{ id: 'msg-1', sender: 'droit', text: 'Merhaba. Ben Kairo (#001), Nexus Sunucu Yöneticisi ve Asistanıyım. Size nasıl yardımcı olabilirim?', timestamp: '12:00' }];
const INITIAL_REASONING_TRACE: ReasoningTrace = { whoSent: { userName: 'Test Operatörü (Sistem)', isNewUser: false, recognitionText: 'Tanınan kullanıcı (Discord ID: usr_8921)' }, relationship: { warmthScore: 62, warmthLabel: 'Samimi / Güvenilir', note: 'Daha önceki oturumlarda saygılı ve dengeli diyaloglar kuruldu.' }, currentMood: { moodText: 'Sakin ve dengeli', reasonText: 'Sistem operasyonel sınırlarında, beklenmedik anomali yok.' }, messageInterpretation: { intent: 'Duygusal Destek', sentiment: 'Hassas / Destek Arayışı', explanation: 'Kullanıcı yorgunluk ve stres belirtiyor, empatik bir yaklaşım bekliyor.' }, decision: { chosenTone: 'Sıcak, destekleyici ve çözüm odaklı', explanation: 'Warmth skoru orta-yüksek ve kullanıcı yardım talep ediyor; bu yüzden resmî mesafeyi azaltıp empatik ve yapıcı bir ton seçtim.' }, memoryUpdate: { warmthBefore: 62, warmthAfter: 65, warmthDelta: 3, moodChange: 'Sakin → Destekleyici', reason: 'Kullanıcı samimi ve saygılı bir şekilde duygusal durumunu paylaştı.' } };

const TEST_USERS = [
  { id: 'test_user_x', label: 'Kullanıcı X', note: 'X kişisinin ilişki ve hafızası' },
  { id: 'test_user_y', label: 'Kullanıcı Y', note: 'Y kişisinin ilişki ve hafızası' },
] as const;

export const NexusStudioLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NexusTab>('KARAKTER');
  const [personality, setPersonality] = useState<DroitPersonalityTraits>(INITIAL_PERSONALITY);
  const [kairoDocId, setKairoDocId] = useState<string>('kairo');
  const [expressionAssets, setExpressionAssets] = useState<Record<DroitExpressionId, DroitExpressionAsset | null>>(INITIAL_EXPRESSIONS);
  const [dynamicState, setDynamicState] = useState<DroitDynamicState>(INITIAL_DYNAMIC_STATE);
  const [expression, setExpression] = useState<DroitExpressionMode>('NEUTRAL');
  const [messages, setMessages] = useState<TestMessage[]>(INITIAL_MESSAGES);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [reasoningTrace, setReasoningTrace] = useState<ReasoningTrace>(INITIAL_REASONING_TRACE);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [isNewUserMode, setIsNewUserMode] = useState<boolean>(false);
  const [userWarmth, setUserWarmth] = useState<number>(62);
  const [selectedTestUser, setSelectedTestUser] = useState<string>(() => {
    if (typeof window === 'undefined') return 'test_user_x';
    return window.localStorage.getItem('kairo_test_user_id') || 'test_user_x';
  });
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('kairo_test_user_id', selectedTestUser);
    setDynamicState(INITIAL_DYNAMIC_STATE);
    setReasoningTrace(INITIAL_REASONING_TRACE);
    setLastAnalysis(null);
    setUserWarmth(62);
    setIsNewUserMode(false);
  }, [selectedTestUser]);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const [personalityResult, loadedExpressions, persistedMessages] = await Promise.all([
          droitPersonalityService.loadKairoPersonality(),
          droitExpressionAssetService.loadExpressionAssets('kairo'),
          loadKairoConversation(100).catch((error) => { console.warn('[Kairo Conversation] load skipped:', error); return []; }),
        ]);
        if (!isMounted) return;
        if (personalityResult) {
          setPersonality(personalityResult.traits);
          if (personalityResult.docId) setKairoDocId(personalityResult.docId);
        }
        setExpressionAssets(loadedExpressions);
        if (persistedMessages.length) setMessages(persistedMessages);
        setIsSaved(true);
      } catch (err) { console.warn('Could not load character data from Firestore:', err); }
    }
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const handlePersonalityChange = (partial: Partial<DroitPersonalityTraits>) => { setPersonality((prev) => ({ ...prev, ...partial })); setIsSaved(false); };

  const handleSave = async () => {
    try { setIsSaving(true); await droitPersonalityService.saveKairoPersonality(personality, kairoDocId); setIsSaved(true); setMessages([]); }
    catch (error) { console.error('Error saving personality to Firestore:', error); }
    finally { setIsSaving(false); }
  };

  const persistMessageSafely = useCallback(async (message: TestMessage) => {
    try { await saveKairoConversationMessage(message); } catch (error) { console.warn('[Kairo Conversation] save skipped:', error); }
  }, []);

  const handleSendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isAiLoading) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: TestMessage = { id: `msg-${Date.now()}`, sender: 'user', text: userText.trim(), timestamp: timeStr };
    setMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);
    void persistMessageSafely(userMsg);
    try {
      const response = await droitChatService.sendMessage({ userMessage: userText.trim(), personality, dynamicState, history: [...messages, userMsg], characterInfo: { name: 'KAIRO', roleTitle: 'Sunucu Yöneticisi', raceName: 'Sentetik Droit' } });
      if (response.dynamicState) {
        setDynamicState(response.dynamicState);
        setLastAnalysis(response.dynamicState.lastEvent ?? null);
      }
      if (response.reasoningTrace) {
        setReasoningTrace(response.reasoningTrace);
        setUserWarmth(response.reasoningTrace.relationship.warmthScore);
        setLastAnalysis({ intent: response.reasoningTrace.messageInterpretation.intent, sentiment: response.reasoningTrace.messageInterpretation.sentiment, tone: response.reasoningTrace.decision.chosenTone, mood: response.reasoningTrace.currentMood.moodText, warmthScore: response.reasoningTrace.relationship.warmthScore });
      }
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const droitMsg: TestMessage = { id: `msg-${Date.now() + 1}`, sender: 'droit', text: response.reply, timestamp: replyTime };
      setMessages((prev) => [...prev, droitMsg]);
      void persistMessageSafely(droitMsg);
    } catch (error: any) {
      console.error('Kairo AI generation error in chat:', error);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMsg: TestMessage = { id: `msg-err-${Date.now()}`, sender: 'droit', text: `[Sistem Protokolü]: İletişim sırasında bir hata oluştu (${error?.message || 'Bağlantı kurulamadı'}). Lütfen tekrar deneyin.`, timestamp: replyTime };
      setMessages((prev) => [...prev, errorMsg]);
    } finally { setIsAiLoading(false); }
  }, [personality, dynamicState, messages, isAiLoading, persistMessageSafely]);

  return <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/20 selection:text-indigo-200">
    <StudioTopBar activeTab={activeTab} onSelectTab={setActiveTab} onSave={handleSave} isSaved={isSaved} isSaving={isSaving} />
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {activeTab === 'KARAKTER' && <CharacterTab personality={personality} dynamicState={dynamicState} expression={expression} onExpressionChange={setExpression} expressionAssets={expressionAssets} onPersonalityChange={handlePersonalityChange} onSave={handleSave} isSaved={isSaved} isSaving={isSaving} />}
      {activeTab === 'TEST' && <div className="flex-1 min-h-0 flex flex-col gap-2">
        <div className="shrink-0 px-3 pt-2">
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-200 uppercase tracking-wider">Kişiye Özel İlişki Testi</div>
              <div className="text-[9px] font-mono text-zinc-500">Her test kullanıcısının KDM hafızası ve ilişki geçmişi ayrı tutulur.</div>
            </div>
            <div className="flex items-center gap-1.5">
              {TEST_USERS.map((user) => (
                <button key={user.id} type="button" onClick={() => setSelectedTestUser(user.id)} title={user.note} className={`px-3 py-1.5 rounded-md border text-[10px] font-mono font-bold transition-all ${selectedTestUser === user.id ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-200'}`}>{user.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0"><TestLabTab key={selectedTestUser} personality={personality} dynamicState={dynamicState} expression={expression} onDynamicStateChange={setDynamicState} onExpressionChange={setExpression} reasoningTrace={reasoningTrace} onReasoningTraceChange={setReasoningTrace} lastAnalysis={lastAnalysis} onLastAnalysisChange={setLastAnalysis} isNewUserMode={isNewUserMode} onToggleNewUserMode={() => setIsNewUserMode((prev) => !prev)} userWarmth={userWarmth} onUserWarmthChange={setUserWarmth} onNavigateToBrain={() => setActiveTab('BEYİN')} /></div>
        <div className="shrink-0"><KdmMetricsPanel compact userId={selectedTestUser} /></div>
      </div>}
      {(activeTab === 'BEYIN' || activeTab === 'BEYİN') && <BrainTab reasoningTrace={reasoningTrace} onReasoningTraceChange={setReasoningTrace} personality={personality} dynamicState={dynamicState} onDynamicStateChange={setDynamicState} isNewUserMode={isNewUserMode} onToggleNewUserMode={() => setIsNewUserMode((prev) => !prev)} userWarmth={userWarmth} onUserWarmthChange={setUserWarmth} lastAnalysis={lastAnalysis} onNavigateToTest={() => setActiveTab('TEST')} onNavigateToCharacter={() => setActiveTab('KARAKTER')} onResetTrace={() => { setReasoningTrace(INITIAL_REASONING_TRACE); setUserWarmth(62); setIsNewUserMode(false); }} />}
      {activeTab === 'AYARLAR' && <SettingsTab />}
      {activeTab === 'KAIRO' && <KairoChatTab expression={expression} dynamicState={dynamicState} messages={messages} isLoading={isAiLoading} onSendMessage={handleSendMessage} />}
    </main>
  </div>;
};
