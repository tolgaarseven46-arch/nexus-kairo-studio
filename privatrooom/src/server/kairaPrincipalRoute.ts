import { createHash } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getPrivatRoomAdminDb } from './firebaseAdmin';
import { getKairaPrincipalReadiness } from './kairaIntegrationReadiness';
import { isKairaPresenceActive } from './kairaInviteContract';

const hasInternalAccess = (req: Request): boolean => {
  const expected = process.env.KAIRA_INTERNAL_TOKEN?.trim();
  if (!expected) return false;
  return req.header('x-kaira-internal-token')?.trim() === expected;
};

const principalUidForInstance = (instanceId: string): string => {
  const digest = createHash('sha256').update(instanceId).digest('hex').slice(0, 20);
  return `droit_kaira_${digest}`;
};

type KairaPrincipalProjection = {
  uid: string;
  username: string;
  displayName: string;
  roleTitle: string;
  avatarUrl: string;
};

const ensureKairaRoomMembership = async (
  roomDoc: QueryDocumentSnapshot,
  principal: KairaPrincipalProjection,
): Promise<void> => {
  const data = roomDoc.data();
  if (data.deletedAt || data.status === 'deleted') return;
  if (!isKairaPresenceActive(data)) return;

  const participants = Array.isArray(data.participants) ? data.participants : [];
  const existingIndex = participants.findIndex((p: any) => p?.uid === principal.uid);
  const participant = {
    uid: principal.uid,
    username: principal.username,
    displayName: principal.displayName,
    avatarUrl: principal.avatarUrl,
    joinedAt:
      existingIndex >= 0 && participants[existingIndex]?.joinedAt
        ? participants[existingIndex].joinedAt
        : new Date().toISOString(),
    isHost: false,
    roleColor: '#7c5cff',
    roleIcon: '◆',
    roleName: principal.roleTitle || 'Sunucu Yöneticisi',
    principalType: 'droit',
    systemManaged: true,
  };

  const nextParticipants = [...participants];
  if (existingIndex >= 0) nextParticipants[existingIndex] = { ...participants[existingIndex], ...participant };
  else nextParticipants.push(participant);

  await roomDoc.ref.set(
    {
      participants: nextParticipants,
      participantCount: nextParticipants.length,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
};

const ensureKairaRoomMemberships = async (
  db: Firestore,
  principal: KairaPrincipalProjection,
): Promise<void> => {
  const rooms = await db.collection('rooms').get();
  await Promise.all(rooms.docs.map((roomDoc) => ensureKairaRoomMembership(roomDoc, principal)));
};

export const startKairaRoomMembershipProjection = (
  db: Firestore,
  principal: KairaPrincipalProjection,
): (() => void) => {
  const unsubscribe = db.collection('rooms').onSnapshot(
    (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        void ensureKairaRoomMembership(change.doc, principal).catch((error) => {
          console.error('[Kaira Principal] room membership projection failed:', error);
        });
      }
    },
    (error) => {
      console.error('[Kaira Principal] room membership listener failed:', error);
    },
  );

  console.log('[Kaira Principal] room membership projection ready');
  return unsubscribe;
};

export const ensureKairaPrincipal = async (
  db: Firestore,
  input: {
    instanceId: string;
    displayName?: string;
    roleTitle?: string;
    avatarUrl?: string;
  },
) => {
  const instanceId = input.instanceId.trim();
  if (!instanceId) throw new Error('instanceId_required');

  const displayName = input.displayName?.trim() || 'Kairo';
  const roleTitle = input.roleTitle?.trim() || 'Sunucu Yöneticisi';
  const avatarUrl =
    input.avatarUrl?.trim() ||
    'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Kairo&backgroundColor=5865f2';
  const uid = principalUidForInstance(instanceId);
  const username = `kaira_${createHash('sha1').update(instanceId).digest('hex').slice(0, 10)}`;
  const now = Date.now();
  const ref = db.collection('users').doc(uid);
  const existing = await ref.get();

  await ref.set({
    uid,
    username,
    usernameLower: username.toLowerCase(),
    displayName,
    avatarUrl,
    principalType: 'droit',
    droitProvider: 'kaira',
    droitInstanceId: instanceId,
    droitRoleTitle: roleTitle,
    systemManaged: true,
    ...(existing.exists ? {} : { createdAt: now }),
    updatedAt: now,
  }, { merge: true });

  const principal = { uid, username, displayName, instanceId, roleTitle, avatarUrl };
  await ensureKairaRoomMemberships(db, principal);

  return principal;
};

export const registerKairaPrincipalRoute = (app: Express): void => {
  app.get('/api/integrations/kaira/principals/:instanceId/readiness', async (req: Request, res: Response) => {
    if (!hasInternalAccess(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const instanceId = String(req.params.instanceId || '').trim();
    if (!instanceId) return res.status(400).json({ ok: false, error: 'instanceId_required' });

    try {
      const readiness = await getKairaPrincipalReadiness(getPrivatRoomAdminDb(), instanceId);
      return res.status(readiness.ready ? 200 : 503).json({ ok: readiness.ready, readiness });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/api/integrations/kaira/principals', async (req: Request, res: Response) => {
    if (!hasInternalAccess(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const db = getPrivatRoomAdminDb();
    if (!db) return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });

    const instanceId = String(req.body?.instanceId || '').trim();
    if (!instanceId) return res.status(400).json({ ok: false, error: 'instanceId_required' });

    try {
      const principal = await ensureKairaPrincipal(db, {
        instanceId,
        displayName: String(req.body?.displayName || 'Kairo'),
        roleTitle: String(req.body?.roleTitle || 'Sunucu Yöneticisi'),
        avatarUrl: String(req.body?.avatarUrl || ''),
      });
      return res.json({ ok: true, principal });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
