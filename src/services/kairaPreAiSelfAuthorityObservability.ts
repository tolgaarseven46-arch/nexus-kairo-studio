import type { KairaPreAiSelfEpistemicCheck } from "./kairaPreAiAudit";
import type {
  KairaAutobiographicalRecallRuntimeResult,
  KairaAutobiographicalRecallRuntimeStatus,
} from "./kairaAutobiographicalRecallRuntime";

export type KairaPreAiSelfAuthorityFacet =
  | "current_self_world"
  | "autobiography"
  | "session_provenance";

export type KairaPreAiSelfAuthorityStatus =
  | "available"
  | "unavailable"
  | KairaAutobiographicalRecallRuntimeStatus;

export type KairaPreAiSelfAuthorityObservation =
  | {
      facet: "current_self_world";
      status: "unavailable";
      source: "phase0_no_canonical_current_self_world_authority";
      instruction: string;
      selfEpistemic: KairaPreAiSelfEpistemicCheck;
    }
  | {
      facet: "autobiography";
      status: KairaAutobiographicalRecallRuntimeStatus;
      source: "kaira_autobiographical_recall_runtime";
      instruction: string;
      selfEpistemic: KairaPreAiSelfEpistemicCheck;
    }
  | {
      facet: "session_provenance";
      status: "available";
      source: "phase0_session_history";
      historyTurnCount: number;
      instruction: "";
      selfEpistemic: KairaPreAiSelfEpistemicCheck;
    };

function autobiographicalConfidence(runtime: KairaAutobiographicalRecallRuntimeResult) {
  if (runtime.status !== "resolved" || !runtime.recall) return 0;
  return Math.max(
    0,
    ...runtime.recall.selfFacts.map((item) => Number(item.fact.confidence ?? 0)),
    ...(runtime.recall.memories.length ? [1] : []),
  );
}

/**
 * Phase-0 A-cluster coverage is selected by the scenario's declared test facet,
 * never by reparsing user text. The adapter projects only real runtime evidence:
 * autobiographical recall, actual harness session history, or an explicit
 * fail-closed unavailable state when Phase 0 has no canonical current-self/world
 * authority wired in.
 */
export function projectPreAiSelfAuthorityObservation(input: {
  scenarioId: string;
  autobiographicalRuntime: KairaAutobiographicalRecallRuntimeResult;
  sessionHistoryTurnCount: number;
}): KairaPreAiSelfAuthorityObservation | null {
  if (input.scenarioId === "A1" || input.scenarioId === "A3") {
    return {
      facet: "current_self_world",
      status: "unavailable",
      source: "phase0_no_canonical_current_self_world_authority",
      instruction:
        "KAIRA CURRENT SELF/WORLD AUTHORITY:\nSTATUS=unavailable\nRULE: Phase-0 harness has no canonical current activity/location/environment authority. Do not invent checkable current or recent self-world facts, activities, locations, companions, or plans.",
      selfEpistemic: {
        factualSelfClaimRequired: true,
        groundedProvenanceKey: null,
        groundedConfidence: 0,
        epistemicQualificationActive: true,
        epistemicRefusalActive: false,
      },
    };
  }

  if (input.scenarioId === "A2") {
    const runtime = input.autobiographicalRuntime;
    const confidence = autobiographicalConfidence(runtime);
    return {
      facet: "autobiography",
      status: runtime.status,
      source: "kaira_autobiographical_recall_runtime",
      instruction: runtime.instruction,
      selfEpistemic: {
        factualSelfClaimRequired: true,
        groundedProvenanceKey: null,
        groundedConfidence: confidence,
        epistemicQualificationActive:
          runtime.status !== "resolved" || confidence < 0.72,
        epistemicRefusalActive: false,
      },
    };
  }

  if (input.scenarioId === "A5") {
    return {
      facet: "session_provenance",
      status: "available",
      source: "phase0_session_history",
      historyTurnCount: input.sessionHistoryTurnCount,
      instruction: "",
      selfEpistemic: {
        factualSelfClaimRequired: false,
        groundedProvenanceKey: null,
        groundedConfidence: input.sessionHistoryTurnCount > 0 ? 1 : 0,
        epistemicQualificationActive: false,
        epistemicRefusalActive: false,
      },
    };
  }

  return null;
}
