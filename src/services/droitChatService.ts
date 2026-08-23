import {
  DroitPersonalityTraits,
  TestMessage,
} from '../types/nexus';
import {
  computeBehaviorProfile,
  BehaviorLayerProfile,
} from './droitBehaviorEngine';

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
}

export const droitChatService = {
  /**
   * Processes the user message through the Personality Behavior Layer
   * and sends the synthesized character prompt to the AI backend.
   */
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
    // 1. Synthesize the runtime behavior profile from current slider values
    const behaviorProfile = computeBehaviorProfile(personality, userMessage);

    // 2. Prepare payload for the server-side Gemini route
    const payload = {
      userMessage,
      character: characterInfo,
      personality,
      behaviorProfile,
      history: history.map((m) => ({
        sender: m.sender,
        text: m.text,
      })),
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || `Sunucu hatası: ${res.status}`;
        console.error('Kairo AI API request failed:', message);
        throw new Error(message);
      }

      const data = await res.json();
      const reply = data.reply || '';

      return {
        reply,
        profile: behaviorProfile,
      };
    } catch (err: any) {
      console.error('Kairo Chat Service error:', err);
      throw err;
    }
  },
};
