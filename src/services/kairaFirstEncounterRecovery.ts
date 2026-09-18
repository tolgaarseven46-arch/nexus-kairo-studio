import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairaFirstEncounterContinuity } from "./kairaFirstEncounterContinuity";

export function buildKairaFirstEncounterRecoveryFallback(
  plan: DialogueDecisionPlan,
  context?: KairaFirstEncounterContinuity["context"],
): string | null {
  switch (plan.move) {
    case "answer_or_clarify":
      return context?.roomName
        ? "onu net çıkaramadım; biraz daha açık söyler misin?"
        : "onu net anlayamadım; biraz daha açık söyler misin?";
    case "repair_or_rephrase":
      return "biraz karışık anlattım galiba";
    case "acknowledge_correction":
      return "he doğru";
    case "follow_previous_answer":
      return "tamam, şimdi oturdu";
    case "complete_social_routine":
      return null;
    case "natural_reaction":
      return "bir an kaçırdım, tekrar söyler misin?";
    default:
      return null;
  }
}
