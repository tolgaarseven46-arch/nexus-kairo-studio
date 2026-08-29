import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface TestSessionLayerAudit {
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
 * Adds the client-side layer snapshots to the exact server-created turn.
 * Merge semantics preserve the canonical server KDM/memory/response record.
 */
export async function saveTestSessionLayerAudit(
  sessionId: string | undefined,
  turnId: string | undefined,
  audit: Omit<TestSessionLayerAudit, "recordedAt">,
): Promise<void> {
  if (!sessionId?.trim() || !turnId?.trim()) return;
  try {
    const turnRef = doc(db, "testSessions", sessionId.trim(), "turns", turnId.trim());
    await setDoc(
      turnRef,
      {
        layerAudit: {
          ...audit,
          recordedAt: new Date().toISOString(),
        },
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("[TestSessionLayerAudit] save skipped:", error);
  }
}
