import { instancePolicy, type KairaInstanceContext } from "./kairaInstanceContext";
import {
  loadKairaCanonicalIdentityResult,
  type KairaCanonicalIdentityLoadResult,
} from "./kairaCanonicalIdentityStore";
import {
  buildKairaAutobiographicalRecallInstruction,
  selectKairaAutobiographicalRecall,
  type KairaAutobiographicalRecall,
} from "./kairaAutobiographicalRecall";
import type { SemanticSelfMemoryQuery } from "./kairaSelfMemoryQuery";

export type KairaAutobiographicalRecallRuntimeStatus =
  | "not_requested"
  | "low_confidence"
  | "ephemeral"
  | "missing"
  | "unavailable"
  | "resolved";

export interface KairaAutobiographicalRecallRuntimeResult {
  status: KairaAutobiographicalRecallRuntimeStatus;
  recall: KairaAutobiographicalRecall | null;
  instruction: string;
}

export interface KairaAutobiographicalRecallRuntimeDependencies {
  loadIdentity?: (
    instance: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
  ) => Promise<KairaCanonicalIdentityLoadResult>;
}

export async function resolveKairaAutobiographicalRecallRuntime(
  input: {
    instance: KairaInstanceContext;
    query?: SemanticSelfMemoryQuery | null;
    minConfidence?: number;
    limit?: number;
  },
  dependencies: KairaAutobiographicalRecallRuntimeDependencies = {},
): Promise<KairaAutobiographicalRecallRuntimeResult> {
  const query = input.query ?? null;
  if (!query) {
    return { status: "not_requested", recall: null, instruction: "" };
  }
  const minConfidence = Math.max(0, Math.min(1, input.minConfidence ?? 0.72));
  if (query.confidence < minConfidence) {
    return { status: "low_confidence", recall: null, instruction: "" };
  }

  const policy = instancePolicy(input.instance.instanceType);
  if (!policy.persistentIdentity || !policy.persistentAutobiography) {
    return { status: "ephemeral", recall: null, instruction: "" };
  }

  const loadIdentity = dependencies.loadIdentity ?? loadKairaCanonicalIdentityResult;
  const loaded = await loadIdentity(input.instance);
  if (loaded.status === "ephemeral") {
    return { status: "ephemeral", recall: null, instruction: "" };
  }
  if (loaded.status === "missing") {
    const recall: KairaAutobiographicalRecall = {
      query,
      selfFacts: [],
      memories: [],
      withheldSensitiveCount: 0,
    };
    return {
      status: "missing",
      recall,
      instruction: buildKairaAutobiographicalRecallInstruction(recall),
    };
  }
  if (loaded.status === "unavailable") {
    return {
      status: "unavailable",
      recall: null,
      instruction:
        "KAIRA SELECTIVE SELF-MEMORY RECALL:\nSTORE_STATUS=unavailable\nRULE: Canonical self-memory store doğrulanamadı. Model prior'ından tercih, biyografi veya geçmiş olay UYDURMA; doğal biçimde emin olmadığını söyle.",
    };
  }

  const recall = selectKairaAutobiographicalRecall(
    query,
    loaded.state,
    input.limit ?? 3,
  );
  return {
    status: "resolved",
    recall,
    instruction: buildKairaAutobiographicalRecallInstruction(recall),
  };
}
