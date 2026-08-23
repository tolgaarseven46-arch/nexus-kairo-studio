import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  DroitPersonalityTraits,
  StructuredDroitPersonality,
} from '../types/nexus';

const COLLECTION_NAME = 'characters';
const DEFAULT_KAIRO_DOC_ID = 'kairo';

export const DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = {
  // DUYGUSAL
  anger: 50,
  patience: 50,
  empathy: 50,
  emotionalSensitivity: 50,

  // SOSYAL
  socialIntelligence: 50,
  selfConfidence: 50,
  humor: 50,
  communication: 50,
  charisma: 50,

  // ZİHİNSEL
  curiosity: 50,
  analyticalThinking: 50,
  creativity: 50,
  decisionMaking: 50,
  attention: 50,

  // KARAKTER
  authority: 50,
  courage: 50,
  seriousness: 50,
  loyalty: 50,
  initiative: 50,
};

/**
 * Converts flat frontend traits to the exact structured hierarchy required:
 * personality:
 *   emotional: { anger, patience, empathy, sensitivity }
 *   social: { socialIntelligence, confidence, humor, communication, charisma }
 *   cognitive: { curiosity, analyticalThinking, creativity, decisionMaking, attention }
 *   character: { authority, courage, seriousness, loyalty, initiative }
 */
export function traitsToStructuredPersonality(
  traits: DroitPersonalityTraits
): StructuredDroitPersonality {
  return {
    emotional: {
      anger: Number(traits.anger ?? 50),
      patience: Number(traits.patience ?? 50),
      empathy: Number(traits.empathy ?? 50),
      sensitivity: Number(traits.emotionalSensitivity ?? traits.sensitivity ?? 50),
    },
    social: {
      socialIntelligence: Number(traits.socialIntelligence ?? 50),
      confidence: Number(traits.selfConfidence ?? traits.confidence ?? 50),
      humor: Number(traits.humor ?? 50),
      communication: Number(traits.communication ?? 50),
      charisma: Number(traits.charisma ?? 50),
    },
    cognitive: {
      curiosity: Number(traits.curiosity ?? 50),
      analyticalThinking: Number(
        traits.analyticalThinking ?? traits.analytical ?? 50
      ),
      creativity: Number(traits.creativity ?? 50),
      decisionMaking: Number(
        traits.decisionMaking ?? traits.decisiveness ?? 50
      ),
      attention: Number(traits.attention ?? 50),
    },
    character: {
      authority: Number(traits.authority ?? 50),
      courage: Number(traits.courage ?? 50),
      seriousness: Number(traits.seriousness ?? 50),
      loyalty: Number(traits.loyalty ?? 50),
      initiative: Number(traits.initiative ?? 50),
    },
  };
}

/**
 * Extracts and maps Firestore data into DroitPersonalityTraits
 */
export function structuredPersonalityToTraits(
  rawPersonality: any,
  fallback: DroitPersonalityTraits = DEFAULT_PERSONALITY_TRAITS
): DroitPersonalityTraits {
  if (!rawPersonality || typeof rawPersonality !== 'object') {
    return { ...fallback };
  }

  // Check if it's already in the 4-category nested structure
  const emo = rawPersonality.emotional || {};
  const soc = rawPersonality.social || {};
  const cog = rawPersonality.cognitive || {};
  const cha = rawPersonality.character || {};

  return {
    // DUYGUSAL
    anger: typeof emo.anger === 'number' ? emo.anger : (rawPersonality.anger ?? fallback.anger),
    patience: typeof emo.patience === 'number' ? emo.patience : (rawPersonality.patience ?? fallback.patience),
    empathy: typeof emo.empathy === 'number' ? emo.empathy : (rawPersonality.empathy ?? fallback.empathy),
    emotionalSensitivity:
      typeof emo.sensitivity === 'number'
        ? emo.sensitivity
        : (rawPersonality.emotionalSensitivity ?? rawPersonality.sensitivity ?? fallback.emotionalSensitivity),

    // SOSYAL
    socialIntelligence:
      typeof soc.socialIntelligence === 'number'
        ? soc.socialIntelligence
        : (rawPersonality.socialIntelligence ?? fallback.socialIntelligence),
    selfConfidence:
      typeof soc.confidence === 'number'
        ? soc.confidence
        : (rawPersonality.selfConfidence ?? rawPersonality.confidence ?? fallback.selfConfidence),
    humor: typeof soc.humor === 'number' ? soc.humor : (rawPersonality.humor ?? fallback.humor),
    communication:
      typeof soc.communication === 'number'
        ? soc.communication
        : (rawPersonality.communication ?? fallback.communication),
    charisma:
      typeof soc.charisma === 'number'
        ? soc.charisma
        : (rawPersonality.charisma ?? fallback.charisma),

    // ZİHİNSEL
    curiosity:
      typeof cog.curiosity === 'number'
        ? cog.curiosity
        : (rawPersonality.curiosity ?? fallback.curiosity),
    analyticalThinking:
      typeof cog.analyticalThinking === 'number'
        ? cog.analyticalThinking
        : (rawPersonality.analyticalThinking ?? rawPersonality.analytical ?? fallback.analyticalThinking),
    creativity:
      typeof cog.creativity === 'number'
        ? cog.creativity
        : (rawPersonality.creativity ?? fallback.creativity),
    decisionMaking:
      typeof cog.decisionMaking === 'number'
        ? cog.decisionMaking
        : (rawPersonality.decisionMaking ?? rawPersonality.decisiveness ?? fallback.decisionMaking),
    attention:
      typeof cog.attention === 'number'
        ? cog.attention
        : (rawPersonality.attention ?? fallback.attention),

    // KARAKTER
    authority:
      typeof cha.authority === 'number'
        ? cha.authority
        : (rawPersonality.authority ?? fallback.authority),
    courage:
      typeof cha.courage === 'number'
        ? cha.courage
        : (rawPersonality.courage ?? fallback.courage),
    seriousness:
      typeof cha.seriousness === 'number'
        ? cha.seriousness
        : (rawPersonality.seriousness ?? fallback.seriousness),
    loyalty:
      typeof cha.loyalty === 'number'
        ? cha.loyalty
        : (rawPersonality.loyalty ?? fallback.loyalty),
    initiative:
      typeof cha.initiative === 'number'
        ? cha.initiative
        : (rawPersonality.initiative ?? fallback.initiative),
  };
}

export const droitPersonalityService = {
  /**
   * Loads Kairo's personality from Firestore.
   * If not found, returns the default values and creates / returns the doc ID.
   */
  async loadKairoPersonality(): Promise<{
    traits: DroitPersonalityTraits;
    docId: string;
  }> {
    try {
      // 1. Try reading directly by ID 'kairo'
      const kairoDocRef = doc(db, COLLECTION_NAME, DEFAULT_KAIRO_DOC_ID);
      const kairoDocSnap = await getDoc(kairoDocRef);

      if (kairoDocSnap.exists()) {
        const data = kairoDocSnap.data();
        const traits = structuredPersonalityToTraits(
          data?.personality,
          DEFAULT_PERSONALITY_TRAITS
        );
        return { traits, docId: kairoDocSnap.id };
      }

      // 2. Try querying by name 'KAIRO' or 'Kairo'
      const charsRef = collection(db, COLLECTION_NAME);
      const q = query(charsRef, where('name', '==', 'KAIRO'), limit(1));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const matchedDoc = querySnap.docs[0];
        const data = matchedDoc.data();
        const traits = structuredPersonalityToTraits(
          data?.personality,
          DEFAULT_PERSONALITY_TRAITS
        );
        return { traits, docId: matchedDoc.id };
      }

      // 3. Check for any first character document if available
      const allQuery = query(charsRef, limit(1));
      const allSnap = await getDocs(allQuery);
      if (!allSnap.empty) {
        const matchedDoc = allSnap.docs[0];
        const data = matchedDoc.data();
        if (data?.personality) {
          const traits = structuredPersonalityToTraits(
            data.personality,
            DEFAULT_PERSONALITY_TRAITS
          );
          return { traits, docId: matchedDoc.id };
        }
      }

      // 4. Default fallback if no record exists yet in Firestore
      return {
        traits: { ...DEFAULT_PERSONALITY_TRAITS },
        docId: DEFAULT_KAIRO_DOC_ID,
      };
    } catch (error) {
      console.warn('Error loading Kairo personality from Firestore:', error);
      return {
        traits: { ...DEFAULT_PERSONALITY_TRAITS },
        docId: DEFAULT_KAIRO_DOC_ID,
      };
    }
  },

  /**
   * Saves Kairo's personality to Firestore in the requested structured format.
   */
  async saveKairoPersonality(
    traits: DroitPersonalityTraits,
    docId: string = DEFAULT_KAIRO_DOC_ID
  ): Promise<void> {
    const structuredPersonality = traitsToStructuredPersonality(traits);
    const targetId = docId || DEFAULT_KAIRO_DOC_ID;
    const targetDocRef = doc(db, COLLECTION_NAME, targetId);

    const payload = {
      name: 'KAIRO',
      status: 'Active',
      personality: structuredPersonality,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(targetDocRef, payload, { merge: true });
  },
};
