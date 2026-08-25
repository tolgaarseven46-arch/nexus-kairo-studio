import { DroitPersonalityTraits, TestMessage, DroitDynamicState, ReasoningTrace } from '../types/nexus';
import { computeBehaviorProfile, BehaviorLayerProfile } from './droitBehaviorEngine';
import { applyRelationshipContext } from './relationshipBehaviorService';
import { loadKdmState, loadRecentKdmMemory } from './kdmPersistenceService';
import { saveKairoLongTermMemory } from './kairoLongTermMemoryService';
import { validateKairoResponse, ResponseConsistencyResult } from './kairoResponseConsistency';
import { auth } from '../lib/firebase';

export type KairoProvider = 'gemini' | 'openrouter';
export interface SendKairoChatOptions { userMessage: string; personality: DroitPersonalityTraits; history?: TestMessage[]; characterInfo?: { name?: string; roleTitle?: string; raceName?: string; }; provider?: KairoProvider; userId?: string; }
export interface KairoChatResponse { reply: string; profile: BehaviorLayerProfile; dynamicState?: DroitDynamicState; reasoningTrace?: ReasoningTrace; consistency?: ResponseConsistencyResult; providerUsed?: KairoProvider; }

const EXPLICIT_NAME_PATTERNS = [/^benim adım\s+([^.!?,\n]+)[.!?]?$/i,/^adım\s+([^.!?,\n]+)[.!?]?$/i,/^ben\s+([^.!?,\n]+)\s*$/i];
async function captureExplicitUserMemory(userMessage: string): Promise<void> { const normalized=userMessage.trim(); for(const pattern of EXPLICIT_NAME_PATTERNS){const match=normalized.match(pattern);if(!match)continue;const name=match[1].trim();if(name.length<2||name.length>80)return;await saveKairoLongTermMemory({category:'user_identity',content:`Kullanıcının adı: ${name}`,importance:1,tags:['name','user_identity']});return;}}

function resolveConversationUserId(explicitUserId?: string): string {
  if (explicitUserId?.trim()) return explicitUserId.trim();
  if (typeof window !== 'undefined') {
    const testUserId = window.localStorage.getItem('kairo_test_user_id');
    if (testUserId?.trim()) return testUserId.trim();
  }
  return auth.currentUser?.uid || 'anonymous';
}

export const droitChatService = {
  async sendMessage({ userMessage, personality, history = [], characterInfo = { name: 'KAIRO', roleTitle: 'Sunucu Yöneticisi', raceName: 'Sentetik Droit' }, provider = 'openrouter', userId: explicitUserId }: SendKairoChatOptions): Promise<KairoChatResponse> {
    void captureExplicitUserMemory(userMessage).catch((error) => console.warn('Kairo memory capture skipped:', error));
    const userId = resolveConversationUserId(explicitUserId);
    const [persistedState, structuredMemory] = await Promise.all([loadKdmState(userId).catch(() => null),loadRecentKdmMemory(4,userId).catch(() => [])]);
    const baseBehaviorProfile = computeBehaviorProfile(personality, userMessage);
    const behaviorProfile = applyRelationshipContext(baseBehaviorProfile, persistedState);
    const payload = { userId,userMessage,character:characterInfo,personality,behaviorProfile,dynamicState:persistedState,userMemory:structuredMemory,history:history.slice(-6).map((m)=>({sender:m.sender,text:m.text})),provider };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const res=await fetch('/api/chat',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok){const errorData=await res.json().catch(()=>({}));throw new Error(errorData.error||`Sunucu hatası: ${res.status}`);}
      const data=await res.json();const reply=data.reply||'';const dynamicState=data.kdm?.dynamicState as DroitDynamicState|undefined;const reasoningTrace=data.kdm?.trace as ReasoningTrace|undefined;const consistency=reasoningTrace?validateKairoResponse(reply,reasoningTrace):undefined;return {reply,profile:behaviorProfile,dynamicState,reasoningTrace,consistency,providerUsed:data.providerUsed};
    } catch(err:any){
      if(err?.name==='AbortError') throw new Error('Kaira yanıtı 35 saniyeyi aştı. OpenRouter/model gecikmesi olabilir.');
      console.error('Kairo Chat Service error:',err);throw err;
    } finally { clearTimeout(timeout); }
  },
};
