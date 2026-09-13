import type { Character } from '../types';
import type { DroitDynamicState, DroitPersonalityTraits, TestMessage } from '../types/nexus';
import { droitChatService, type KairoChatResponse } from './droitChatService';

const neutral = 50;

export interface TestLabRuntimeMessage {
  id: string;
  sender: 'user' | 'droit' | 'system';
  text: string;
  timestamp: string;
}

export interface TestLabRuntimeRequest {
  character: Character;
  userMessage: string;
  messages: TestLabRuntimeMessage[];
  sessionId?: string;
  dynamicState?: DroitDynamicState;
}

export interface TestLabRuntimeResult {
  response: KairoChatResponse;
  expressionId: string;
  reasoningNote?: string;
}

export function mapCharacterToRuntimePersonality(character: Character): DroitPersonalityTraits {
  const source = character.personality;

  return {
    anger: neutral,
    patience: source?.patience ?? neutral,
    empathy: source?.empathy ?? neutral,
    emotionalSensitivity: source?.sensitivity ?? neutral,
    socialIntelligence: neutral,
    selfConfidence: neutral,
    humor: source?.humor ?? neutral,
    communication: source?.sociability ?? neutral,
    charisma: neutral,
    curiosity: source?.curiosity ?? neutral,
    analyticalThinking: neutral,
    creativity: neutral,
    decisionMaking: source?.decisiveness ?? neutral,
    attention: neutral,
    authority: source?.authority ?? neutral,
    courage: neutral,
    seriousness: source?.seriousness ?? neutral,
    loyalty: neutral,
    initiative: neutral,
    trust: source?.trust ?? neutral,
  };
}

export function mapTestLabHistory(messages: TestLabRuntimeMessage[]): TestMessage[] {
  return messages
    .filter(
      (message): message is TestLabRuntimeMessage & { sender: 'user' | 'droit' } =>
        message.sender !== 'system' && !message.id.startsWith('init_'),
    )
    .map((message) => ({
      id: message.id,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
    }));
}

function expressionFromRuntime(response: KairoChatResponse): string {
  const reactionMode = response.reasoningTrace?.currentMood?.reactionMode;
  if (reactionMode === 'hurt' || reactionMode === 'withdrawn') return 'sad';
  if (reactionMode === 'irritated') return 'angry';
  if (reactionMode === 'repairing') return 'happy';

  const state = response.dynamicState;
  if (!state) return 'normal';
  if (state.anger >= 60) return 'angry';
  if (state.surprise >= 60) return 'surprised';
  if (state.happiness >= 65) return 'happy';
  if (state.stress >= 70) return 'thinking';
  return 'normal';
}

function reasoningNoteFromRuntime(response: KairoChatResponse): string | undefined {
  const tone = response.reasoningTrace?.decision?.chosenTone;
  const provider = response.providerUsed;
  const semanticSource = response.languageUnderstanding?.semanticSource;
  const parts = [
    tone ? `Ton: ${tone}` : undefined,
    provider ? `Kaynak: ${provider}` : undefined,
    semanticSource ? `Semantik: ${semanticSource}` : undefined,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : undefined;
}

export async function sendTestLabMessage({
  character,
  userMessage,
  messages,
  sessionId,
  dynamicState,
}: TestLabRuntimeRequest): Promise<TestLabRuntimeResult> {
  const response = await droitChatService.sendMessage({
    userMessage,
    personality: mapCharacterToRuntimePersonality(character),
    dynamicState,
    history: mapTestLabHistory(messages),
    characterInfo: {
      name: character.name,
      roleTitle: character.role?.title || character.roleTitle || 'Droit',
      raceName: character.physical?.raceName || character.raceName || 'Sentetik Droit',
    },
    sessionId,
    kairaInstanceId: character.id,
    userName: 'Test Lab Kullanıcısı',
  });

  return {
    response,
    expressionId: expressionFromRuntime(response),
    reasoningNote: reasoningNoteFromRuntime(response),
  };
}
