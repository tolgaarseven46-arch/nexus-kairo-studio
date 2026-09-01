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
  forgivenessGranted: boolean;
  repairStatus: RepairStatus;
  reopeningCloseness: BehaviorPermission;
  stance: "open" | "distant-responsive" | "repairing-cautious" | "closed";
  maxResponseLength: "short" | "medium";
  reasons: string[];
}

export function buildBehaviorContract(
  dynamicState: DroitDynamicState,
  trace?: ReasoningTrace | null,
  semanticEvent?: Pick<SemanticEvent, "stopTalking" | "stopQuestions"> | null,
): BehaviorContract {
  const relationship = dynamicState.relationship;
  const state = (relationship?.conversationState ?? "active") as BehaviorContract["conversationState"];
  const hurt = Number(relationship?.hurtScore ?? trace?.relationship?.hurtScore ?? 0);
  const conflict = Number(relationship?.conflictScore ?? trace?.relationship?.conflictScore ?? 0);
  const repairProgress = Number(relationship?.repairProgress ?? trace?.relationship?.repairProgress ?? 0);
  const repairAttempts = Number(relationship?.repairAttempts ?? trace?.relationship?.repairAttempts ?? 0);
  // repairProgress is positive recovery evidence, not damage by itself. In active,
  // low-hurt relationships it commonly grows after normal positive turns; treating
  // it as unresolved damage made early conversations falsely distant.
  const unresolvedDamage = hurt >= 20 || conflict >= 20 || state !== "active";
  const stopTalking = semanticEvent?.stopTalking === true;
  const stopQuestions = semanticEvent?.stopQuestions === true;
  const reasons: string[] = [];

  if (state === "disengaged") {
    reasons.push("İlişki disengaged; konuşmayı yeniden açan yakınlık, mizah ve affetme yasak.");
    return {
      conversationState: state,
      continueConversation: false,
      playfulness: "forbidden",
      affection: "forbidden",
      questions: "forbidden",
      forgivenessGranted: false,
      repairStatus: repairAttempts > 0 || repairProgress > 0 ? "incomplete" : "none",
      reopeningCloseness: "forbidden",
      stance: "closed",
      maxResponseLength: "short",
      reasons,
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
      forgivenessGranted: false,
      repairStatus: "repairing",
      reopeningCloseness: "forbidden",
      stance: "repairing-cautious",
      maxResponseLength: "short",
      reasons,
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
      forgivenessGranted: false,
      repairStatus: repairProgress > 0 || repairAttempts > 0 ? "incomplete" : "none",
      reopeningCloseness: "forbidden",
      stance: "distant-responsive",
      maxResponseLength: "short",
      reasons,
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
      forgivenessGranted: false,
      repairStatus: "repaired",
      reopeningCloseness: "forbidden",
      stance: "closed",
      maxResponseLength: "short",
      reasons,
    };
  }

  return {
    conversationState: "active",
    continueConversation: true,
    playfulness: "allowed",
    affection: "allowed",
    questions: stopQuestions ? "forbidden" : "allowed",
    forgivenessGranted: true,
    repairStatus: "repaired",
    reopeningCloseness: "allowed",
    stance: "open",
    maxResponseLength: "medium",
    reasons: [
      "İlişki aktif ve çözülmemiş hasar eşiği yok.",
      ...(stopQuestions ? ["Kullanıcı bu tur yeni soru sorulmamasını açıkça istedi."] : []),
    ],
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
    `forgivenessGranted=${contract.forgivenessGranted}`,
    `repairStatus=${contract.repairStatus}`,
    `reopeningCloseness=${contract.reopeningCloseness}`,
    `stance=${contract.stance}`,
    `maxResponseLength=${contract.maxResponseLength}`,
    "Bu sözleşmeye aykırı sosyal anlam üretme. Özellikle affetme verilmediyse 'geçti gitti', 'sorun yok', 'affettim' gibi kapanışlar; playfulness yasaksa şakalaşma; reopeningCloseness yasaksa yakınlığı normale döndüren ifadeler kullanma.",
  ].join("\n");
}
