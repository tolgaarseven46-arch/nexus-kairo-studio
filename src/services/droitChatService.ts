import { DroitPersonalityTraits, TestMessage, DroitDynamicState, ReasoningTrace } from '../types/nexus';
import { computeBehaviorProfile, BehaviorLayerProfile } from './droitBehaviorEngine';
import { loadKdmState, loadRecentKdmMemory } from './kdmPersistenceService';
import { loadKairoLongTermMemory, KairoMemoryEntry } from './kairoLongTermMemoryService';
import { validateKairoResponse, ResponseConsistencyResult } from './kairoResponseConsistency';
import { auth } from '../lib/firebase';

export interface SendKairoChatOptions { userMessage: string; personality: DroitPersonalityTraits; history?: TestMessage[]; characterInfo?: { name?: string; roleTitle?: string; raceName?: string; }; }
export interface KairoChatResponse { reply: string; profile: BehaviorLayerProfile; dynamicState?: DroitDynamicState; reasoningTrace?: ReasoningTrace; consistency?: ResponseConsistencyResult; }

export const droitChatService = {
  async sendMessage({ userMessage, personality, history = [], characterInfo = { name: 'KAIRO', roleTitle: 'Sunucu Yöneticisi', raceName: 'Sentetik Droit' } }: SendKairoChatOptions): Promise<KairoChatResponse> {
    const behaviorProfile = computeBehaviorProfile(personality, userMessage);
    const userId = auth.currentUser?.uid || 'anonymous';
    const [persistedState, longTermMemory, structuredMemory] = await Promise.all([
      loadKdmState(userId).catch(() => null),
      loadKairoLongTermMemory(8).catch(() => []),
      loadRecentKdmMemory(8, userId).catch(() => []),
    ]);
    const payload = {
      userId,
      userMessage,
      character: characterInfo,
      personality,
      behaviorProfile,
      dynamicState: persistedState,
      longTermMemory: longTermMemory as KairoMemoryEntry[],
      userMemory: structuredMemory,
      history: history.map((m) => ({ sender: m.sender, text: m.text })),
    };
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.error || `Sunucu hatası: ${res.status}`); }
      const data = await res.json();
      const reply = data.reply || '';
      const dynamicState = data.kdm?.dynamicState as DroitDynamicState | undefined;
      const reasoningTrace = data.kdm?.trace as ReasoningTrace | undefined;
      const consistency = reasoningTrace ? validateKairoResponse(reply, reasoningTrace) : undefined;
      // KDM metrikleri ve etkileşim kaydı server.ts tarafından, onarım tamamlandıktan sonra tutulur.
      // Burada tekrar yazmak duplicate event oluşturur ve gerçek repairAttempts bilgisini kaybeder.
      return { reply, profile: behaviorProfile, dynamicState, reasoningTrace, consistency };
    } catch (err: any) { console.error('Kairo Chat Service error:', err); throw err; }
  },
};
