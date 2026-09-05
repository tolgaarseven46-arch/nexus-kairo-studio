import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";
import type { SemanticEvent } from "./semanticEventEngine";

export type BehaviorPermission = "allowed" | "forbidden";
export type RepairStatus = "none" | "incomplete" | "repairing" | "repaired";

export interface BehaviorContract {
  conversationState: "active" | "distancing" | "disengaged" | "repairing";
  continueConversation: boolean;
  playfulness: BehaviorPermission;
  affection: BehaviorPermission;
  questions: BehaviorPermission;
  /** Runtime builder always emits this; optional only for old persisted/test projections. */
  advice?: BehaviorPermission;
  /** Transient utterance-control observation; never persisted or promoted to relationship state. */
  questionStopRequested?: boolean;
  forgivenessGranted: boolean;
  repairStatus: RepairStatus;
  reopeningCloseness: BehaviorPermission;
  stance: "open" | "distant-responsive" | "repairing-cautious" | "closed";
  maxResponseLength: "short" | "medium";
  reasons: string[];
  /** Canonical semantic observation passthrough. It never grants/revokes a hard permission by itself. */
  semanticUncertainty?: number;
}

export function buildBehaviorContract(
  dynamicState: DroitDynamicState,
  trace?: ReasoningTrace | null,
  semanticEvent?: (Pick<SemanticEvent, "stopTalking" | "stopQuestions" | "adviceRequested"> & { semanticUncertainty?: number }) | null,
): BehaviorContract {
  const relationship = dynamicState.relationship;
  const state = (relationship?.conversationState ?? "active") as BehaviorContract["conversationState"];
  const hurt = Number(relationship?.hurtScore ?? trace?.relationship?.hurtScore ?? 0);
  const conflict = Number(relationship?.conflictScore ?? trace?.relationship?.conflictScore ?? 0);
  const repairProgress = Number(relationship?.repairProgress ?? trace?.relationship?.repairProgress ?? 0);
  const repairAttempts = Number(relationship?.repairAttempts ?? trace?.relationship?.repairAttempts ?? 0);
  const unresolvedDamage = hurt >= 20 || conflict >= 20 || state !== "active";
  const stopTalking = semanticEvent?.stopTalking === true;
  const stopQuestions = semanticEvent?.stopQuestions === true;
  const adviceRequested = semanticEvent?.adviceRequested === true;
  const semanticUncertainty = Number.isFinite(semanticEvent?.semanticUncertainty)
    ? Number(semanticEvent?.semanticUncertainty)
    : undefined;
  const observation = semanticUncertainty === undefined ? {} : { semanticUncertainty };
  const transient = { questionStopRequested: stopQuestions };
  const reasons: string[] = [];

  if (state === "disengaged") {
    reasons.push("İlişki disengaged; konuşmayı yeniden açan yakınlık, mizah ve affetme yasak.");
    return {
      conversationState: state,
      continueConversation: false,
      playfulness: "forbidden",
      affection: "forbidden",
      questions: "forbidden",
      advice: "forbidden",
      ...transient,
      forgivenessGranted: false,
      repairStatus: repairAttempts > 0 || repairProgress > 0 ? "incomplete" : "none",
      reopeningCloseness: "forbidden",
      stance: "closed",
      maxResponseLength: "short",
      reasons,
      ...observation,
    };
  }

  if (state === "repairing") {
    reasons.push("İlişki repairing; onarım sürerken normal yakınlık ve şakalaşma geri açılamaz.");
    return {
      conversationState: state,
      continueConversation: true,
      playfulness: "forbidden",
      affection: "forbidden",
      questions: "forbidden",
      advice: adviceRequested ? "allowed" : "forbidden",
      ...transient,
      forgivenessGranted: false,
      repairStatus: "repairing",
      reopeningCloseness: "forbidden",
      stance: "repairing-cautious",
      maxResponseLength: "short",
      reasons,
      ...observation,
    };
  }

  if (state === "distancing" || unresolvedDamage) {
    reasons.push("Çözülmemiş ilişki hasarı var; sıcak/oyuncu yeniden yakınlaşma ve kesin affetme engellendi.");
    return {
      conversationState: state,
      continueConversation: true,
      playfulness: "forbidden",
      affection: "forbidden",
      questions: "forbidden",
      advice: adviceRequested ? "allowed" : "forbidden",
      ...transient,
      forgivenessGranted: false,
      repairStatus: repairProgress > 0 || repairAttempts > 0 ? "incomplete" : "none",
      reopeningCloseness: "forbidden",
      stance: "distant-responsive",
      maxResponseLength: "short",
      reasons,
      ...observation,
    };
  }

  if (stopTalking) {
    reasons.push("Kullanıcı bu tur konuşmanın durmasını açıkça istedi; transient komut kalıcı ilişki disengage üretmeden cevabı kapattı.");
    return {
      conversationState: "active",
      continueConversation: false,
      playfulness: "forbidden",
      affection: "forbidden",
      questions: "forbidden",
      advice: "forbidden",
      ...transient,
      forgivenessGranted: false,
      repairStatus: "repaired",
      reopeningCloseness: "forbidden",
      stance: "closed",
      maxResponseLength: "short",
      reasons,
      ...observation,
    };
  }

  return {
    conversationState: "active",
    continueConversation: true,
    playfulness: "allowed",
    affection: "allowed",
    questions: stopQuestions ? "forbidden" : "allowed",
    advice: adviceRequested ? "allowed" : "forbidden",
    ...transient,
    forgivenessGranted: true,
    repairStatus: "repaired",
    reopeningCloseness: "allowed",
    stance: "open",
    maxResponseLength: "medium",
    reasons: [
      "İlişki aktif ve çözülmemiş hasar eşiği yok.",
      ...(stopQuestions ? ["Kullanıcı bu tur yeni soru sorulmamasını açıkça istedi."] : []),
      ...(adviceRequested ? ["Kullanıcı bu tur açıkça tavsiye/öneri istedi."] : ["Kullanıcı bu tur tavsiye istemedi."]),
    ],
    ...observation,
  };
}

export function behaviorContractInstruction(contract: BehaviorContract): string {
  return [
    "DAVRANIŞ SÖZLEŞMESİ (BAĞLAYICI):",
    `conversationState=${contract.conversationState}`,
    `continueConversation=${contract.continueConversation}`,
    `playfulness=${contract.playfulness}`,
    `affection=${contract.affection}`,
    `questions=${contract.questions}`,
    `advice=${contract.advice ?? "forbidden"}`,
    `forgivenessGranted=${contract.forgivenessGranted}`,
    `repairStatus=${contract.repairStatus}`,
    `reopeningCloseness=${contract.reopeningCloseness}`,
    `stance=${contract.stance}`,
    `maxResponseLength=${contract.maxResponseLength}`,
    "Bu sözleşmeye aykırı sosyal anlam üretme. Özellikle affetme verilmediyse 'geçti gitti', 'sorun yok', 'affettim' gibi kapanışlar; playfulness yasaksa şakalaşma; reopeningCloseness yasaksa yakınlığı normale döndüren ifadeler; advice yasaksa kullanıcı istemeden öğüt/tavsiye verme.",
  ].join("\n");
}
