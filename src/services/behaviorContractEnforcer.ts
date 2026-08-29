import type { ReasoningTrace } from "../types/nexus";
import type { BehaviorContract } from "./behaviorContract";

export interface BehaviorContractEnforcementResult {
  reply: string;
  changed: boolean;
  reasons: string[];
}

const norm = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("tr-TR");
const PLAYFUL = /(hahaha|hehe|şaka|takılıyorum|dalga|hızlı onayladın|güldür|komik|😂|🤣|😏)/iu;
const AFFECTION = /(öp|öpüc|sarıl|kucağ|dudak|bebeğim|aşkım|tatlım|sevgilim)/iu;
const FORGIVENESS = /(geçti gitti|sorun yok|affettim|tamamen geçti|kapandı gitti)/iu;
const REOPEN = /(hadi\s+(?:konuş|devam)|konuşalım|devam edelim|eski halimize|normale dön|barıştık|kaldığımız yerden)/iu;

const fallback = (trace: ReasoningTrace, contract: BehaviorContract) => {
  const intent = norm(trace?.messageInterpretation?.intent);
  if (contract.stance === "closed") {
    return intent.includes("özür") || intent.includes("telafi")
      ? "özrünü duydum ama şu an konuşmak istemiyorum"
      : "bu şekilde devam etmeyeceğim";
  }
  if (contract.stance === "repairing-cautious") return "özrünü görüyorum ama biraz zamana ihtiyacım var";
  return "konuşabiliriz ama aramız hemen normale dönmüş değil";
};

export function enforceBehaviorContract(
  reply: string,
  trace: ReasoningTrace,
  contract: BehaviorContract,
): BehaviorContractEnforcementResult {
  const original = String(reply ?? "").trim();
  const lower = norm(original);
  const reasons: string[] = [];

  if (contract.playfulness === "forbidden" && PLAYFUL.test(lower)) reasons.push("contract_playfulness_blocked");
  if (contract.affection === "forbidden" && AFFECTION.test(lower)) reasons.push("contract_affection_blocked");
  if (!contract.forgivenessGranted && FORGIVENESS.test(lower)) reasons.push("contract_forgiveness_blocked");
  if (contract.reopeningCloseness === "forbidden" && REOPEN.test(lower)) reasons.push("contract_reopening_blocked");
  if (!contract.continueConversation && (original.includes("?") || original.length > 220)) reasons.push("contract_closed_conversation_blocked");

  if (!reasons.length) return { reply: original, changed: false, reasons };
  const enforced = fallback(trace, contract);
  return { reply: enforced, changed: enforced !== original, reasons };
}
