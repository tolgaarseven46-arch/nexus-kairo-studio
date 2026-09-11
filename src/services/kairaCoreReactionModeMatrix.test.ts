import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from "../types/nexus";
import { buildBehaviorContract } from "./behaviorContract";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";

const personality: DroitPersonalityTraits = {
  anger: 50, patience: 50, empathy: 50, emotionalSensitivity: 50,
  socialIntelligence: 50, selfConfidence: 50, humor: 50, communication: 50,
  charisma: 50, curiosity: 50, analyticalThinking: 50, creativity: 50,
  decisionMaking: 50, attention: 50, authority: 50, courage: 50,
  seriousness: 50, loyalty: 50, initiative: 50,
};

const fixtures = {
  neutral: { cs: "active", rm: "neutral", warmth: 60, trust: 60, hurt: 0, conflict: 0, repair: 0, attempts: 0 },
  irritated: { cs: "active", rm: "irritated", warmth: 50, trust: 50, hurt: 8, conflict: 8, repair: 0, attempts: 0 },
  hurt: { cs: "active", rm: "hurt", warmth: 65, trust: 62, hurt: 24, conflict: 18, repair: 0, attempts: 0 },
  withdrawn: { cs: "disengaged", rm: "withdrawn", warmth: 35, trust: 30, hurt: 45, conflict: 40, repair: 0, attempts: 0 },
  repairing: { cs: "repairing", rm: "repairing", warmth: 45, trust: 40, hurt: 25, conflict: 20, repair: 45, attempts: 1 },
} as const;

type Mode = keyof typeof fixtures;
type Stimulus = "neutral" | "negative" | "positive";

function state(mode: Mode): DroitDynamicState {
  const f = fixtures[mode];
  return {
    calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10,
    lastStatus: mode, reactionMode: f.rm,
    relationship: {
      warmth: f.warmth, warmthScore: f.warmth, trust: f.trust, trustScore: f.trust,
      hurtScore: f.hurt, conflictScore: f.conflict, repairProgress: f.repair,
      repairAttempts: f.attempts, conversationState: f.cs,
      interactionCount: 20, familiarityDays: 10,
    },
  };
}

function trace(mode: Mode, stimulus: Stimulus): ReasoningTrace {
  const s = state(mode);
  const r = s.relationship!;
  return {
    whoSent: { userName: "user", isNewUser: false, recognitionText: "known" },
    relationship: {
      warmthScore: r.warmth ?? 50, warmthLabel: "test", note: "matrix",
      familiarityDays: r.familiarityDays, interactionCount: r.interactionCount,
      trustScore: r.trust, conflictScore: r.conflictScore, hurtScore: r.hurtScore,
      repairProgress: r.repairProgress, conversationState: r.conversationState,
      repairAttempts: r.repairAttempts,
    },
    currentMood: { moodText: mode, reasonText: "fixture", reactionMode: s.reactionMode },
    messageInterpretation: {
      intent: stimulus, sentiment: stimulus === "negative" ? "negatif" : stimulus === "positive" ? "pozitif" : "nötr", explanation: "fixture",
    },
    decision: { chosenTone: "test", explanation: "matrix" },
    memoryUpdate: { warmthBefore: r.warmth ?? 50, warmthAfter: r.warmth ?? 50, warmthDelta: 0, moodChange: "none", reason: "matrix" },
  };
}

const cases = (Object.keys(fixtures) as Mode[]).flatMap((mode) =>
  (["neutral", "negative", "positive"] as Stimulus[]).map((stimulus) => ({ mode, stimulus })),
);

describe("relationship-derived reaction mode matrix", () => {
  it.each(cases)("$mode x $stimulus keeps style and permission authority separated", ({ mode, stimulus }) => {
    const s = state(mode);
    const t = trace(mode, stimulus);
    const speech = computeKairoSpeechIdentity(personality, s, t);
    const contract = buildBehaviorContract(s, t, { stopTalking: false, stopQuestions: false, adviceRequested: false, semanticUncertainty: 0.1 });

    expect(s.reactionMode).toBe(fixtures[mode].rm);
    expect(contract.conversationState).toBe(fixtures[mode].cs);
    expect(contract.advice).toBe("forbidden");

    if (mode === "withdrawn") {
      expect(speech.register).toBe("hurt");
      expect(contract.stance).toBe("closed");
      expect(contract.continueConversation).toBe(false);
    } else if (mode === "repairing") {
      expect(speech.register).toBe("balanced");
      expect(contract.stance).toBe("repairing-cautious");
      expect(contract.reopeningCloseness).toBe("forbidden");
    } else if (mode === "hurt") {
      expect(speech.register).toBe("hurt");
      expect(contract.stance).toBe("distant-responsive");
      expect(contract.affection).toBe("forbidden");
    } else if (mode === "irritated") {
      expect(speech.register).toBe("firm");
      expect(contract.continueConversation).toBe(true);
    } else {
      expect(contract.stance).toBe("open");
      expect(contract.continueConversation).toBe(true);
      if (stimulus === "negative") expect(speech.register).toBe("firm");
    }
  });

  it("does not let sentiment erase a derived non-neutral reaction mode", () => {
    for (const mode of ["irritated", "hurt", "withdrawn", "repairing"] as Mode[]) {
      const registers = (["neutral", "negative", "positive"] as Stimulus[]).map((stimulus) =>
        computeKairoSpeechIdentity(personality, state(mode), trace(mode, stimulus)).register,
      );
      expect(new Set(registers).size).toBe(1);
    }
  });
});
