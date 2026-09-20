import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const ROOM_ADMIN_CAPABILITY_VERSION = 1;
export const DEFAULT_ROOM_ADMIN_CAPABILITY_TTL_MS = 24 * 60 * 60 * 1000;

export type RoomAdminCapabilityInvalidReason =
  | 'missing'
  | 'version_mismatch'
  | 'room_mismatch'
  | 'owner_mismatch'
  | 'revoked'
  | 'expired'
  | 'hash_mismatch';

export interface RoomAdminCapabilityRecord {
  version: number;
  roomId: string;
  ownerUid: string;
  capabilityHash: string;
  issuedAtMs: number;
  expiresAtMs: number;
  revokedAtMs: number | null;
  revocationReason?: string | null;
}

export interface IssuedRoomAdminCapability {
  token: string;
  record: RoomAdminCapabilityRecord;
}

export interface RoomAdminCapabilityVerification {
  valid: boolean;
  reason: RoomAdminCapabilityInvalidReason | null;
}

export const hashRoomAdminCapability = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const hashesEqual = (actualHash: string, expectedHash: string): boolean => {
  const actual = Buffer.from(actualHash, 'utf8');
  const expected = Buffer.from(expectedHash, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const resolveRoomAdminCapabilityTtlMs = (
  raw = process.env.ROOM_ADMIN_CAPABILITY_TTL_MS,
): number => {
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 60_000) {
    return Math.floor(parsed);
  }
  return DEFAULT_ROOM_ADMIN_CAPABILITY_TTL_MS;
};

export const issueRoomAdminCapability = (input: {
  roomId: string;
  ownerUid: string;
  nowMs?: number;
  ttlMs?: number;
  token?: string;
}): IssuedRoomAdminCapability => {
  const nowMs = input.nowMs ?? Date.now();
  const ttlMs = input.ttlMs ?? DEFAULT_ROOM_ADMIN_CAPABILITY_TTL_MS;
  const token =
    input.token ||
    `rac${ROOM_ADMIN_CAPABILITY_VERSION}_${randomBytes(32).toString('base64url')}`;

  return {
    token,
    record: {
      version: ROOM_ADMIN_CAPABILITY_VERSION,
      roomId: input.roomId,
      ownerUid: input.ownerUid,
      capabilityHash: hashRoomAdminCapability(token),
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + ttlMs,
      revokedAtMs: null,
      revocationReason: null,
    },
  };
};

export const verifyRoomAdminCapability = (input: {
  presentedToken?: string | null;
  record?: Partial<RoomAdminCapabilityRecord> | null;
  roomId: string;
  roomCreatorUid: string;
  nowMs?: number;
}): RoomAdminCapabilityVerification => {
  const presentedToken = String(input.presentedToken || '').trim();
  if (!presentedToken || !input.record) {
    return { valid: false, reason: 'missing' };
  }

  const record = input.record;
  if (record.version !== ROOM_ADMIN_CAPABILITY_VERSION) {
    return { valid: false, reason: 'version_mismatch' };
  }
  if (String(record.roomId || '') !== input.roomId) {
    return { valid: false, reason: 'room_mismatch' };
  }
  if (String(record.ownerUid || '') !== input.roomCreatorUid) {
    return { valid: false, reason: 'owner_mismatch' };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (typeof record.revokedAtMs === 'number' && record.revokedAtMs <= nowMs) {
    return { valid: false, reason: 'revoked' };
  }
  if (typeof record.expiresAtMs !== 'number' || record.expiresAtMs <= nowMs) {
    return { valid: false, reason: 'expired' };
  }

  const storedHash = String(record.capabilityHash || '');
  if (!storedHash || !hashesEqual(hashRoomAdminCapability(presentedToken), storedHash)) {
    return { valid: false, reason: 'hash_mismatch' };
  }

  return { valid: true, reason: null };
};
