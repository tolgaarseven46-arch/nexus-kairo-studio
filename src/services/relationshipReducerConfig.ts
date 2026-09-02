/**
 * Typed loader + defaults for the canonical RelationshipReducer weights
 * (ADR-0006). The committed defaults mirror config/relationship-reducer.json.
 * PR6 calibrates the JSON from fixtures/telemetry; no other module hardcodes
 * these numbers.
 */

export interface RedlinePolicyConfig {
  hardStopThreshold: number;
  minCombinedSignals: number;
  soloSignalCap: number;
  weights: {
    disrespect: number;
    coercion: number;
    aggression: number;
    manipulation: number;
    privacy: number;
    targetsKaira: number;
    repetition: number;
    priorBoundarySet: number;
  };
  jokingDampen: number;
  uncertaintyDampen: number;
  signalFloor: number;
}

export interface RelationshipReducerConfig {
  version: number;
  familiarity: {
    ageScaleDays: number;
    ageWeight: number;
    countScale: number;
    countWeight: number;
  };
  maturityDamping: {
    familiarityWeight: number;
    interactionWeight: number;
    interactionsForMature: number;
    maxDamping: number;
  };
  redline: RedlinePolicyConfig;
  injury: {
    baseConflict: number;
    baseHurt: number;
    baseRepairLoss: number;
    severityFloor: number;
    severityWeight: number;
    repetitionAmplify: number;
    repetitionCap: number;
    goodHistoryAbsorb: number;
    warmthDeltaBase: number;
    warmthDeltaPositive: number;
    warmthDeltaSupport: number;
    warmthDeltaInsult: number;
  };
  recovery: {
    timeDecayPerMin: number;
    timeWeight: number;
    interactionWeight: number;
    maxSingleTurnRecovery: number;
    apologyStrength: number;
    calmTurnStrength: number;
    positiveTurnStrength: number;
    nonRepetitionStrength: number;
    conflictDecayScale: number;
    hurtDecayScale: number;
    repairGainApology: number;
    repairGainCalm: number;
    repairGainPositive: number;
  };
  warmthHomeostasis: {
    baseline: number;
    driftPerCalmTurn: number;
  };
  conversationState: {
    distancingConflict: number;
    distancingHurt: number;
    activeFromDistancingConflict: number;
    activeFromDistancingHurt: number;
    repairingRepairProgress: number;
    activeFromRepairingRepairProgress: number;
    activeFromRepairingInjury: number;
  };
  axes: {
    warmth: { warmth: number; trust: number; repair: number; hurtPenalty: number };
    guardedness: {
      conflict: number;
      hurt: number;
      withdrawn: number;
      hurtMode: number;
      irritated: number;
      hardDisengage: number;
      uncertaintyRelief: number;
    };
    openness: {
      distancingPenalty: number;
      softDisengagePenalty: number;
      hardDisengagePenalty: number;
      uncertaintyRelief: number;
    };
  };
  affect: {
    withdrawnMaxStressPerTurn: number;
    hurtMaxStressPerTurn: number;
    irritatedMaxStressPerTurn: number;
    towardBaselineStep: number;
  };
}

export const DEFAULT_RELATIONSHIP_REDUCER_CONFIG: RelationshipReducerConfig = {
  version: 1,
  familiarity: { ageScaleDays: 21, ageWeight: 0.55, countScale: 25, countWeight: 0.55 },
  maturityDamping: {
    familiarityWeight: 0.55,
    interactionWeight: 0.45,
    interactionsForMature: 40,
    maxDamping: 0.5,
  },
  redline: {
    hardStopThreshold: 0.78,
    minCombinedSignals: 2,
    soloSignalCap: 0.6,
    weights: {
      disrespect: 0.9,
      coercion: 0.85,
      aggression: 0.6,
      manipulation: 0.55,
      privacy: 0.7,
      targetsKaira: 0.35,
      repetition: 0.45,
      priorBoundarySet: 0.4,
    },
    jokingDampen: 0.8,
    uncertaintyDampen: 0.6,
    signalFloor: 0.2,
  },
  injury: {
    baseConflict: 8,
    baseHurt: 12,
    baseRepairLoss: 8,
    severityFloor: 0.4,
    severityWeight: 0.6,
    repetitionAmplify: 0.22,
    repetitionCap: 2.0,
    goodHistoryAbsorb: 0.35,
    warmthDeltaBase: -3,
    warmthDeltaPositive: 2,
    warmthDeltaSupport: 2,
    warmthDeltaInsult: -5,
  },
  recovery: {
    timeDecayPerMin: 0.03,
    timeWeight: 0.45,
    interactionWeight: 0.55,
    maxSingleTurnRecovery: 0.5,
    apologyStrength: 0.35,
    calmTurnStrength: 0.12,
    positiveTurnStrength: 0.18,
    nonRepetitionStrength: 0.08,
    conflictDecayScale: 22,
    hurtDecayScale: 26,
    repairGainApology: 12,
    repairGainCalm: 3,
    repairGainPositive: 4,
  },
  warmthHomeostasis: { baseline: 50, driftPerCalmTurn: 0.6 },
  conversationState: {
    distancingConflict: 18,
    distancingHurt: 22,
    activeFromDistancingConflict: 10,
    activeFromDistancingHurt: 15,
    repairingRepairProgress: 20,
    activeFromRepairingRepairProgress: 34,
    activeFromRepairingInjury: 12,
  },
  axes: {
    warmth: { warmth: 0.6, trust: 0.25, repair: 0.15, hurtPenalty: 0.2 },
    guardedness: {
      conflict: 0.3,
      hurt: 0.3,
      withdrawn: 0.5,
      hurtMode: 0.35,
      irritated: 0.2,
      hardDisengage: 0.4,
      uncertaintyRelief: 0.35,
    },
    openness: {
      distancingPenalty: 0.25,
      softDisengagePenalty: 0.4,
      hardDisengagePenalty: 0.85,
      uncertaintyRelief: 0.3,
    },
  },
  affect: {
    withdrawnMaxStressPerTurn: 4,
    hurtMaxStressPerTurn: 4,
    irritatedMaxStressPerTurn: 4,
    towardBaselineStep: 1,
  },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!isObject(override)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    if (isObject(current) && isObject(value)) {
      out[key] = deepMerge(current, value as DeepPartial<unknown>);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

/** Merge a (possibly partial / JSON-loaded) override onto the committed defaults. */
export function resolveRelationshipReducerConfig(
  override?: DeepPartial<RelationshipReducerConfig>,
): RelationshipReducerConfig {
  return deepMerge(DEFAULT_RELATIONSHIP_REDUCER_CONFIG, override);
}
