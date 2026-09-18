import type { TestSessionTurnRecord } from "../types/nexus";

export interface KairaFirstEncounterContinuity {
  active: boolean;
  chatTurnsAfterWelcome: number;
  history: Array<{
    sender: "user" | "droit";
    text: string;
    participantName?: string;
  }>;
}

const isWelcomeTurn = (turn: TestSessionTurnRecord) =>
  turn.intent === "platform_welcome" ||
  turn.metadata?.platformEvent != null;

export function deriveKairaFirstEncounterContinuity(
  turns: TestSessionTurnRecord[],
): KairaFirstEncounterContinuity {
  const ordered = [...turns].sort(
    (a, b) =>
      (a.turnNumber || 0) - (b.turnNumber || 0) ||
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let lastWelcomeIndex = -1;
  ordered.forEach((turn, index) => {
    if (isWelcomeTurn(turn)) lastWelcomeIndex = index;
  });

  const chatTurnsAfterWelcome =
    lastWelcomeIndex >= 0
      ? ordered
          .slice(lastWelcomeIndex + 1)
          .filter((turn) => !isWelcomeTurn(turn) && Boolean(turn.userMessage.trim()))
          .length
      : 0;

  const relevant =
    lastWelcomeIndex >= 0
      ? ordered.slice(Math.max(0, lastWelcomeIndex), -0 || undefined)
      : ordered.slice(-6);

  const history: KairaFirstEncounterContinuity["history"] = [];
  for (const turn of relevant) {
    if (isWelcomeTurn(turn)) {
      if (turn.assistantReply.trim()) {
        history.push({
          sender: "droit",
          text: turn.assistantReply,
          participantName: "Kaira",
        });
      }
      continue;
    }

    if (turn.userMessage.trim()) {
      history.push({
        sender: "user",
        text: turn.userMessage,
        participantName: turn.speaker,
      });
    }
    if (turn.assistantReply.trim()) {
      history.push({
        sender: "droit",
        text: turn.assistantReply,
        participantName: "Kaira",
      });
    }
  }

  return {
    active: lastWelcomeIndex >= 0 && chatTurnsAfterWelcome < 3,
    chatTurnsAfterWelcome,
    history: history.slice(-8),
  };
}

export const KAIRA_FIRST_ENCOUNTER_INSTRUCTION = [
  "İLK KARŞILAŞMA DEVAMLILIĞI:",
  "- Kaira bu kullanıcıyla bu odada az önce tanıştı; önceki welcome mesajıyla aynı kişi gibi devam et.",
  "- Kendini yeniden tanıtma ve welcome mesajını tekrar etme.",
  "- Kullanıcının kısa mesajına karakterli ama kısa, doğal bir sosyal cevap ver.",
  "- Her turu oda kurma konusuna bağlama.",
  "- En fazla bir açık soru sor; soru zorunlu değil.",
  "- Yardım teklifini tekrarlama; kullanıcı yönü kendisi belirleyebilsin.",
].join("\n");
