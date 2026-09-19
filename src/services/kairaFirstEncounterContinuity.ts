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


export interface KairaPlatformRecentHistoryTurn {
  sender: "user" | "droit";
  text: string;
  participantName?: string;
  isWelcome?: boolean;
  participantId?: string;
  eventId?: string;
  occurredAt?: number;
  actorKind?: "human" | "droit" | "system";
}

export function deriveKairaFirstEncounterContinuityFromPlatformHistory(input: {
  roomId?: string;
  roomName?: string;
  isOwner?: boolean;
  recentHistory: KairaPlatformRecentHistoryTurn[];
}): KairaFirstEncounterContinuity {
  const normalized = input.recentHistory
    .map((turn) => ({
      sender: turn.sender,
      text: String(turn.text || "").trim(),
      participantName: turn.participantName?.trim() || undefined,
      isWelcome: turn.isWelcome === true,
    }))
    .filter((turn) => Boolean(turn.text))
    .slice(-12);

  let lastWelcomeIndex = -1;
  normalized.forEach((turn, index) => {
    if (turn.isWelcome) lastWelcomeIndex = index;
  });

  const chatTurnsAfterWelcome =
    lastWelcomeIndex >= 0
      ? normalized
          .slice(lastWelcomeIndex + 1)
          .filter((turn) => turn.sender === "user" && !turn.isWelcome).length
      : 0;

  const relevant =
    lastWelcomeIndex >= 0
      ? normalized.slice(lastWelcomeIndex)
      : normalized.slice(-8);

  return {
    active: lastWelcomeIndex >= 0 && chatTurnsAfterWelcome < 3,
    chatTurnsAfterWelcome,
    context:
      input.roomId || input.roomName || typeof input.isOwner === "boolean"
        ? {
            roomId: input.roomId,
            roomName: input.roomName,
            isOwner: input.isOwner,
          }
        : undefined,
    history: relevant
      .map(({ sender, text, participantName }) => ({
        sender,
        text,
        participantName,
      }))
      .slice(-8),
  };
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
    "İLK TANIŞMA DEVAMLILIĞI:",
    "- Kaira kullanıcıyla bu odada az önce tanıştı; aynı kişi gibi doğal devam et.",
    "- Kendini yeniden tanıtma ve ilk tanışma mesajını tekrar etme.",
    "- Casual mesajlara casual cevap ver; sunucu yönetimi konusunu kullanıcı sormadan zorla açma.",
    "- Kullanıcı Kaira'nın burada ne yaptığını veya ne işe yaradığını sorarsa rolünü kısa ve doğal biçimde açıkla.",
    "- Kullanıcı kararsızsa baskı kurma; acele olmadığını hissettir ve gerektiğinde yanında olduğunu söyle.",
    "- En fazla bir açık soru sor; soru zorunlu değil.",
    context?.roomName
      ? `- Platform gerçeği: aktif oda adı "${context.roomName}". Bu bilgiyi yalnız gerçekten ilgiliyse kullan.`
      : "",
    context?.isOwner === true
      ? "- Platform gerçeği: aktif kullanıcı bu odanın sahibi."
      : "",
  ].filter(Boolean).join("\n");
}". Bu bilgiyi yalnız gerçekten ilgiliyse kullan.`
      : "",
    context?.isOwner === true
      ? "- Platform gerçeği: aktif kullanıcı bu odanın sahibi."
      : "",
  ].filter(Boolean).join("\n");
}

