import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SemanticInterpretation } from '../types/semanticInterpretation';
const firestore = vi.hoisted(() => ({ setDoc: vi.fn(), addDoc: vi.fn(), getDocs: vi.fn() }));
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: unknown[]) => ({ kind: 'collection', args })),
  doc: vi.fn((...args: unknown[]) => ({ kind: 'doc', args })),
  getDoc: vi.fn(), getDocs: firestore.getDocs, setDoc: firestore.setDoc, addDoc: firestore.addDoc,
  deleteDoc: vi.fn(), where: vi.fn(), limit: vi.fn((value: number) => ({ kind: 'limit', value })),
  orderBy: vi.fn((...args: unknown[]) => ({ kind: 'orderBy', args })), query: vi.fn((...args: unknown[]) => ({ kind: 'query', args })),
}));
import { saveKdmInteraction } from './kdmPersistenceService';
function semantic(overrides: Partial<SemanticInterpretation>): SemanticInterpretation {
  return { schemaVersion: 'semantic-interpretation@2', raw: '', normalized: '', primaryIntent: 'other', secondarySocialActs: [], target: 'unknown', valence: 'neutral', severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 }, jokingConfidence: 0, sincerityConfidence: 1, affection: 0, support: 0, compliment: 0, emotionalLoad: 0, apology: false, repairAttempt: false, stopRequest: false, discourseFacets: { socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'none', relationalIntensity: 0, stopQuestions: false, stopTalking: false }, uncertainty: { overall: 0, intent: 0, target: 0, severity: 0 }, evidence: [], ...overrides };
}
function payload(message: string, interpretation: SemanticInterpretation) {
  return { userId: 'fresh_semantic_memory_user', lastUserMessage: message, reply: 'ok', memoryScope: 'durable_candidate' as const, semanticInterpretation: interpretation, dynamicState: { calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: 'Sakin', relationship: { warmth: 50, trust: 50, conflictScore: 0, hurtScore: 0, repairProgress: 0, repeatedNegativeCount: 0 } }, reasoningTrace: { relationship: { warmthScore: 50, trustScore: 50, conflictScore: 0, hurtScore: 0, repairProgress: 0, repeatedNegativeCount: 0 } } as any };
}
function profileWrites() { return firestore.setDoc.mock.calls.filter(([ref]) => Array.isArray(ref?.args) && ref.args.includes('kairoMemory')); }
describe('structured user-memory semantic ownership regression', () => {
  beforeEach(() => { vi.clearAllMocks(); firestore.getDocs.mockResolvedValue({ empty: true, docs: [] }); firestore.setDoc.mockResolvedValue(undefined); firestore.addDoc.mockResolvedValue({ id: 'trace' }); });
  it('does not store Kaira-directed affection as a user preference', async () => {
    await saveKdmInteraction(payload('seni seviyorum', semantic({ raw: 'seni seviyorum', normalized: 'seni seviyorum', primaryIntent: 'affection', secondarySocialActs: ['affection'], target: 'kaira', valence: 'positive', affection: 0.95, discourseFacets: { socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'closeness_bid', relationalIntensity: 0.9, stopQuestions: false, stopTalking: false } })));
    expect(profileWrites()).toHaveLength(0);
  });
  it('still stores a real non-dyadic preference statement', async () => {
    await saveKdmInteraction(payload('kahveyi seviyorum', semantic({ raw: 'kahveyi seviyorum', normalized: 'kahveyi seviyorum', target: 'event', valence: 'positive' })));
    expect(profileWrites()).toHaveLength(1);
    expect(profileWrites()[0][1].preferences).toContain('kahveyi seviyorum');
  });
});
