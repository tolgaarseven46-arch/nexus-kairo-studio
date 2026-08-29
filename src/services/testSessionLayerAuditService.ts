import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface TestSessionLayerAudit {
  semanticEvent?: unknown;
  semanticSource?: string;
  languageUnderstanding?: {
    semanticProvider?: string;
    morphologyProvider?: string;
    morphology?: unknown;
    warnings?: string[];
  };
  appraisalTemperament?: unknown;
  personalityTendency?: unknown;
  motivation?: unknown;
  values?: unknown;
  preferences?: unknown;
  socialOrientation?: unknown;
  boundaries?: unknown;
  expressionStyle?: unknown;
  behaviorDecision?: unknown;
  behaviorPressures?: unknown;
  rawDynamicStateBefore?: unknown;
  temperamentAdjustedState?: unknown;
  recordedAt: string;
}

/**
 * Adds client-side layer snapshots to the exact server-created turn.
 * Dot-path update keeps existing kdmResult siblings (tone/score/decision) intact.
 */
export async function saveTestSessionLayerAudit(
  sessionId: string | undefined,
  turnId: string | undefined,
  audit: Omit<TestSessionLayerAudit, "recordedAt">,
): Promise<void> {
  if (!sessionId?.trim() || !turnId?.trim()) return;
  try {
    const turnRef = doc(db, "testSessions", sessionId.trim(), "turns", turnId.trim());
    await updateDoc(turnRef, {
      "kdmResult.layerAudit": {
        ...audit,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn("[TestSessionLayerAudit] save skipped:", error);
  }
}
