export const KAIRA_ROOM_PARTICIPANT_UID = "droit_kaira_22261aadeb3a5d02eed3";

export type KairaServerPresenceState = "absent" | "inviting" | "active" | "removed";

export interface KairaServerPresenceV1 {
  state: KairaServerPresenceState;
  accessState: "free_preview" | "trial" | "active_paid" | "unavailable";
  inviteRequestId?: string;
  invitedByUid?: string;
  requestedAt?: string;
  invitedAt?: string;
  introMessageId?: string;
}

type ParticipantLike = {
  uid?: string;
  isHost?: boolean;
  roleId?: "owner" | "admin" | "mod" | "member";
};

export const buildInitialBetaRoomParticipants = <T>(creator: T): T[] => [creator];

export const isKairaParticipant = (participants: ParticipantLike[]): boolean =>
  participants.some((participant) => participant?.uid === KAIRA_ROOM_PARTICIPANT_UID);

export const isKairaPresenceActive = (room: {
  kairaPresence?: Partial<KairaServerPresenceV1> | null;
}): boolean => room?.kairaPresence?.state === "active";

export const canInviteKaira = (
  room: { creatorUid?: string; participants?: ParticipantLike[] },
  actorUid: string,
): boolean => {
  if (!actorUid) return false;
  if (String(room.creatorUid || "") === actorUid) return true;
  const actor = (room.participants || []).find((participant) => participant?.uid === actorUid);
  return Boolean(actor && (actor.isHost === true || actor.roleId === "owner" || actor.roleId === "admin"));
};
