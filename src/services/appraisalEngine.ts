export type AppraisalEventKind =
  | "compliment"
  | "insult"
  | "apology"
  | "support"
  | "rejection"
  | "neutral";

export interface AppraisalEventObservation {
  kind: AppraisalEventKind;
  sourceId: string;
  targetIsKaira: boolean;
  valence: "positive" | "negative" | "neutral";
}

export interface AppraisalContextObservation {
  relationshipAgeMinutes: number;
  interactionCount: number;
  similarEventsFromSource: number;
  similarEventsRecentGlobal: number;
  distinctSourcesRecentGlobal: number;
  minutesSinceLastSimilarEvent: number | null;
}

export interface AppraisalIndexBreakdown {
  value: number;
  label: "low" | "medium" | "high";
  factors: Array<{
    id: string;
    label: string;
    observed: number | string;
    contribution: number;
  }>;
}

export interface AppraisalResult {
  event: AppraisalEventObservation;
  context: AppraisalContextObservation;
  novelty: AppraisalIndexBreakdown;
  expectedness: AppraisalIndexBreakdown;
  positivePredictionError: number;
  coordinationSignal: number;
  notes: string[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000;

const labelFor = (value: number): AppraisalIndexBreakdown["label"] => {
  if (value < 0.34) return "low";
  if (value < 0.67) return "medium";
  return "high";
};

/**
 * Experimental engineering proxy, not a biological measurement.
 * It deliberately uses observable counts/timing only so every output can be audited.
 */
export const computeNovelty = (
  context: AppraisalContextObservation,
): AppraisalIndexBreakdown => {
  const sourceRepetition = clamp01(context.similarEventsFromSource / 4);
  const globalRepetition = clamp01(context.similarEventsRecentGlobal / 10);
  const recency =
    context.minutesSinceLastSimilarEvent == null
      ? 0
      : clamp01(1 - context.minutesSinceLastSimilarEvent / 60);

  const repetitionPressure =
    sourceRepetition * 0.5 + globalRepetition * 0.3 + recency * 0.2;
  const value = round3(clamp01(1 - repetitionPressure));

  return {
    value,
    label: labelFor(value),
    factors: [
      {
        id: "source-repetition",
        label: "Aynı kişiden benzer olay",
        observed: context.similarEventsFromSource,
        contribution: round3(-sourceRepetition * 0.5),
      },
      {
        id: "global-repetition",
        label: "Yakın zamanda benzer olay",
        observed: context.similarEventsRecentGlobal,
        contribution: round3(-globalRepetition * 0.3),
      },
      {
        id: "recency",
        label: "Son benzer olaya yakınlık",
        observed:
          context.minutesSinceLastSimilarEvent == null
            ? "ilk gözlem"
            : `${context.minutesSinceLastSimilarEvent} dk`,
        contribution: round3(-recency * 0.2),
      },
    ],
  };
};

/**
 * Expectedness is a learned-context index: repeated events from the same source
 * become more expected. Relationship age alone does not create expectation.
 */
export const computeExpectedness = (
  context: AppraisalContextObservation,
): AppraisalIndexBreakdown => {
  const sourceHistory = clamp01(context.similarEventsFromSource / 5);
  const interactionEvidence = clamp01(context.interactionCount / 40);
  const recencyEvidence =
    context.minutesSinceLastSimilarEvent == null
      ? 0
      : clamp01(1 - context.minutesSinceLastSimilarEvent / (24 * 60));

  const value = round3(
    clamp01(
      sourceHistory * 0.65 + interactionEvidence * 0.15 + recencyEvidence * 0.2,
    ),
  );

  return {
    value,
    label: labelFor(value),
    factors: [
      {
        id: "source-history",
        label: "Kaynak geçmişi",
        observed: context.similarEventsFromSource,
        contribution: round3(sourceHistory * 0.65),
      },
      {
        id: "interaction-evidence",
        label: "Etkileşim kanıtı",
        observed: context.interactionCount,
        contribution: round3(interactionEvidence * 0.15),
      },
      {
        id: "recency-evidence",
        label: "Yakın zamanlı tekrar",
        observed:
          context.minutesSinceLastSimilarEvent == null
            ? "yok"
            : `${context.minutesSinceLastSimilarEvent} dk`,
        contribution: round3(recencyEvidence * 0.2),
      },
    ],
  };
};

export const computeCoordinationSignal = (
  context: AppraisalContextObservation,
): number => {
  if (context.similarEventsRecentGlobal < 3 || context.distinctSourcesRecentGlobal < 3) {
    return 0;
  }

  const volume = clamp01((context.similarEventsRecentGlobal - 2) / 8);
  const sourceSpread = clamp01((context.distinctSourcesRecentGlobal - 2) / 6);
  return round3(clamp01(volume * 0.55 + sourceSpread * 0.45));
};

export const appraiseEventV0 = (
  event: AppraisalEventObservation,
  context: AppraisalContextObservation,
): AppraisalResult => {
  const novelty = computeNovelty(context);
  const expectedness = computeExpectedness(context);
  const coordinationSignal = computeCoordinationSignal(context);

  // Positive RPE proxy is only meaningful for positive events in this first slice.
  const positivePredictionError =
    event.valence === "positive"
      ? round3(clamp01((1 - expectedness.value) * novelty.value * (1 - coordinationSignal)))
      : 0;

  const notes: string[] = [];
  if (context.similarEventsFromSource === 0) notes.push("Kaynak için ilk benzer olay.");
  if (coordinationSignal >= 0.5) notes.push("Koordine tekrar/trolleme adayı: sosyal ödül öğrenmesi baskılanmalı.");
  if (novelty.value <= 0.25) notes.push("Olayın yenilik değeri büyük ölçüde sönmüş.");

  return {
    event,
    context,
    novelty,
    expectedness,
    positivePredictionError,
    coordinationSignal,
    notes,
  };
};
