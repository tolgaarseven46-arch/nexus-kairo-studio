import { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace, TestMessage } from '../types/nexus';
import { droitChatService, KairoChatResponse } from './droitChatService';

export interface KdmChatBridgeResult extends KairoChatResponse {
  trace?: ReasoningTrace;
  dynamicState?: DroitDynamicState;
}

export async function sendKairoMessageThroughKdm(input: {
  userMessage: string;
  personality: DroitPersonalityTraits;
  dynamicState: DroitDynamicState;
  history?: TestMessage[];
}): Promise<KdmChatBridgeResult> {
  const response = await droitChatService.sendMessage({
    userMessage: input.userMessage,
    personality: input.personality,
    history: input.history,
  });

  return {
    ...response,
    trace: response.reasoningTrace,
    dynamicState: response.dynamicState,
  };
}
