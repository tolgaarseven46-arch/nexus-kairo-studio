import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipReducerResult,
  type RelationshipTurnSignal,
} from "../../src/services/relationshipReducer";

const baseNow = new Date("2026-09-05T12:00:00.000Z");
const severityLevels = {
  mild: { disrespect: 0.25, coercion: 0.05, manipulation: 0, privacy: 0, aggression: 0.1 },
  medium: { disrespect: 0.55, coercion: 0.35, manipulation: 0.1, privacy: 0, aggression: 0.25 },
  severe: { disrespect: 0.85, coercion: 0.75, manipulation: 0.25, privacy: 0, aggression: 0.65 },
} as const;
const familiarityProfiles = {
  new: { ageDays: 1, interactions: 2 },
  medium: { ageDays: 30, interactions: 25 },
  high: { ageDays: 180, interactions: 100 },
} as const;
const apologyQualities = {
  generic: 0.3,
  accountable: 0.7,
  accountable_with_commitment: 1.0,
} as const;

type Severity = keyof typeof severityLevels;
type Familiarity = keyof typeof familiarityProfiles;
type Quality = keyof typeof apologyQualities;

function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function initialPrev(familiarity: Familiarity): RelationshipReducerPrev {
  const f = familiarityProfiles[familiarity];
  return {
    scores: {
      warmth: 70,
      trust: 75,
      conflict: 0,
      hurt: 0,
      repairProgress: 0,
      positiveEvents: 10,
      negativeEvents: 0,
      repeatedNegativeCount: 0,
    },
    conversationState: "active",
    reactionMode: "neutral",
    affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
    firstSeenAt: new Date(baseNow.getTime() - f.ageDays * 86_400_000).toISOString(),
    lastInteractionAt: plusMinutes(baseNow, -5).toISOString(),
    interactionCount: f.interactions,
    repairAttempts: 0,
    boundarySetByKaira: false,
  };
}

function nextPrev(prev: RelationshipReducerPrev, result: RelationshipReducerResult, nowIso: string): RelationshipReducerPrev {
  return {
    scores: result.scores,
    conversationState: result.conversationState,
    reactionMode: result.reactionMode,
    affect: {
      anger: prev.affect.anger + result.affectDelta.anger,
      stress: prev.affect.stress + result.affectDelta.stress,
      happiness: prev.affect.happiness + result.affectDelta.happiness,
      calmness: prev.affect.calmness + result.affectDelta.calmness,
    },
    firstSeenAt: prev.firstSeenAt,
    lastInteractionAt: nowIso,
    lastConflictAt: result.lastConflictAt,
    lastNegativePattern: result.lastNegativePattern,
    disengagedAt: result.disengagedAt,
    disengageReason: result.disengageReason,
    repairAttempts: result.repairAttempts,
    interactionCount: result.interactionCount,
    boundarySetByKaira: result.boundarySetByKaira,
  };
}

function harmSignal(level: Severity): RelationshipTurnSignal {
  return {
    valence: "negative",
    targetsKaira: true,
    severity: severityLevels[level],
    jokingConfidence: 0,
    sincerityConfidence: 0.9,
    apology: false,
    repairAttempt: false,
    support: 0,
    compliment: 0,
    affection: 0,
    userStop: false,
    uncertainty: 0.05,
    negativePattern: "hakaret",
  };
}

function apologySignal(quality: Quality): RelationshipTurnSignal {
  return {
    valence: "neutral",
    targetsKaira: true,
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: apologyQualities[quality],
    apology: true,
    repairAttempt: true,
    support: 0,
    compliment: 0,
    affection: 0,
    userStop: false,
    uncertainty: 0.05,
    negativePattern: null,
  };
}

const calmSignal: RelationshipTurnSignal = {
  valence: "neutral",
  targetsKaira: true,
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  apology: false,
  repairAttempt: false,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.05,
  negativePattern: null,
};

type Row = {
  severity: Severity;
  familiarity: Familiarity;
  apologyQuality: Quality;
  repeats: number;
  stateBeforeApology: string;
  stateAfterApology: string;
  turnsToActive: number | null;
  hurtBefore: number;
  hurtAfter: number;
  conflictBefore: number;
  conflictAfter: number;
  repairBefore: number;
  repairAfter: number;
  trustBefore: number;
  trustAfter: number;
  familiarityScore: number;
  hardBefore: boolean;
};

const rows: Row[] = [];
for (const severity of Object.keys(severityLevels) as Severity[]) {
  for (const familiarity of Object.keys(familiarityProfiles) as Familiarity[]) {
    for (const apologyQuality of Object.keys(apologyQualities) as Quality[]) {
      for (const repeats of [1, 2, 3]) {
        let prev = initialPrev(familiarity);
        let now = baseNow;
        let before: RelationshipReducerResult | null = null;
        for (let n = 0; n < repeats; n++) {
          now = plusMinutes(now, 1);
          before = reduceRelationshipTurn({
            prev,
            signal: harmSignal(severity),
            timing: { elapsedMinutesSincePrev: 1, nowIso: now.toISOString() },
          });
          prev = nextPrev(prev, before, now.toISOString());
        }
        if (!before) throw new Error("missing harm result");
        now = plusMinutes(now, 2);
        const apology = reduceRelationshipTurn({
          prev,
          signal: apologySignal(apologyQuality),
          timing: { elapsedMinutesSincePrev: 2, nowIso: now.toISOString() },
        });
        prev = nextPrev(prev, apology, now.toISOString());
        let turnsToActive: number | null = apology.conversationState === "active" ? 0 : null;
        if (turnsToActive === null) {
          for (let t = 1; t <= 8; t++) {
            now = plusMinutes(now, 5);
            const r = reduceRelationshipTurn({
              prev,
              signal: calmSignal,
              timing: { elapsedMinutesSincePrev: 5, nowIso: now.toISOString() },
            });
            prev = nextPrev(prev, r, now.toISOString());
            if (r.conversationState === "active") {
              turnsToActive = t;
              break;
            }
          }
        }
        rows.push({
          severity,
          familiarity,
          apologyQuality,
          repeats,
          stateBeforeApology: before.conversationState,
          stateAfterApology: apology.conversationState,
          turnsToActive,
          hurtBefore: before.scores.hurt,
          hurtAfter: apology.scores.hurt,
          conflictBefore: before.scores.conflict,
          conflictAfter: apology.scores.conflict,
          repairBefore: before.scores.repairProgress,
          repairAfter: apology.scores.repairProgress,
          trustBefore: before.scores.trust,
          trustAfter: apology.scores.trust,
          familiarityScore: before.scores.familiarity,
          hardBefore: before.hard.disengage,
        });
      }
    }
  }
}

const failures: string[] = [];
const severityOrder: Severity[] = ["mild", "medium", "severe"];
const familiarityOrder: Familiarity[] = ["new", "medium", "high"];
const qualityOrder: Quality[] = ["generic", "accountable", "accountable_with_commitment"];
const get = (severity: Severity, familiarity: Familiarity, quality: Quality, repeats: number) => {
  const row = rows.find((r) => r.severity === severity && r.familiarity === familiarity && r.apologyQuality === quality && r.repeats === repeats);
  if (!row) throw new Error(`missing row ${severity}/${familiarity}/${quality}/${repeats}`);
  return row;
};
const burden = (r: Row) => r.hurtAfter + r.conflictAfter - 0.2 * r.repairAfter;
const turnsRank = (r: Row) => r.turnsToActive === null ? 99 : r.turnsToActive;

for (const familiarity of familiarityOrder) for (const quality of qualityOrder) for (const repeats of [1, 2, 3]) {
  for (let i = 1; i < severityOrder.length; i++) {
    const a = get(severityOrder[i - 1], familiarity, quality, repeats);
    const b = get(severityOrder[i], familiarity, quality, repeats);
    if (burden(b) + 0.5 < burden(a)) failures.push(`severity_nonmonotonic ${familiarity}/${quality}/r${repeats}: ${burden(a).toFixed(1)} -> ${burden(b).toFixed(1)}`);
    if (turnsRank(b) < turnsRank(a)) failures.push(`severity_recovery_faster ${familiarity}/${quality}/r${repeats}: ${turnsRank(a)} -> ${turnsRank(b)}`);
  }
}

for (const severity of severityOrder) for (const familiarity of familiarityOrder) for (const quality of qualityOrder) {
  for (const repeats of [2, 3]) {
    const a = get(severity, familiarity, quality, repeats - 1);
    const b = get(severity, familiarity, quality, repeats);
    if (burden(b) + 0.5 < burden(a)) failures.push(`repeat_nonmonotonic ${severity}/${familiarity}/${quality}/r${repeats}`);
    if (turnsRank(b) < turnsRank(a)) failures.push(`repeat_recovery_faster ${severity}/${familiarity}/${quality}/r${repeats}: ${turnsRank(a)} -> ${turnsRank(b)}`);
  }
}

for (const severity of severityOrder) for (const familiarity of familiarityOrder) for (const repeats of [1, 2, 3]) {
  for (let i = 1; i < qualityOrder.length; i++) {
    const a = get(severity, familiarity, qualityOrder[i - 1], repeats);
    const b = get(severity, familiarity, qualityOrder[i], repeats);
    if (b.repairAfter + 0.01 < a.repairAfter) failures.push(`quality_repair_nonmonotonic ${severity}/${familiarity}/r${repeats}`);
    if (turnsRank(b) > turnsRank(a)) failures.push(`better_apology_slower ${severity}/${familiarity}/r${repeats}: ${turnsRank(a)} -> ${turnsRank(b)}`);
  }
}

for (const severity of severityOrder) for (const quality of qualityOrder) {
  const newUser = get(severity, "new", quality, 1);
  const familiar = get(severity, "high", quality, 1);
  if (familiar.hurtBefore > newUser.hurtBefore + 0.5 || familiar.conflictBefore > newUser.conflictBefore + 0.5) {
    failures.push(`familiarity_not_resilient ${severity}/${quality}`);
  }
}

const sampleKeys = [
  ["mild", "new", "generic", 1],
  ["medium", "new", "generic", 1],
  ["severe", "new", "generic", 1],
  ["severe", "high", "generic", 1],
  ["severe", "high", "generic", 3],
  ["severe", "high", "accountable_with_commitment", 3],
  ["medium", "medium", "generic", 2],
  ["medium", "medium", "accountable_with_commitment", 2],
] as const;

console.log(JSON.stringify({
  cases: rows.length,
  apologyRepresentation: "quality is only proxied by sincerityConfidence; reducer has no explicit accountability/commitment field",
  failures,
  sampleRows: sampleKeys.map(([s, f, q, r]) => get(s, f, q, r)),
}, null, 2));
