import { DroitPersonalityTraits, TestMessage, DroitDynamicState, ReasoningTrace } from '../types/nexus';
import { computeBehaviorProfile, BehaviorLayerProfile } from './droitBehaviorEngine';
import { loadKdmState, loadRecentKdmMemory } from './kdmPersistenceService';
import { loadKairoLongTermMemory, KairoMemoryEntry, saveKairoLongTermMemory } from './kairoLongTermMemoryService';
import { validateKairoResponse, ResponseConsistencyResult } from './kairoResponseConsistency';
import { auth } from '../lib/firebase';

export type KairoProvider = 'gemini' | 'openrouter';
export interface SendKairoChatOptions { userMessage: string; personality: DroitPersonalityTraits; history?: TestMessage[]; characterInfo?: { name?: string; roleTitle?: string; raceName?: string; }; provider?: KairoProvider; }
export interface KairoChatResponse { reply: string; profile: BehaviorLayerProfile; dynamicState?: DroitDynamicState; reasoningTrace?: ReasoningTrace; consistency?: ResponseConsistencyResult; providerUsed?: KairoProvider; }

const EXPLICIT_NAME_PATTERNS = [/^benim adım\s+([^.!?,\n]+)[.!?]?$/i,/^adım\s+([^.!?,\n]+)[.!?]?$/i,/^ben\s+([^.!?,\n]+)\s*$/i];
async function captureExplicitUserMemory(userMessage: string): Promise<void> { const normalized=userMessage.trim(); for(const pattern of EXPLICIT_NAME_PATTERNS){const match=normalized.match(pattern);if(!match)continue;const name=match[1].trim();if(name.length<2||name.length>80)return;await saveKairoLongTermMemory({category:'user_identity',content:`Kullanıcının adı: ${name}`,importance:1,tags:['name','user_identity']});return;}}

export const droitChatService = {
  async sendMessage({ userMessage, personality, history = [], characterInfo = { name: 'KAIRO', roleTitle: 'Sunucu Yöneticisi', raceName: 'Sentetik Droit' }, provider = 'gemini' }: SendKairoChatOptions): Promise<KairoChatResponse> {
    await captureExplicitUserMemory(userMessage).catch((error) => console.warn('Kairo memory capture skipped:', error));
    const userId = auth.currentUser?.uid || 'anonymous';
    const [persistedState, longTermMemory, structuredMemory] = await Promise.all([loadKdmState(userId).catch(() => null),loadKairoLongTermMemory(8).catch(() => []),loadRecentKdmMemory(8,userId).catch(() => [])]);
    const behaviorProfile = computeBehaviorProfile(personality, userMessage, persistedState || undefined);
    const payload = { userId,userMessage,character:characterInfo,personality,behaviorProfile,dynamicState:behaviorProfile.dynamicStateUpdates ? {...(persistedState || {}),...behaviorProfile.dynamicStateUpdates} : persistedState,longTermMemory:longTermMemory as KairoMemoryEntry[],userMemory:structuredMemory,history:history.map((m)=>({sender:m.sender,text:m.text})),provider };
    try { const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok){const errorData=await res.json().catch(()=>({}));throw new Error(errorData.error||`Sunucu hatası: ${res.status}`);}const data=await res.json();const reply=data.reply||'';const dynamicState=data.kdm?.dynamicState as DroitDynamicState|undefined;const reasoningTrace=data.kdm?.trace as ReasoningTrace|undefined;const consistency=reasoningTrace?validateKairoResponse(reply,reasoningTrace):undefined;return {reply,profile:behaviorProfile,dynamicState,reasoningTrace,consistency,providerUsed:data.providerUsed}; } catch(err:any){console.error('Kairo Chat Service error:',err);throw err;}
  },
};
