import type { Express, Request, Response } from 'express';
import { getPrivatRoomAdminAuth, getPrivatRoomAdminDb } from './firebaseAdmin';
import {
  buildKairaLifecycleMessage,
  buildKairaRoomParticipant,
  requestKairaLifecycleWelcome,
  persistCanonicalKairaLifecycleWelcome,
} from './kairaLifecycleGateway';
import {
  buildInitialBetaRoomParticipants,
  canInviteKaira,
  isKairaParticipant,
  isKairaPresenceActive,
} from './kairaInviteContract';
import {
  ROOM_ADMIN_CAPABILITY_VERSION,
  issueRoomAdminCapability,
  resolveRoomAdminCapabilityTtlMs,
  verifyRoomAdminCapability,
} from './roomAdminCapability';

const lastCreateByIp = new Map<string, number>();
const MIN_CREATE_INTERVAL_MS = 5_000;

const safeText = (value: unknown, max: number) =>
  String(value ?? '').trim().slice(0, max);

const getBearerToken = (req: Request): string => {
  const authorization = String(req.get('authorization') || '').trim();
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || '';
};

const requireFirebaseRoomOwner = async (
  req: Request,
  creatorUid: string,
): Promise<{ uid: string; name: string } | null> => {
  const adminAuth = getPrivatRoomAdminAuth();
  if (!adminAuth) return null;
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== creatorUid) return null;
    return {
      uid: decoded.uid,
      name: String(decoded.name || '').trim(),
    };
  } catch {
    return null;
  }
};

export const registerBetaRoomCreateRoute = (app: Express): void => {
  app.post('/api/beta/rooms', async (req: Request, res: Response) => {
    const db = getPrivatRoomAdminDb();
    if (!db) {
      return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const last = lastCreateByIp.get(ip) || 0;
    if (now - last < MIN_CREATE_INTERVAL_MS) {
      return res.status(429).json({ ok: false, error: 'room_create_rate_limited' });
    }

    const roomName = safeText(req.body?.roomName, 80);
    if (!roomName) {
      return res.status(400).json({ ok: false, error: 'room_name_required' });
    }

    lastCreateByIp.set(ip, now);

    const description = safeText(req.body?.description, 240);
    const category = safeText(req.body?.category, 60) || 'Genel Sohbet';
    const coverUrl = safeText(req.body?.coverUrl, 500);
    const avatarUrl = safeText(req.body?.avatarUrl, 500);
    const isPrivate = Boolean(req.body?.isPrivate);

    const creatorName = safeText(req.body?.creatorName, 80) || 'Sen';
    const creatorUid =
      safeText(req.body?.creatorUid, 120) || `beta_user_${Math.random().toString(36).slice(2, 10)}`;
    const creatorAvatar =
      avatarUrl ||
      safeText(req.body?.creatorAvatar, 500) ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';

    const roomRef = db.collection('rooms').doc();
    const roomId = roomRef.id;
    const roomCapabilityRef = db.collection('roomAdminCapabilities').doc(roomId);
    const roomAdminCapability = issueRoomAdminCapability({
      roomId,
      ownerUid: creatorUid,
      nowMs: now,
      ttlMs: resolveRoomAdminCapabilityTtlMs(),
    });
    const isoNow = new Date(now).toISOString();

    const room = {
      roomId,
      roomName,
      description,
      category,
      coverUrl:
        coverUrl ||
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
      avatarUrl: creatorAvatar,
      isPrivate,
      creatorUid,
      creatorName,
      creatorAvatar,
      participants: buildInitialBetaRoomParticipants({
        uid: creatorUid,
        username: creatorName.toLowerCase().replace(/\s+/g, '_'),
        displayName: creatorName,
        avatarUrl: creatorAvatar,
        joinedAt: isoNow,
        isHost: true,
        roleId: 'owner' as const,
      }),
      kairaPresence: {
        state: 'absent' as const,
        accessState: 'free_preview' as const,
      },
      requests: [],
      invites: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.runTransaction(async (tx) => {
        tx.set(roomRef, {
          ...room,
          createdAtServer: new Date(now),
          updatedAtServer: new Date(now),
          betaCreated: true,
        });
        tx.set(roomCapabilityRef, {
          ...roomAdminCapability.record,
          issuedAtServer: new Date(roomAdminCapability.record.issuedAtMs),
          expiresAtServer: new Date(roomAdminCapability.record.expiresAtMs),
          createdAtServer: new Date(now),
        });
      });

      console.log(
        `[Beta Room Create] created room=${roomId} name=${roomName} kaira=absent`,
      );
      return res.status(201).json({
        ok: true,
        room,
        roomAdminCapability: {
          token: roomAdminCapability.token,
          version: roomAdminCapability.record.version,
          expiresAt: new Date(roomAdminCapability.record.expiresAtMs).toISOString(),
        },
      });
    } catch (error) {
      console.error('[Beta Room Create] failed', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'beta_room_create_failed',
      });
    }
  });

  app.get(
    '/api/rooms/:roomId/admin-capability/status',
    async (req: Request, res: Response) => {
      const db = getPrivatRoomAdminDb();
      if (!db) {
        return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
      }

      const roomId = safeText(req.params.roomId, 160);
      const presentedToken = safeText(req.get('x-room-admin-capability'), 512);
      if (!roomId) {
        return res.status(400).json({ ok: false, error: 'invalid_room_id' });
      }

      const roomRef = db.collection('rooms').doc(roomId);
      const capabilityRef = db.collection('roomAdminCapabilities').doc(roomId);
      const [roomSnap, capabilitySnap] = await Promise.all([
        roomRef.get(),
        capabilityRef.get(),
      ]);
      if (!roomSnap.exists) {
        return res.status(404).json({ ok: false, error: 'room_not_found' });
      }

      const room = roomSnap.data() as any;
      const verification = verifyRoomAdminCapability({
        presentedToken,
        record: capabilitySnap.exists ? (capabilitySnap.data() as any) : null,
        roomId,
        roomCreatorUid: String(room?.creatorUid || ''),
      });
      const record = capabilitySnap.exists ? (capabilitySnap.data() as any) : null;

      return res.json({
        ok: true,
        active: verification.valid,
        reason: verification.reason,
        version: Number(record?.version || ROOM_ADMIN_CAPABILITY_VERSION),
        expiresAt:
          typeof record?.expiresAtMs === 'number'
            ? new Date(record.expiresAtMs).toISOString()
            : null,
      });
    },
  );

  app.post(
    '/api/rooms/:roomId/admin-capability/rotate',
    async (req: Request, res: Response) => {
      const db = getPrivatRoomAdminDb();
      if (!db) {
        return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
      }

      const roomId = safeText(req.params.roomId, 160);
      if (!roomId) {
        return res.status(400).json({ ok: false, error: 'invalid_room_id' });
      }

      const roomRef = db.collection('rooms').doc(roomId);
      const roomSnap = await roomRef.get();
      if (!roomSnap.exists) {
        return res.status(404).json({ ok: false, error: 'room_not_found' });
      }
      const room = roomSnap.data() as any;
      const identity = await requireFirebaseRoomOwner(
        req,
        String(room?.creatorUid || ''),
      );
      if (!identity) {
        return res.status(403).json({ ok: false, error: 'room_admin_rotate_forbidden' });
      }

      const now = Date.now();
      const issued = issueRoomAdminCapability({
        roomId,
        ownerUid: identity.uid,
        nowMs: now,
        ttlMs: resolveRoomAdminCapabilityTtlMs(),
      });
      const capabilityRef = db.collection('roomAdminCapabilities').doc(roomId);
      await capabilityRef.set({
        ...issued.record,
        issuedAtServer: new Date(issued.record.issuedAtMs),
        expiresAtServer: new Date(issued.record.expiresAtMs),
        rotatedAtServer: new Date(now),
      });

      return res.json({
        ok: true,
        roomAdminCapability: {
          token: issued.token,
          version: issued.record.version,
          expiresAt: new Date(issued.record.expiresAtMs).toISOString(),
        },
      });
    },
  );

  app.post(
    '/api/rooms/:roomId/admin-capability/revoke',
    async (req: Request, res: Response) => {
      const db = getPrivatRoomAdminDb();
      if (!db) {
        return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
      }

      const roomId = safeText(req.params.roomId, 160);
      if (!roomId) {
        return res.status(400).json({ ok: false, error: 'invalid_room_id' });
      }

      const roomRef = db.collection('rooms').doc(roomId);
      const capabilityRef = db.collection('roomAdminCapabilities').doc(roomId);
      const roomSnap = await roomRef.get();
      if (!roomSnap.exists) {
        return res.status(404).json({ ok: false, error: 'room_not_found' });
      }
      const room = roomSnap.data() as any;
      const identity = await requireFirebaseRoomOwner(
        req,
        String(room?.creatorUid || ''),
      );
      if (!identity) {
        return res.status(403).json({ ok: false, error: 'room_admin_revoke_forbidden' });
      }

      const now = Date.now();
      const capabilitySnap = await capabilityRef.get();
      if (capabilitySnap.exists) {
        await capabilityRef.set(
          {
            revokedAtMs: now,
            revokedAtServer: new Date(now),
            revocationReason: 'owner_revoked',
          },
          { merge: true },
        );
      }

      return res.json({ ok: true, revoked: true });
    },
  );

  app.post(
    '/api/beta/rooms/:roomId/kaira-invite',
    async (req: Request, res: Response) => {
      const db = getPrivatRoomAdminDb();
      if (!db) {
        return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
      }

      const roomId = safeText(req.params.roomId, 160);
      const inviteRequestId = safeText(req.body?.inviteRequestId, 160);
      if (!roomId || !inviteRequestId) {
        return res.status(400).json({ ok: false, error: 'invalid_kaira_invite_request' });
      }

      const roomRef = db.collection('rooms').doc(roomId);
      const roomCapabilityRef = db.collection('roomAdminCapabilities').doc(roomId);
      const ownerCapability = safeText(req.get('x-room-admin-capability'), 512);

      let actorUid = '';
      let actorName = '';

      if (ownerCapability) {
        const [roomSnap, capabilitySnap] = await Promise.all([
          roomRef.get(),
          roomCapabilityRef.get(),
        ]);
        if (!roomSnap.exists) {
          return res.status(404).json({ ok: false, error: 'room_not_found' });
        }
        const room = roomSnap.data() as any;
        const verification = verifyRoomAdminCapability({
          presentedToken: ownerCapability,
          record: capabilitySnap.exists ? (capabilitySnap.data() as any) : null,
          roomId,
          roomCreatorUid: String(room?.creatorUid || ''),
        });
        if (room?.betaCreated !== true || !verification.valid) {
          return res.status(401).json({
            ok: false,
            error: 'kaira_invite_auth_invalid',
            capabilityError: verification.reason,
          });
        }
        actorUid = String(room.creatorUid || '');
        actorName = String(room.creatorName || '').trim();
      } else {
        const adminAuth = getPrivatRoomAdminAuth();
        if (!adminAuth) {
          return res.status(503).json({ ok: false, error: 'firebase_admin_auth_not_ready' });
        }
        const authorization = String(req.get('authorization') || '').trim();
        const match = authorization.match(/^Bearer\s+(.+)$/i);
        if (!match) {
          return res.status(401).json({ ok: false, error: 'kaira_invite_auth_required' });
        }
        try {
          const decoded = await adminAuth.verifyIdToken(match[1]);
          actorUid = decoded.uid;
          actorName = String(decoded.name || '').trim();
        } catch {
          return res.status(401).json({ ok: false, error: 'kaira_invite_auth_invalid' });
        }
      }

      let claimed = false;

      try {
        const claim = await db.runTransaction(async (tx) => {
          const roomSnap = await tx.get(roomRef);
          if (!roomSnap.exists) throw new Error('room_not_found');
          const room = roomSnap.data() as any;
          if (room?.betaCreated !== true) throw new Error('kaira_invite_beta_room_only');

          const participants = Array.isArray(room?.participants) ? room.participants : [];
          if (!canInviteKaira({ creatorUid: room?.creatorUid, participants }, actorUid)) {
            throw new Error('kaira_invite_forbidden');
          }

          if (isKairaPresenceActive(room) || isKairaParticipant(participants)) {
            return { kind: 'active' as const, room };
          }

          const presence = room?.kairaPresence || {};
          if (presence.state === 'inviting') {
            if (presence.inviteRequestId === inviteRequestId) {
              return { kind: 'in_progress' as const, room };
            }
            throw new Error('kaira_invite_busy');
          }

          const actor = participants.find((participant: any) => String(participant?.uid || '') === actorUid);
          const inviterRole: 'owner' | 'admin' =
            String(room?.creatorUid || '') === actorUid || actor?.isHost === true
              ? 'owner'
              : 'admin';
          const requestedAt = new Date().toISOString();

          tx.update(roomRef, {
            kairaPresence: {
              state: 'inviting',
              accessState: presence.accessState || 'free_preview',
              inviteRequestId,
              invitedByUid: actorUid,
              requestedAt,
            },
            updatedAt: Date.now(),
            updatedAtServer: new Date(),
          });

          return {
            kind: 'claimed' as const,
            room,
            actor,
            inviterRole,
          };
        });

        if (claim.kind === 'active') {
          return res.json({ ok: true, alreadyActive: true, room: claim.room });
        }
        if (claim.kind === 'in_progress') {
          return res.status(202).json({ ok: true, inProgress: true });
        }

        claimed = true;
        const welcome = await requestKairaLifecycleWelcome({
          eventType: 'kaira.invited_to_server',
          roomId,
          roomName: String(claim.room?.roomName || 'Oda'),
          actorUserId: actorUid,
          actorDisplayName:
            String(claim.actor?.displayName || claim.actor?.username || actorName || '').trim() ||
            'Oyuncu',
          actorUsername: String(claim.actor?.username || '').trim() || undefined,
          isOwner: claim.inviterRole === 'owner',
          inviteRequestId,
          inviterRole: claim.inviterRole,
        });

        const messageRef = roomRef.collection('messages').doc();
        const message = buildKairaLifecycleMessage(messageRef.id, welcome);
        let finalizedRoom: any = null;

        await db.runTransaction(async (tx) => {
          const roomSnap = await tx.get(roomRef);
          if (!roomSnap.exists) throw new Error('room_not_found');
          const room = roomSnap.data() as any;
          const presence = room?.kairaPresence || {};
          if (
            presence.state !== 'inviting' ||
            presence.inviteRequestId !== inviteRequestId
          ) {
            if (presence.state === 'active') {
              finalizedRoom = room;
              return;
            }
            throw new Error('kaira_invite_claim_lost');
          }

          const participants = Array.isArray(room?.participants)
            ? [...room.participants]
            : [];
          if (!isKairaParticipant(participants)) {
            participants.push(buildKairaRoomParticipant(new Date().toISOString()));
          }

          const now = Date.now();
          const kairaPresence = {
            state: 'active',
            accessState: presence.accessState || 'free_preview',
            inviteRequestId,
            invitedByUid: actorUid,
            requestedAt: presence.requestedAt || new Date(now).toISOString(),
            invitedAt: new Date(now).toISOString(),
            introMessageId: messageRef.id,
          };

          tx.update(roomRef, {
            participants,
            participantCount: participants.length,
            kairaPresence,
            updatedAt: now,
            updatedAtServer: new Date(now),
          });
          tx.set(messageRef, message);
          finalizedRoom = {
            ...room,
            participants,
            participantCount: participants.length,
            kairaPresence,
            updatedAt: now,
          };
        });

        return res.status(201).json({
          ok: true,
          room: finalizedRoom,
          introMessage: message,
          welcome,
        });
      } catch (error) {
        if (claimed) {
          try {
            await db.runTransaction(async (tx) => {
              const roomSnap = await tx.get(roomRef);
              if (!roomSnap.exists) return;
              const room = roomSnap.data() as any;
              if (
                room?.kairaPresence?.state === 'inviting' &&
                room?.kairaPresence?.inviteRequestId === inviteRequestId
              ) {
                tx.update(roomRef, {
                  kairaPresence: {
                    state: 'absent',
                    accessState: room?.kairaPresence?.accessState || 'free_preview',
                  },
                  updatedAt: Date.now(),
                  updatedAtServer: new Date(),
                });
              }
            });
          } catch (recoveryError) {
            console.error('[Kaira Invite] recovery failed', recoveryError);
          }
        }

        const message = error instanceof Error ? error.message : 'kaira_invite_failed';
        const status =
          message === 'room_not_found'
            ? 404
            : message === 'kaira_invite_forbidden'
              ? 403
              : message === 'kaira_invite_busy'
                ? 409
                : message === 'kaira_invite_beta_room_only'
                  ? 403
                  : 500;
        console.error('[Kaira Invite] failed', error);
        return res.status(status).json({ ok: false, error: message });
      }
    },
  );

  app.post(
    '/api/beta/rooms/:roomId/lifecycle',
    async (req: Request, res: Response) => {
      const db = getPrivatRoomAdminDb();
      if (!db) {
        return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
      }

      const roomId = safeText(req.params.roomId, 160);
      const actorUserId = safeText(req.body?.actorUserId, 160);
      const eventType = safeText(req.body?.eventType, 80);

      if (
        !roomId ||
        !actorUserId ||
        eventType !== 'participant.joined'
      ) {
        return res.status(400).json({ ok: false, error: 'invalid_lifecycle_request' });
      }

      try {
        if (eventType === 'participant.joined') {
          const roomRef = db.collection('rooms').doc(roomId);
          const roomSnap = await roomRef.get();
          if (!roomSnap.exists) {
            return res.status(404).json({ ok: false, error: 'room_not_found' });
          }
          const room = roomSnap.data() as any;
          if (room?.betaCreated !== true) {
            return res.status(403).json({ ok: false, error: 'participant_join_beta_room_only' });
          }
          const displayName =
            safeText(req.body?.displayName, 80) || actorUserId;
          const participants = Array.isArray(room?.participants)
            ? [...room.participants]
            : [];
          if (!participants.some((participant: any) => String(participant?.uid || '') === actorUserId)) {
            participants.push({
              uid: actorUserId,
              username:
                safeText(req.body?.username, 80) ||
                displayName.toLowerCase().replace(/\s+/g, '_'),
              displayName,
              avatarUrl: safeText(req.body?.avatarUrl, 500),
              joinedAt: new Date().toISOString(),
              isHost: false,
            });
            await roomRef.update({
              participants,
              updatedAt: Date.now(),
              updatedAtServer: new Date(),
            });
          }
        }

        const latestRoomSnap = await db.collection('rooms').doc(roomId).get();
        const latestRoom = latestRoomSnap.data() as any;
        if (!isKairaPresenceActive(latestRoom)) {
          return res.json({
            ok: true,
            skipped: true,
            reason: 'kaira_not_active',
          });
        }

        const lifecycle = await persistCanonicalKairaLifecycleWelcome(db, {
          eventType: 'participant.joined',
          roomId,
          actorUserId,
        });
        return res.json({ ok: true, ...lifecycle });
      } catch (error) {
        console.error('[Beta Room Lifecycle] failed', error);
        return res.status(500).json({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'beta_room_lifecycle_failed',
        });
      }
    },
  );
};
