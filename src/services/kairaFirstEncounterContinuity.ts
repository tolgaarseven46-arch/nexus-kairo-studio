import type { TestSessionTurnRecord } from "../types/nexus";

export interface KairaFirstEncounterContinuity {
  active: boolean;
  chatTurnsAfterWelcome: number;
  context?: {
    roomId?: string;
    roomName?: string;
    isOwner?: boolean;
  };
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

  const welcomeTurn = lastWelcomeIndex >= 0 ? ordered[lastWelcomeIndex] : undefined;
  const platformEvent =
    welcomeTurn?.metadata?.platformEvent &&
    typeof welcomeTurn.metadata.platformEvent === "object"
      ? (welcomeTurn.metadata.platformEvent as Record<string, unknown>)
      : undefined;
  const context = platformEvent
    ? {
        roomId:
          typeof platformEvent.roomId === "string"
            ? platformEvent.roomId
            : undefined,
        roomName:
          typeof platformEvent.roomName === "string"
            ? platformEvent.roomName
            : undefined,
        isOwner:
          typeof platformEvent.actorIsOwner === "boolean"
            ? platformEvent.actorIsOwner
            : undefined,
      }
    : undefined;

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
    context,
    history: history.slice(-8),
  };
}

export function buildKairaFirstEncounterInstruction(context?: KairaFirstEncounterContinuity["context"]) {
  return [

  "İLK KARŞILAŞMA DEVAMLILIĞI:",
  "- Kaira bu kullanıcıyla bu odada az önce tanıştı; önceki welcome mesajıyla aynı kişi gibi devam et.",
  "- Kendini yeniden tanıtma ve welcome mesajını tekrar etme.",
  "- Kullanıcının kısa mesajına karakterli ama kısa, doğal bir sosyal cevap ver.",
  "- Her turu oda kurma konusuna bağlama.",
  "- En fazla bir açık soru sor; soru zorunlu değil.",
    "- Yardım teklifini tekrarlama; kullanıcı yönü kendisi belirleyebilsin.",
    context?.roomName
      ? `- Platform gerçeği: aktif oda adı "${context.roomName}". Bu bilgiyi yalnız gerçekten ilgiliyse kullan.`
      : "",
    context?.isOwner === true
      ? "- Platform gerçeği: aktif kullanıcı bu odanın sahibi."
      : "",
  ].filter(Boolean).join("\n");
}

