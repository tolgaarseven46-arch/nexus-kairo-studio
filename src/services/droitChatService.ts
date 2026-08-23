import {
  DroitPersonalityTraits,
  TestMessage,
  DroitDynamicState,
  ReasoningTrace,
} from '../types/nexus';
import {
  computeBehaviorProfile,
  BehaviorLayerProfile,
} from './droitBehaviorEngine';
import { saveKdmInteraction, loadKdmState } from './kdmPersistenceService';

export interface SendKairoChatOptions {
  userMessage: string;
  personality: DroitPersonalityTraits;
  history?: TestMessage[];
  characterInfo?: {
    name?: string;
    roleTitle?: string;
    raceName?: string;
  };
}

export interface KairoChatResponse {
  reply: string;
  profile: BehaviorLayerProfile;
  dynamicState?: DroitDynamicState;
  reasoningTrace?: ReasoningTrace;
}

export const droitChatService = {
  async sendMessage({
    userMessage,
    personality,
    history = [],
    characterInfo = {
      name: 'KAIRO',
      roleTitle: 'Sunucu Yöneticisi',
      raceName: 'Sentetik Droit',
    },
  }: SendKairoChatOptions): Promise<KairoChatResponse> {
    const behaviorProfile = computeBehaviorProfile(personality, userMessage);
    const persistedState = await loadKdmState().catch(() => null);

    const payload = {
      userMessage,
      character: characterInfo,
      personality,
      behaviorProfile,
      dynamicState: persistedState,
      history: history.map((m) => ({ sender: m.sender, text: m.text })),
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Sunucu hatası: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || '';
      const dynamicState = data.kdm?.dynamicState as DroitDynamicState | undefined;
      const reasoningTrace = data.kdm?.trace as ReasoningTrace | undefined;

      if (dynamicState && reasoningTrace) {
        void saveKdmInteraction({
          dynamicState,
          reasoningTrace,
          lastUserMessage: userMessage,
          reply,
        }).catch((error) => console.warn('KDM persistence failed:', error));
      }

      return { reply, profile: behaviorProfile, dynamicState, reasoningTrace };
    } catch (err: any) {
      console.error('Kairo Chat Service error:', err);
      throw err;
    }
  },
};
