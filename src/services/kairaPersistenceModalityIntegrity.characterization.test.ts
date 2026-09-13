import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  setDoc: vi.fn(async () => undefined),
  addDoc: vi.fn(async () => undefined),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  deleteDoc: vi.fn(async () => undefined),
  doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
  collection: vi.fn((...args: unknown[]) => ({
    path: [
      typeof args[0] === 'object' && args[0] && 'path' in args[0]
        ? (args[0] as { path: string }).path
        : String(args[0]),
      ...args.slice(1).map(String),
    ].join('/'),
  })),
  query: vi.fn((value: unknown) => value),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => firestore);
vi.mock('../lib/firebase', () => ({ db: { path: 'db' } }));

import { saveKdmInteraction } from './kdmPersistenceService';
import type { SemanticModality } from '../types/semanticInterpretation';

const dynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin ve kontrollü',
};

const reasoningTrace = {
  relationship: {
    warmthScore: 50,
    trustScore: 50,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
  },
};

function semanticWithModality(modality: SemanticModality) {
  return {
    target: 'self',
    propositions: [
      {
        id: `p-${modality}`,
        content: 'planım yarın istifa etmek',
        actorId: 'user',
        modality,
        confidence: 0.95,
        provenance: ['characterization-test'],
      },
    ],
  };
}

function durableProfileWrites() {
  return firestore.setDoc.mock.calls.filter(([ref]) =>
    typeof ref === 'object'
    && ref !== null
    && 'path' in ref
    && String((ref as { path: string }).path).startsWith('kairoMemory/'),
  );
}

describe('persistence integrity gate characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<SemanticModality>(['question', 'hypothetical', 'wish', 'prediction'])(
    'does not persist a %s proposition as a durable user goal solely because raw text matches a memory regex',
    async (modality) => {
      await saveKdmInteraction({
        dynamicState: dynamicState as any,
        reasoningTrace: reasoningTrace as any,
        lastUserMessage: 'planım yarın istifa etmek',
        reply: 'tamam',
        userId: 'persistence-integrity-user',
        memoryScope: 'durable_candidate',
        semanticInterpretation: semanticWithModality(modality) as any,
      });

      expect(durableProfileWrites()).toHaveLength(0);
    },
  );
});
