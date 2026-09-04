import { collection, doc, getDoc, limit, orderBy, query, setDoc, addDoc, getDocs, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  DroitDynamicState,
  ReasoningTrace,
  RelationshipState,
  TestMessage,
  TestSessionTurnRecord,
  TestSessionSummary,
  RestoredTestSession,
} from '../types/nexus';
import type { DialogueMemoryScope, DialogueTurnAnalysis } from './kairoDialogueChaosEngine';
import type { SemanticInterpretation } from '../types/semanticInterpretation';

const DEFAULT_USER_ID = 'anonymous';
const STATE_COLLECTION = 'kdmState';
const TRACE_COLLECTION = 'kdmTraces';
const KNT_COLLECTION = 'kntTraces';
const USER_MEMORY_COLLECTION = 'kairoMemory';
const USER_MEMORY_DOC = 'profile';
const TEST_SESSIONS_COLLECTION = 'testSessions';
const TURNS_COLLECTION = 'turns';
const scope = (userId?: string) => (userId || DEFAULT_USER_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
const DEFAULT_DYNAMIC_STATE: DroitDynamicState = { calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: 'Sakin ve kontrollü' };

function normalizeDynamicState(value: unknown): DroitDynamicState | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<DroitDynamicState>;
  const numberOrDefault = (candidate: unknown, fallback: number) => typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback;
  const rawRelationship = source.relationship;
  const relationship = rawRelationship && typeof rawRelationship === 'object' ? rawRelationship as Partial<RelationshipState> : undefined;
  return {
    calmness: numberOrDefault(source.calmness, DEFAULT_DYNAMIC_STATE.calmness), anger: numberOrDefault(source.anger, DEFAULT_DYNAMIC_STATE.anger), stress: numberOrDefault(source.stress, DEFAULT_DYNAMIC_STATE.stress), happiness: numberOrDefault(source.happiness, DEFAULT_DYNAMIC_STATE.happiness), confidence: numberOrDefault(source.confidence, DEFAULT_DYNAMIC_STATE.confidence), surprise: numberOrDefault(source.surprise, DEFAULT_DYNAMIC_STATE.surprise), lastStatus: typeof source.lastStatus === 'string' && source.lastStatus.trim() ? source.lastStatus : DEFAULT_DYNAMIC_STATE.lastStatus,
    ...(source.reactionMode === 'neutral' || source.reactionMode === 'irritated' || source.reactionMode === 'hurt' || source.reactionMode === 'withdrawn' || source.reactionMode === 'repairing' ? { reactionMode: source.reactionMode } : {}),
    ...(source.lastEvent ? { lastEvent: source.lastEvent } : {}),
    ...(relationship && typeof relationship.firstSeenAt === 'string' ? { relationship: {
      firstSeenAt: relationship.firstSeenAt, lastInteractionAt: typeof relationship.lastInteractionAt === 'string' ? relationship.lastInteractionAt : relationship.firstSeenAt, interactionCount: numberOrDefault(relationship.interactionCount, 0), familiarityDays: numberOrDefault(relationship.familiarityDays, 0), warmth: numberOrDefault(relationship.warmth, 50), trust: numberOrDefault(relationship.trust, 50), positiveEvents: numberOrDefault(relationship.positiveEvents, 0), negativeEvents: numberOrDefault(relationship.negativeEvents, 0), conflictScore: numberOrDefault(relationship.conflictScore, 0), hurtScore: numberOrDefault(relationship.hurtScore, 0), repairProgress: numberOrDefault(relationship.repairProgress, 0), repeatedNegativeCount: numberOrDefault(relationship.repeatedNegativeCount, 0),
      ...(relationship.conversationState === 'active' || relationship.conversationState === 'distancing' || relationship.conversationState === 'disengaged' || relationship.conversationState === 'repairing' ? { conversationState: relationship.conversationState } : {}),
      ...(typeof relationship.disengagedAt === 'string' ? { disengagedAt: relationship.disengagedAt } : {}),
      ...(typeof relationship.disengageReason === 'string' ? { disengageReason: relationship.disengageReason } : {}),
      ...(typeof relationship.repairAttempts === 'number' && Number.isFinite(relationship.repairAttempts) ? { repairAttempts: Math.max(0, relationship.repairAttempts) } : {}),
      ...(typeof relationship.lastConflictAt === 'string' ? { lastConflictAt: relationship.lastConflictAt } : {}), ...(typeof relationship.lastNegativePattern === 'string' ? { lastNegativePattern: relationship.lastNegativePattern } : {}), ...(typeof relationship.lastNegativePatternAt === 'string' ? { lastNegativePatternAt: relationship.lastNegativePatternAt } : {})
    } } : {}),
  };
}
export interface KdmPersistencePayload { dynamicState: DroitDynamicState; reasoningTrace: ReasoningTrace; lastUserMessage: string; reply: string; userId?: string; memoryScope?: DialogueMemoryScope; dialogueAnalysis?: DialogueTurnAnalysis; }
export interface KdmMemoryItem { userMessage: string; reply: string; createdAt?: string; reasoningTrace?: ReasoningTrace; dynamicState?: DroitDynamicState; memoryScope?: DialogueMemoryScope; dialogueAnalysis?: DialogueTurnAnalysis; }
export interface KairoUserMemory { userName?: string; preferences: string[]; facts: string[]; goals: string[]; notes: string[]; updatedAt: string; }
export interface KntTracePayload { userId?: string; userMessage: string; reply: string; reasoningTrace: ReasoningTrace; dynamicState: DroitDynamicState; timings: Record<string, number>; providerUsed?: string; semanticInterpretation?: SemanticInterpretation; semanticEvent?: unknown; semanticSource?: string; languageStyleMemory?: unknown; controlledSpontaneity?: unknown; speechIdentity?: unknown; worldStateAppraisal?: unknown; worldReasoningPolicy?: unknown; worldMemoryGuard?: unknown; epistemicAccess?: unknown; selfMemoryRuntime?: unknown; livedMemoryRuntime?: unknown; responsePlan?: unknown; createdAt?: string; }
const emptyUserMemory = (): KairoUserMemory => ({ preferences: [], facts: [], goals: [], notes: [], updatedAt: new Date().toISOString() });
const uniqueRecent = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(-20);
function extractMemoryCandidates(userMessage: string): Partial<KairoUserMemory> { const text = userMessage.trim(); const result: Partial<KairoUserMemory> = {}; const name = text.match(/(?:benim adım|adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9_-]{2,40})/i); if (name) result.userName = name[1]; if (/(?:artık .*? sevmiyorum|artık .*? ilgilenmiyorum)/i.test(text) || /(?:seviyorum|sevdiğim|favorim|hoşuma gidiyor|ilgileniyorum|ilgimi çekiyor|daha çok .*? ilgileniyorum)/i.test(text)) result.preferences = [text]; if (/(?:istiyorum|hedefim|amacım|planım|üzerinde çalışıyorum|geliştiriyorum)/i.test(text)) result.goals = [text]; if (/(?:yaşım|yaşındayım|mesleğim|işim|şehirde yaşıyorum|yaşıyorum|çalışıyorum)/i.test(text)) result.facts = [text]; return result; }
async function readUserProfile(userId: string): Promise<KairoUserMemory> { const userScope = scope(userId); let current = emptyUserMemory(); try { const entriesRef = collection(doc(db, USER_MEMORY_COLLECTION, userScope), 'entries'); const snapshot = await getDocs(query(entriesRef, orderBy('updatedAt', 'desc'), limit(1))); if (!snapshot.empty) current = { ...current, ...(snapshot.docs[0].data() as Partial<KairoUserMemory>) }; } catch (error) { console.warn('[Kairo User Memory] read failed:', error); } return current; }
async function updateStructuredUserMemory(userId: string, userMessage: string): Promise<void> { const candidate = extractMemoryCandidates(userMessage); if (!candidate.userName && !candidate.preferences?.length && !candidate.facts?.length && !candidate.goals?.length) return; const userScope = scope(userId); const ref = doc(db, USER_MEMORY_COLLECTION, userScope, 'entries', USER_MEMORY_DOC); const current = await readUserProfile(userScope); const removingPreference = candidate.preferences?.some((item) => /artık .*?(sevmiyorum|ilgilenmiyorum)/i.test(item)); const preferences = removingPreference ? uniqueRecent(current.preferences.filter((item) => !candidate.preferences!.some((replacement) => item.toLocaleLowerCase('tr-TR').includes(replacement.toLocaleLowerCase('tr-TR'))))) : uniqueRecent([...current.preferences, ...(candidate.preferences || [])]); const facts = uniqueRecent([...current.facts, ...(candidate.facts || [])]); const goals = uniqueRecent([...current.goals, ...(candidate.goals || [])]); await setDoc(ref, { userName: candidate.userName || current.userName, preferences, facts, goals, notes: uniqueRecent(current.notes), updatedAt: new Date().toISOString() }, { merge: true }); }
async function safeWithTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> { return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]); }

export async function saveKdmInteraction(payload: KdmPersistencePayload): Promise<void> {
  try { const userScope = scope(payload.userId); const now = new Date(); const previous = payload.dynamicState.relationship; const firstSeenAt = previous?.firstSeenAt || now.toISOString(); const previousCount = previous?.interactionCount || 0; const familiarityDays = Math.max(0, Math.floor((now.getTime() - new Date(firstSeenAt).getTime()) / 86400000));
    const relationship: RelationshipState = { firstSeenAt, lastInteractionAt: now.toISOString(), interactionCount: previousCount, familiarityDays, warmth: previous?.warmth ?? payload.reasoningTrace.relationship.warmthScore, trust: previous?.trust ?? payload.reasoningTrace.relationship.trustScore ?? 50, positiveEvents: previous?.positiveEvents ?? 0, negativeEvents: previous?.negativeEvents ?? 0, conflictScore: previous?.conflictScore ?? payload.reasoningTrace.relationship.conflictScore ?? 0, hurtScore: previous?.hurtScore ?? payload.reasoningTrace.relationship.hurtScore ?? 0, repairProgress: previous?.repairProgress ?? payload.reasoningTrace.relationship.repairProgress ?? 0, repeatedNegativeCount: previous?.repeatedNegativeCount ?? payload.reasoningTrace.relationship.repeatedNegativeCount ?? 0, ...(previous?.lastConflictAt ? { lastConflictAt: previous.lastConflictAt } : {}), ...(previous?.lastNegativePattern ? { lastNegativePattern: previous.lastNegativePattern } : {}), ...(previous?.lastNegativePatternAt ? { lastNegativePatternAt: previous.lastNegativePatternAt } : {}) };
    const normalized = normalizeDynamicState(payload.dynamicState) || DEFAULT_DYNAMIC_STATE; const safeDynamicState: DroitDynamicState = { ...normalized, relationship: { ...relationship, ...(normalized.relationship || {}) } }; const stateRef = doc(db, STATE_COLLECTION, userScope); await setDoc(stateRef, { characterId: 'kairo', userId: userScope, dynamicState: safeDynamicState, reasoningTrace: payload.reasoningTrace, lastUserMessage: payload.lastUserMessage, lastReply: payload.reply, updatedAt: now.toISOString() }, { merge: true }); const traceRef = collection(stateRef, TRACE_COLLECTION); await addDoc(traceRef, { ...payload.reasoningTrace, userMessage: payload.lastUserMessage, reply: payload.reply, dynamicState: safeDynamicState, memoryScope: payload.memoryScope || 'episodic', dialogueAnalysis: payload.dialogueAnalysis || null, userId: userScope, createdAt: now.toISOString() }); if (payload.memoryScope === 'durable_candidate') await updateStructuredUserMemory(userScope, payload.lastUserMessage).catch((error) => console.warn('[Kairo User Memory] save skipped:', error));
  } catch (err) { console.warn('[KDM Persistence] saveKdmInteraction skipped:', err); }
}
export async function saveKntTrace(payload: KntTracePayload): Promise<void> { const userScope = scope(payload.userId); const stateRef = doc(db, STATE_COLLECTION, userScope); await addDoc(collection(stateRef, KNT_COLLECTION), { ...payload, userId: userScope, createdAt: payload.createdAt || new Date().toISOString() }); }
export async function loadRecentKntTraces(maxItems = 20, userId?: string): Promise<any[]> { const userScope = scope(userId); const safeLimit = Math.max(1, Math.min(maxItems, 100)); const stateRef = doc(db, STATE_COLLECTION, userScope); const snapshot = await getDocs(query(collection(stateRef, KNT_COLLECTION), orderBy('createdAt', 'desc'), limit(safeLimit))); return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); }
export async function loadKdmState(userId?: string): Promise<DroitDynamicState | null> { return safeWithTimeout((async () => { try { const userScope = scope(userId); const snapshot = await getDoc(doc(db, STATE_COLLECTION, userScope)); if (!snapshot.exists()) return null; return normalizeDynamicState(snapshot.data().dynamicState); } catch (err) { console.warn('[KDM Persistence] loadKdmState warning:', err); return null; } })(), 2500, null); }
export async function loadRecentKdmMemory(maxItems = 6, userId?: string): Promise<KdmMemoryItem[]> { return safeWithTimeout((async () => { try { const userScope = scope(userId); const safeLimit = Math.max(1, Math.min(maxItems, 100)); const stateRef = doc(db, STATE_COLLECTION, userScope); const snapshot = await getDocs(query(collection(stateRef, TRACE_COLLECTION), orderBy('createdAt', 'desc'), limit(safeLimit))); const memories: KdmMemoryItem[] = snapshot.docs.map((item) => { const data = item.data(); return { userMessage: typeof data.userMessage === 'string' ? data.userMessage : '', reply: typeof data.reply === 'string' ? data.reply : '', createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined, reasoningTrace: data as unknown as ReasoningTrace, dynamicState: normalizeDynamicState(data.dynamicState) || undefined, memoryScope: data.memoryScope === 'session' || data.memoryScope === 'durable_candidate' ? data.memoryScope : 'episodic', dialogueAnalysis: data.dialogueAnalysis && typeof data.dialogueAnalysis === 'object' ? data.dialogueAnalysis as DialogueTurnAnalysis : undefined }; }).filter((item) => item.memoryScope !== 'session' && (item.userMessage || item.reply)).reverse(); try { const profileSnapshot = await getDocs(query(collection(doc(db, USER_MEMORY_COLLECTION, userScope), 'entries'), orderBy('updatedAt', 'desc'), limit(1))); if (!profileSnapshot.empty) { const profile = profileSnapshot.docs[0].data() as Partial<KairoUserMemory>; memories.unshift({ userMessage: 'Kairo kullanıcı profili', reply: JSON.stringify({ userName: profile.userName || null, preferences: Array.isArray(profile.preferences) ? profile.preferences : [], facts: Array.isArray(profile.facts) ? profile.facts : [], goals: Array.isArray(profile.goals) ? profile.goals : [], notes: Array.isArray(profile.notes) ? profile.notes : [] }), createdAt: new Date().toISOString(), memoryScope: 'durable_candidate' }); } } catch (error) { console.warn('[Kairo User Memory] profile load skipped:', error); } return memories; } catch (err) { console.warn('[KDM Persistence] loadRecentKdmMemory warning:', err); return []; } })(), 2500, []); }

// ==========================================
// TEST SESSION PERSISTENCE (testSessions/{sessionId}/turns/{turnId})
// ==========================================

export interface SaveTestSessionTurnPayload {
  sessionId: string;
  userId?: string;
  userName?: string;
  userMessage: string;
  assistantReply: string;
  speaker?: string;
  intent?: string;
  detectedEmotion?: string;
  reasoningTrace?: ReasoningTrace;
  kdmResult?: {
    chosenTone?: string;
    explanation?: string;
    score?: number;
    decision?: unknown;
  };
  activationValues?: {
    calmness?: number;
    anger?: number;
    stress?: number;
    happiness?: number;
    confidence?: number;
    surprise?: number;
    deltas?: Array<{ label: string; key: string; value: number }>;
  };
  dynamicStateBefore?: DroitDynamicState;
  dynamicStateAfter?: DroitDynamicState;
  relationshipState?: RelationshipState;
  retrievedMemories?: unknown[];
  memoryUpdate?: {
    warmthBefore: number;
    warmthAfter: number;
    warmthDelta: number;
    moodChange: string;
    reason: string;
  };
  consistency?: {
    accepted?: boolean;
    score?: number;
    issues?: string[];
    warnings?: string[];
  };
  metadata?: {
    providerUsed?: string;
    model?: string;
    semanticInterpretation?: unknown;
    semanticEvent?: unknown;
    semanticSource?: string;
    timings?: Record<string, number>;
    languageStyleMemory?: unknown;
    controlledSpontaneity?: unknown;
    speechIdentity?: unknown;
    entityResolution?: unknown;
    worldEvent?: unknown;
    retrievedWorldEvents?: unknown;
    worldStateAppraisal?: unknown;
    worldReasoningPolicy?: unknown;
    worldMemoryGuard?: unknown;
    epistemicAccess?: unknown;
    selfMemoryRuntime?: unknown;
    livedMemoryRuntime?: unknown;
    responsePlan?: unknown;
    activityPermission?: { requestId: string; activityId: string; activityLabel: string; text: string } | null;
  };
}

export function turnsToTestMessages(turns: TestSessionTurnRecord[]): TestMessage[] {
  const messages: TestMessage[] = [];
  for (const turn of turns) {
    const timeStr = formatTurnTimestamp(turn.timestamp);
    if (turn.userMessage) {
      messages.push({
        id: `${turn.turnId}-user`,
        sender: 'user',
        text: turn.userMessage,
        participantName: turn.speaker,
        semanticInterpretation: turn.metadata?.semanticInterpretation,
        semanticSource: turn.metadata?.semanticSource,
        timestamp: timeStr,
      });
    }
    if (turn.assistantReply) {
      messages.push({
        id: `${turn.turnId}-droit`,
        sender: 'droit',
        text: turn.assistantReply,
        replyToParticipantName: turn.speaker,
        activityPermissionRequestId: turn.metadata?.activityPermission?.requestId,
        timestamp: timeStr,
      });
    }
  }
  return messages;
}

function formatTurnTimestamp(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch {}
  return String(iso);
}

function stripUndefined<T>(val: T): T {
  if (val === undefined) return undefined as unknown as T;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(stripUndefined).filter((v) => v !== undefined) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, v] of Object.entries(val)) {
    if (v !== undefined) {
      const stripped = stripUndefined(v);
      if (stripped !== undefined) {
        clean[key] = stripped;
      }
    }
  }
  return clean as T;
}

export async function saveTestSessionTurn(payload: SaveTestSessionTurnPayload): Promise<TestSessionTurnRecord> {
  const userScope = scope(payload.userId);
  const sessionId = payload.sessionId || `session_${userScope}`;
  const turnId = `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const speaker = payload.speaker || payload.userName || 'Kullanıcı';

  let turnNumber = 1;
  try {
    const existingSnap = await getDoc(doc(db, TEST_SESSIONS_COLLECTION, sessionId));
    if (existingSnap.exists()) {
      turnNumber = Number(existingSnap.data()?.turnCount || 0) + 1;
    }
  } catch {}

  const turnRecord: TestSessionTurnRecord = {
    turnId,
    turnNumber,
    sessionId,
    timestamp: now,
    userMessage: payload.userMessage,
    assistantReply: payload.assistantReply,
    speaker,
    intent: payload.intent || payload.reasoningTrace?.messageInterpretation?.intent || 'genel_sohbet',
    detectedEmotion: payload.detectedEmotion || payload.reasoningTrace?.messageInterpretation?.sentiment || 'nötr',
    reasoningTrace: payload.reasoningTrace,
    kdmResult: payload.kdmResult || (payload.reasoningTrace ? {
      chosenTone: payload.reasoningTrace.decision?.chosenTone,
      explanation: payload.reasoningTrace.decision?.explanation,
      score: payload.consistency?.score,
      decision: payload.reasoningTrace.decision,
    } : undefined),
    activationValues: payload.activationValues || (payload.dynamicStateAfter ? {
      calmness: payload.dynamicStateAfter.calmness,
      anger: payload.dynamicStateAfter.anger,
      stress: payload.dynamicStateAfter.stress,
      happiness: payload.dynamicStateAfter.happiness,
      confidence: payload.dynamicStateAfter.confidence,
      surprise: payload.dynamicStateAfter.surprise,
      deltas: payload.dynamicStateAfter.lastEvent?.deltas || [],
    } : undefined),
    dynamicStateBefore: payload.dynamicStateBefore,
    dynamicStateAfter: payload.dynamicStateAfter,
    relationshipState: payload.relationshipState || payload.dynamicStateAfter?.relationship,
    retrievedMemories: payload.retrievedMemories || [],
    memoryUpdate: payload.memoryUpdate || payload.reasoningTrace?.memoryUpdate,
    consistency: payload.consistency,
    metadata: {
      providerUsed: payload.metadata?.providerUsed,
      model: payload.metadata?.model,
      semanticEvent: payload.metadata?.semanticEvent,
      semanticSource: payload.metadata?.semanticSource,
      timings: payload.metadata?.timings,
      speechIdentity: payload.metadata?.speechIdentity,
      entityResolution: payload.metadata?.entityResolution,
      worldEvent: payload.metadata?.worldEvent,
      retrievedWorldEvents: payload.metadata?.retrievedWorldEvents,
      worldStateAppraisal: payload.metadata?.worldStateAppraisal,
      worldReasoningPolicy: payload.metadata?.worldReasoningPolicy,
      worldMemoryGuard: payload.metadata?.worldMemoryGuard,
      selfMemoryRuntime: payload.metadata?.selfMemoryRuntime,
      livedMemoryRuntime: payload.metadata?.livedMemoryRuntime,
      responsePlan: payload.metadata?.responsePlan,
      activityPermission: payload.metadata?.activityPermission,
    },
  };

  try {
    const sessionRef = doc(db, TEST_SESSIONS_COLLECTION, sessionId);
    const turnsRef = collection(sessionRef, TURNS_COLLECTION);
    const turnDocRef = doc(turnsRef, turnId);

    // Save individual turn document without undefined properties
    await setDoc(turnDocRef, stripUndefined(turnRecord));

    // Update parent session summary document
    const sessionUpdate: Partial<TestSessionSummary> & Record<string, any> = {
      sessionId,
      userId: userScope,
      userName: speaker,
      characterId: 'kairo',
      updatedAt: now,
      turnCount: turnNumber,
      lastUserMessage: payload.userMessage,
      lastAssistantReply: payload.assistantReply,
      dynamicState: payload.dynamicStateAfter,
      relationship: payload.relationshipState || payload.dynamicStateAfter?.relationship,
      active: true,
    };

    await setDoc(sessionRef, stripUndefined(sessionUpdate), { merge: true });

    // Store active sessionId in localStorage for fast reload on client
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`kairo_active_session_${userScope}`, sessionId);
    }
  } catch (err) {
    console.warn('[TestSessionPersistence] saveTestSessionTurn failed:', err);
  }

  return turnRecord;
}

export async function loadTestSession(sessionId: string): Promise<RestoredTestSession | null> {
  return safeWithTimeout((async () => {
    try {
      if (!sessionId?.trim()) return null;
      const sessionRef = doc(db, TEST_SESSIONS_COLLECTION, sessionId.trim());
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) return null;

      const sessionData = sessionSnap.data();
      const turnsRef = collection(sessionRef, TURNS_COLLECTION);
      const turnsSnap = await getDocs(query(turnsRef, limit(200)));

      const turns: TestSessionTurnRecord[] = turnsSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          turnId: docSnap.id,
          turnNumber: Number(data.turnNumber || 0),
          sessionId,
          timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
          userMessage: typeof data.userMessage === 'string' ? data.userMessage : '',
          assistantReply: typeof data.assistantReply === 'string' ? data.assistantReply : '',
          speaker: typeof data.speaker === 'string' ? data.speaker : 'Kullanıcı',
          intent: typeof data.intent === 'string' ? data.intent : 'genel_sohbet',
          detectedEmotion: typeof data.detectedEmotion === 'string' ? data.detectedEmotion : 'nötr',
          reasoningTrace: data.reasoningTrace as ReasoningTrace | undefined,
          kdmResult: data.kdmResult,
          activationValues: data.activationValues,
          dynamicStateBefore: normalizeDynamicState(data.dynamicStateBefore) || undefined,
          dynamicStateAfter: normalizeDynamicState(data.dynamicStateAfter) || undefined,
          relationshipState: data.relationshipState,
          retrievedMemories: Array.isArray(data.retrievedMemories) ? data.retrievedMemories : [],
          memoryUpdate: data.memoryUpdate,
          consistency: data.consistency,
          metadata: data.metadata,
        };
      });

      // Strict chronological sorting by turnNumber (with timestamp tiebreaker)
      turns.sort((a, b) => (a.turnNumber || 0) - (b.turnNumber || 0) || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const lastTurn = turns[turns.length - 1];
      const sessionSummary: TestSessionSummary = {
        sessionId,
        userId: sessionData.userId || 'anonymous',
        userName: sessionData.userName || 'Kullanıcı',
        characterId: sessionData.characterId || 'kairo',
        createdAt: sessionData.createdAt || sessionData.updatedAt || new Date().toISOString(),
        updatedAt: sessionData.updatedAt || new Date().toISOString(),
        turnCount: turns.length,
        lastUserMessage: sessionData.lastUserMessage || lastTurn?.userMessage,
        lastAssistantReply: sessionData.lastAssistantReply || lastTurn?.assistantReply,
        dynamicState: normalizeDynamicState(sessionData.dynamicState) || lastTurn?.dynamicStateAfter,
        relationship: sessionData.relationship || lastTurn?.relationshipState,
        active: sessionData.active ?? true,
      };

      return {
        session: sessionSummary,
        summary: sessionSummary,
        turns,
        messages: turnsToTestMessages(turns),
        lastDynamicState: lastTurn?.dynamicStateAfter || sessionSummary.dynamicState,
        lastReasoningTrace: lastTurn?.reasoningTrace,
        lastConsistency: lastTurn?.consistency,
        lastTimings: lastTurn?.metadata?.timings,
        lastProviderUsed: lastTurn?.metadata?.providerUsed,
        lastWorldStateAppraisal: lastTurn?.metadata?.worldStateAppraisal,
        lastWorldReasoningPolicy: lastTurn?.metadata?.worldReasoningPolicy,
        lastWorldMemoryGuard: lastTurn?.metadata?.worldMemoryGuard,
        lastResponsePlan: lastTurn?.metadata?.responsePlan,
      };
    } catch (err) {
      console.warn('[TestSessionPersistence] loadTestSession failed:', err);
      return null;
    }
  })(), 8000, null);
}

export async function loadActiveTestSessionForUser(userId: string): Promise<RestoredTestSession | null> {
  const userScope = scope(userId);

  // 1. First check localStorage for explicit active session ID
  if (typeof window !== 'undefined' && window.localStorage) {
    const cachedId =
      window.localStorage.getItem(`kairo_active_session_${userScope}`) ||
      window.localStorage.getItem('kairo_active_session_id');
    if (cachedId) {
      const restored = await loadTestSession(cachedId);
      if (restored && restored.turns.length > 0) {
        return restored;
      }
    }
  }

  // 2. Query Firestore for active session
  return safeWithTimeout((async () => {
    try {
      const sessionsRef = collection(db, TEST_SESSIONS_COLLECTION);
      // Query recent sessions ordered by updatedAt (uses single-field index, never fails on composite indexes)
      const q = query(
        sessionsRef,
        orderBy('updatedAt', 'desc'),
        limit(25),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Match candidates in priority order:
        // Priority 1: Exact userId match or sessionId match
        let matchedDoc = snap.docs.find((d) => {
          const data = d.data();
          if (data.active === false) return false;
          return data.userId === userScope || d.id === `session_${userScope}`;
        });

        // Priority 2: Scoped match (e.g. knt_test_user_x_new contains test_user_x)
        if (!matchedDoc) {
          matchedDoc = snap.docs.find((d) => {
            const data = d.data();
            if (data.active === false) return false;
            const docUser = String(data.userId || '');
            const docId = d.id;
            return (
              docUser.includes(userScope) ||
              userScope.includes(docUser) ||
              docId.includes(userScope)
            );
          });
        }

        // Priority 3: Any active session with turns
        if (!matchedDoc) {
          matchedDoc = snap.docs.find((d) => d.data().active !== false && (d.data().turnCount ?? 0) > 0);
        }

        if (matchedDoc) {
          const foundId = matchedDoc.id;
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(`kairo_active_session_${userScope}`, foundId);
            window.localStorage.setItem('kairo_active_session_id', foundId);
          }
          return await loadTestSession(foundId);
        }
      }

      // Priority 4: Fallback standard session id
      const standardId = `session_${userScope}`;
      const standardSession = await loadTestSession(standardId);
      if (standardSession && standardSession.turns.length > 0) {
        return standardSession;
      }

      return null;
    } catch (err) {
      console.warn('[TestSessionPersistence] loadActiveTestSessionForUser query failed:', err);
      return null;
    }
  })(), 8000, null);
}

export async function clearTestSession(sessionId: string): Promise<void> {
  try {
    if (!sessionId?.trim()) return;
    const sessionRef = doc(db, TEST_SESSIONS_COLLECTION, sessionId.trim());
    // Soft-deactivate to avoid permanent data loss of prior test conversations
    await setDoc(sessionRef, { active: false, updatedAt: new Date().toISOString() }, { merge: true });

    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (window.localStorage.getItem(key) === sessionId || key.startsWith('kairo_active_session'))) {
          window.localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {
    console.warn('[TestSessionPersistence] clearTestSession failed:', err);
  }
}
