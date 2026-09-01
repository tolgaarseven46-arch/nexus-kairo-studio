import type { DroitDynamicState } from "../types/nexus";
import type { KairaActivityMotivationKind } from "./kairaActivityPlanningPolicy";

export type KairaActivityMotivationProfile = Record<KairaActivityMotivationKind, number>;

export interface KairaActivityMotivationContext {
  /** 0 = occupied, 1 = completely free to pursue something. */
  availableBandwidth?: number;
  /** 0 = recently stimulated, 1 = under-stimulated / ready for novelty. */
  stimulationNeed?: number;
  /** 0 = socially saturated, 1 = seeking contact. */
  connectionNeed?: number;
  /** 0 = no unfinished self-directed drive, 1 = strong self-directed drive. */
  selfDirectionNeed?: number;
}

const unit = (value: unknown, fallback: number) => {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
};

const stateUnit = (value: unknown, fallback = 0.5) =>
  unit(typeof value === "number" ? value / 100 : Number.NaN, fallback);

const bounded = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Derives generic internal drives from Kaira's current state. The result knows
 * nothing about concrete activities; activity descriptors decide which drives
 * they can satisfy later in the pipeline.
 */
export function deriveKairaActivityMotivation(
  dynamicState: DroitDynamicState,
  context: KairaActivityMotivationContext = {},
): KairaActivityMotivationProfile {
  const calmness = stateUnit(dynamicState?.calmness);
  const anger = stateUnit(dynamicState?.anger);
  const stress = stateUnit(dynamicState?.stress);
  const happiness = stateUnit(dynamicState?.happiness);
  const confidence = stateUnit(dynamicState?.confidence);
  const surprise = stateUnit(dynamicState?.surprise);
  const availableBandwidth = unit(context.availableBandwidth, 0.5);
  const stimulationNeed = unit(context.stimulationNeed, 0.5);
  const connectionNeed = unit(context.connectionNeed, 0.5);
  const selfDirectionNeed = unit(context.selfDirectionNeed, 0.5);

  const strain = bounded(stress * 0.65 + anger * 0.35);
  const stability = bounded(calmness * 0.6 + (1 - stress) * 0.4);
  const positiveEnergy = bounded(happiness * 0.55 + confidence * 0.45);

  return {
    rest: bounded(strain * 0.68 + (1 - positiveEnergy) * 0.2 + availableBandwidth * 0.12),
    curiosity: bounded(stimulationNeed * 0.5 + surprise * 0.18 + stability * 0.16 + availableBandwidth * 0.16),
    recreation: bounded(positiveEnergy * 0.32 + stimulationNeed * 0.28 + availableBandwidth * 0.3 + stability * 0.1),
    growth: bounded(confidence * 0.25 + stability * 0.2 + stimulationNeed * 0.18 + selfDirectionNeed * 0.22 + availableBandwidth * 0.15),
    social: bounded(connectionNeed * 0.5 + happiness * 0.16 + confidence * 0.14 + availableBandwidth * 0.2),
    self_goal: bounded(selfDirectionNeed * 0.5 + confidence * 0.2 + stability * 0.15 + availableBandwidth * 0.15),
  };
}
