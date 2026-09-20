import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db, ensureFirebaseAuth, auth } from '../firebase';
import { UserService, UserProfileDocument } from './userService';

export type UserRoleType = 'owner' | 'admin' | 'mod' | 'member';

export interface HierarchyRole {
  id: UserRoleType;
  name: string;
  icon: string;
  color: string;
  level: number; // 4: owner, 3: admin, 2: mod, 1: member
  description: string;
  permissions: {
    canDeleteAnyMessage: boolean;
    canMuteUser: boolean;
    canManageRoles: boolean;
    canKickUser: boolean;
    canEditRoom: boolean;
  };
}

export const HIERARCHY_ROLES: Record<UserRoleType, HierarchyRole> = {
  owner: {
    id: 'owner',
    name: 'Sunucu Sahibi',
    icon: '👑',
    color: '#ff4757',
    level: 4,
    description: 'Tüm yetkilere sahiptir. Rolleri düzenler, mesaj silebilir, kullanıcı banlayabilir/atabilir.',
    permissions: {
      canDeleteAnyMessage: true,
      canMuteUser: true,
      canManageRoles: true,
      canKickUser: true,
      canEditRoom: true,
    },
  },
  admin: {
    id: 'admin',
    name: 'Yönetici',
    icon: '🛡️',
    color: '#a55eea',
    level: 3,
    description: 'Mesaj silme, kanal düzenleme ve alt rolleri yönetme yetkisine sahiptir.',
    permissions: {
      canDeleteAnyMessage: true,
      canMuteUser: true,
      canManageRoles: true,
      canKickUser: true,
      canEditRoom: true,
    },
  },
  mod: {
    id: 'mod',
    name: 'Moderatör',
    icon: '⚔️',
    color: '#3867d6',
    level: 2,
    description: 'Sadece sohbeti temizleme (mesaj silme) ve kullanıcı susturma yetkisine sahiptir.',
    permissions: {
      canDeleteAnyMessage: true,
      canMuteUser: true,
      canManageRoles: false,
      canKickUser: false,
      canEditRoom: false,
    },
  },
  member: {
    id: 'member',
    name: 'Üye',
    icon: '',
    color: '#f2f3f5',
    level: 1,
    description: 'Sadece mesaj yazma ve kendi mesajını silme/düzenleme yetkisine sahiptir.',
    permissions: {
      canDeleteAnyMessage: false,
      canMuteUser: false,
      canManageRoles: false,
      canKickUser: false,
      canEditRoom: false,
    },
  },
};

export interface RoomChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderUsername?: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  createdAtServer?: any;
  roleId?: UserRoleType;
  roleColor?: string;
  roleIcon?: string;
  roleName?: string;
  isEdited?: boolean;
  messageSource?:
    | 'kaira_canonical_welcome'
    | 'kaira_invite_introduction'
    | 'kaira_integration';
}

export const ZIPO_BOT_USER = {
  uid: 'bot-zipo',
  name: 'Zipo',
  username: 'zipo',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zipo',
  roleColor: '#5865f2',
  roleIcon: '🤖',
  roleName: 'BOT',
};

export const MOCK_ROOM_USERS: RoomParticipant[] = [];

export const getInitialMockMessages = (): RoomChatMessage[] => [];

export interface RoomParticipant {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl: string;
  joinedAt: string;
  isHost: boolean;
  roleColor?: string;
  roleIcon?: string;
  roleName?: string;
  roleId?: UserRoleType;
}

export interface RoomRequest {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl: string;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface RoomInvite {
  id: string;
  targetUid: string;
  targetUsername: string;
  targetDisplayName?: string;
  targetAvatarUrl?: string;
  invitedByUid: string;
  invitedByName: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface RoomDocument {
  roomId: string;
  roomName: string;
  category?: string;
  iconType?: 'music' | 'spor' | 'chat';
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  isPrivate: boolean; // Açık = false, Kapalı = true
  creatorUid: string;
  creatorName: string;
  creatorAvatar: string;
  participants: RoomParticipant[];
  requests: RoomRequest[];
  invites: RoomInvite[];
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
  kairaPresence?: {
    state: 'absent' | 'inviting' | 'active' | 'removed';
    accessState: 'free_preview' | 'trial' | 'active_paid' | 'unavailable';
    inviteRequestId?: string;
    invitedByUid?: string;
    requestedAt?: string;
    invitedAt?: string;
    introMessageId?: string;
  };
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Room Error:', JSON.stringify(errInfo));
  throw new Error(error instanceof Error ? error.message : 'Firestore işlem hatası');
}

const ROOM_ADMIN_CAPABILITY_STORAGE_PREFIX = 'room_admin_capability:v1:';
const LEGACY_ROOM_ADMIN_CAPABILITY_STORAGE_PREFIX = 'beta_room_admin_capability:';

interface StoredRoomAdminCapability {
  token: string;
  version: number;
  expiresAt: string;
}

const roomAdminCapabilityStorageKey = (roomId: string) =>
  `${ROOM_ADMIN_CAPABILITY_STORAGE_PREFIX}${roomId}`;

const legacyRoomAdminCapabilityStorageKey = (roomId: string) =>
  `${LEGACY_ROOM_ADMIN_CAPABILITY_STORAGE_PREFIX}${roomId}`;

const clearStoredRoomAdminCapability = (roomId: string): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(roomAdminCapabilityStorageKey(roomId));
  sessionStorage.removeItem(legacyRoomAdminCapabilityStorageKey(roomId));
};

const storeRoomAdminCapability = (
  roomId: string,
  capability: StoredRoomAdminCapability,
): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(
    roomAdminCapabilityStorageKey(roomId),
    JSON.stringify(capability),
  );
  sessionStorage.removeItem(legacyRoomAdminCapabilityStorageKey(roomId));
};

const readStoredRoomAdminCapability = (
  roomId: string,
): StoredRoomAdminCapability | null => {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(roomAdminCapabilityStorageKey(roomId));
  if (!raw) {
    sessionStorage.removeItem(legacyRoomAdminCapabilityStorageKey(roomId));
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRoomAdminCapability>;
    const token = String(parsed.token || '').trim();
    const version = Number(parsed.version);
    const expiresAt = String(parsed.expiresAt || '').trim();
    if (!token || version !== 1 || !expiresAt) {
      clearStoredRoomAdminCapability(roomId);
      return null;
    }
    const expiresAtMs = Date.parse(expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      clearStoredRoomAdminCapability(roomId);
      return null;
    }
    return { token, version, expiresAt };
  } catch {
    clearStoredRoomAdminCapability(roomId);
    return null;
  }
};

export class RoomService {
  /**
   * Creates a new social room in Firestore and automatically enters the creator.
   */
  static async createRoom(params: {
    roomName: string;
    description?: string;
    isPrivate: boolean;
    category?: string;
    coverUrl?: string;
    avatarUrl?: string;
  }): Promise<RoomDocument> {
    const user = auth.currentUser || (await ensureFirebaseAuth());
    const response = await fetch('/api/beta/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        creatorName: user.displayName || 'Oyuncu',
        creatorUid: user.uid,
        creatorAvatar: user.photoURL || undefined,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.room) {
      throw new Error(payload?.error || `beta_room_create_http_${response.status}`);
    }

    const room = payload.room as RoomDocument;
    const capability = payload?.roomAdminCapability;
    if (
      capability &&
      typeof capability.token === 'string' &&
      typeof capability.expiresAt === 'string'
    ) {
      storeRoomAdminCapability(room.roomId, {
        token: capability.token,
        version: Number(capability.version || 1),
        expiresAt: capability.expiresAt,
      });
    } else {
      clearStoredRoomAdminCapability(room.roomId);
    }

    return room;
  }

  static hasStoredRoomAdminCapability(roomId: string): boolean {
    return Boolean(readStoredRoomAdminCapability(roomId));
  }

  static async checkRoomAdminCapability(roomId: string): Promise<boolean> {
    const stored = readStoredRoomAdminCapability(roomId);
    if (!stored) return false;

    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/admin-capability/status`,
        {
          method: 'GET',
          headers: {
            'X-Room-Admin-Capability': stored.token,
          },
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.active !== true) {
        clearStoredRoomAdminCapability(roomId);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  static async rotateRoomAdminCapability(roomId: string): Promise<void> {
    const user = auth.currentUser || (await ensureFirebaseAuth());
    const idToken = await user.getIdToken();
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(roomId)}/admin-capability/rotate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.roomAdminCapability) {
      throw new Error(payload?.error || `room_admin_rotate_http_${response.status}`);
    }
    storeRoomAdminCapability(roomId, {
      token: String(payload.roomAdminCapability.token || ''),
      version: Number(payload.roomAdminCapability.version || 1),
      expiresAt: String(payload.roomAdminCapability.expiresAt || ''),
    });
  }

  static async revokeRoomAdminCapability(roomId: string): Promise<void> {
    const user = auth.currentUser || (await ensureFirebaseAuth());
    const idToken = await user.getIdToken();
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(roomId)}/admin-capability/revoke`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `room_admin_revoke_http_${response.status}`);
    }
    clearStoredRoomAdminCapability(roomId);
  }

  static clearRoomAdminCapability(roomId: string): void {
    clearStoredRoomAdminCapability(roomId);
  }

  static clearAllRoomAdminCapabilities(): void {
    if (typeof sessionStorage === 'undefined') return;
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (
        key?.startsWith(ROOM_ADMIN_CAPABILITY_STORAGE_PREFIX) ||
        key?.startsWith(LEGACY_ROOM_ADMIN_CAPABILITY_STORAGE_PREFIX)
      ) {
        sessionStorage.removeItem(key);
      }
    }
  }

  static async inviteKaira(roomId: string): Promise<{
    room: RoomDocument;
    introMessage?: RoomChatMessage;
    alreadyActive?: boolean;
  }> {
    const inviteRequestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `invite_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const ownerCapability = readStoredRoomAdminCapability(roomId)?.token || '';

    if (ownerCapability) {
      headers['X-Room-Admin-Capability'] = ownerCapability;
    } else {
      const user = auth.currentUser || (await ensureFirebaseAuth());
      const idToken = await user.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    }

    const response = await fetch(
      `/api/beta/rooms/${encodeURIComponent(roomId)}/kaira-invite`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ inviteRequestId }),
      },
    );

    const payload = await response.json().catch(() => null);
    if (response.status === 202 && payload?.inProgress) {
      throw new Error('Kaira zaten çağrılıyor, birkaç saniye sonra tekrar deneyin.');
    }
    if (!response.ok || !payload?.room) {
      throw new Error(payload?.error || `kaira_invite_http_${response.status}`);
    }

    return {
      room: payload.room as RoomDocument,
      introMessage: payload.introMessage as RoomChatMessage | undefined,
      alreadyActive: Boolean(payload.alreadyActive),
    };
  }

  /**
   * Fetches room by ID
   */
  static async getRoom(roomId: string): Promise<RoomDocument | null> {
    try {
      const docRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as RoomDocument;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`);
      return null;
    }
  }

  /**
   * Search rooms by room name (client-side or query filtering)
   */
  static async searchRooms(searchQuery?: string): Promise<RoomDocument[]> {
    try {
      // Ensure all starter community rooms exist
      await RoomService.ensureStarterRooms();

      const q = query(
        collection(db, 'rooms'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      const rooms: RoomDocument[] = [];

      snap.docs.forEach((d) => {
        const r = d.data() as RoomDocument;
        rooms.push(r);
      });

      // Merge with default starter rooms in case Firestore had any missing
      const starterList = RoomService.getDefaultStarterRoomDocs();
      const mergedMap = new Map<string, RoomDocument>();
      starterList.forEach((r) => mergedMap.set(r.roomId, r));
      rooms.forEach((r) => mergedMap.set(r.roomId, r));

      let allRooms = Array.from(mergedMap.values());

      if (searchQuery && searchQuery.trim()) {
        const clean = searchQuery.trim().toLowerCase();
        allRooms = allRooms.filter(
          (r) =>
            r.roomName.toLowerCase().includes(clean) ||
            (r.category && r.category.toLowerCase().includes(clean)) ||
            (r.description && r.description.toLowerCase().includes(clean)) ||
            r.creatorName.toLowerCase().includes(clean)
        );
      }

      // Sort by creation time (newest first)
      return allRooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (err) {
      console.error('Error searching rooms:', err);
      return RoomService.getDefaultStarterRoomDocs();
    }
  }

  /**
   * Returns deterministic default starter rooms
   */
  static getDefaultStarterRoomDocs(): RoomDocument[] {
    return [
      {
        roomId: 'room-super-lig',
        roomName: 'Süper Lig',
        category: 'Futbol',
        iconType: 'spor',
        description: 'Kullanıcıların Süper Lig hakkında sohbet edebileceği topluluk odası.',
        coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
        avatarUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=200',
        isPrivate: false,
        creatorUid: 'community-system',
        creatorName: 'Topluluk',
        creatorAvatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=200',
        participants: [
          {
            uid: 'community-system',
            username: 'superlig_admin',
            displayName: 'Topluluk',
            avatarUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=200',
            joinedAt: new Date().toISOString(),
            isHost: true,
          },
        ],
        requests: [],
        invites: [],
        status: 'active',
        createdAt: 1700000004000,
        updatedAt: 1700000004000,
      },
      {
        roomId: 'room-arkadas-kosesi',
        roomName: 'Arkadaş Köşesi',
        category: 'Müzik',
        iconType: 'music',
        description: 'Müzik dinleyip keyifli sohbet edebileceğiniz samimi arkadaş köşesi.',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        isPrivate: false,
        creatorUid: 'community-system',
        creatorName: 'Topluluk',
        creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        participants: [
          {
            uid: 'community-system',
            username: 'arkadas_admin',
            displayName: 'Topluluk',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
            joinedAt: new Date().toISOString(),
            isHost: true,
          },
        ],
        requests: [],
        invites: [],
        status: 'active',
        createdAt: 1700000003000,
        updatedAt: 1700000003000,
      },
      {
        roomId: 'room-gece-yolu',
        roomName: 'Gece Yolu',
        category: 'Spor',
        iconType: 'spor',
        description: 'Gece kuşu sporcular ve aktif oyuncuların buluşma noktası.',
        coverUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=800',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
        isPrivate: false,
        creatorUid: 'community-system',
        creatorName: 'Topluluk',
        creatorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
        participants: [
          {
            uid: 'community-system',
            username: 'gece_admin',
            displayName: 'Topluluk',
            avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
            joinedAt: new Date().toISOString(),
            isHost: true,
          },
        ],
        requests: [],
        invites: [],
        status: 'active',
        createdAt: 1700000002000,
        updatedAt: 1700000002000,
      },
      {
        roomId: 'room-prv42',
        roomName: 'PRV42',
        category: 'Genel sohbet',
        iconType: 'chat',
        description: 'Özel genel sohbet ve muhabbet odası.',
        coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        isPrivate: false,
        creatorUid: 'community-system',
        creatorName: 'Topluluk',
        creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        participants: [
          {
            uid: 'community-system',
            username: 'prv_admin',
            displayName: 'Topluluk',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
            joinedAt: new Date().toISOString(),
            isHost: true,
          },
        ],
        requests: [],
        invites: [],
        status: 'active',
        createdAt: 1700000001000,
        updatedAt: 1700000001000,
      },
      {
        roomId: 'room-oyun-kulubu',
        roomName: 'Oyun Kulübü',
        category: 'Genel sohbet',
        iconType: 'chat',
        description: 'Oyun ve eğlence odaklı topluluk sohbet odası.',
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
        avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=200',
        isPrivate: false,
        creatorUid: 'community-system',
        creatorName: 'Topluluk',
        creatorAvatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=200',
        participants: [
          {
            uid: 'community-system',
            username: 'gamer_admin',
            displayName: 'Topluluk',
            avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=200',
            joinedAt: new Date().toISOString(),
            isHost: true,
          },
        ],
        requests: [],
        invites: [],
        status: 'active',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ];
  }

  /**
   * Ensures all starter community rooms are initialized in Firestore with fixed IDs (deduplicated)
   */
  static async ensureStarterRooms(): Promise<void> {
    try {
      const starters = RoomService.getDefaultStarterRoomDocs();
      for (const room of starters) {
        const roomRef = doc(db, 'rooms', room.roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) {
          await setDoc(roomRef, {
            ...room,
            createdAtServer: serverTimestamp(),
            updatedAtServer: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn('Starter rooms seeding check warning:', err);
    }
  }

  /**
   * Backwards compatible seed helper for Süper Lig
   */
  static async ensureSuperLigSeedRoom(): Promise<void> {
    return RoomService.ensureStarterRooms();
  }

  /**
   * Real-time subscription to active rooms with deduplicated merging
   */
  static subscribeToActiveRooms(
    onUpdate: (rooms: RoomDocument[]) => void,
    onError?: (err: Error) => void
  ) {
    RoomService.ensureStarterRooms().catch(console.warn);

    const q = query(
      collection(db, 'rooms'),
      where('status', '==', 'active')
    );

    return onSnapshot(
      q,
      (snap) => {
        const firestoreRooms: RoomDocument[] = [];
        snap.docs.forEach((d) => {
          firestoreRooms.push(d.data() as RoomDocument);
        });

        const starterList = RoomService.getDefaultStarterRoomDocs();
        const mergedMap = new Map<string, RoomDocument>();
        // Add starters first
        starterList.forEach((r) => mergedMap.set(r.roomId, r));
        // Add firestore rooms (real-time updates overwrite matching IDs)
        firestoreRooms.forEach((r) => mergedMap.set(r.roomId, r));

        const finalRooms = Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(finalRooms);
      },
      (err) => {
        console.warn('Rooms real-time subscription error, using fallback starter rooms:', err);
        onUpdate(RoomService.getDefaultStarterRoomDocs());
        if (onError) onError(err);
      }
    );
  }

  private static async persistKairaWelcome(
    roomId: string,
    actorUserId: string,
  ): Promise<void> {
    const response = await fetch(
      `/api/beta/rooms/${encodeURIComponent(roomId)}/lifecycle`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'participant.joined',
          actorUserId,
        }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        payload?.error || `beta_room_lifecycle_http_${response.status}`,
      );
    }
  }

  /**
   * Join an open/public room directly
   */
  static async joinPublicRoom(roomId: string): Promise<RoomDocument> {
    const user = await ensureFirebaseAuth();
    const userProfile = await UserService.ensureUserProfile(user);

    const roomRef = doc(db, 'rooms', roomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) {
      throw new Error('Oda bulunamadı.');
    }

    const roomData = docSnap.data() as RoomDocument;

    if (roomData.isPrivate) {
      throw new Error('Bu oda kapalı bir odadır. Lütfen katılma isteği gönderin.');
    }

    const currentParticipants = Array.isArray(roomData.participants) ? roomData.participants : [];
    const alreadyParticipant = currentParticipants.some((p) => p.uid === user.uid);

    if (!alreadyParticipant) {
      const newParticipant: RoomParticipant = {
        uid: user.uid,
        username: String(userProfile.username || user.displayName || 'Oyuncu'),
        displayName: String(userProfile.displayName || user.displayName || 'Oyuncu'),
        avatarUrl: String(userProfile.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
        joinedAt: new Date().toISOString(),
        isHost: false,
      };

      const updatedParticipants = [...currentParticipants, newParticipant];
      await updateDoc(roomRef, {
        participants: updatedParticipants,
        updatedAt: Date.now(),
      });

      roomData.participants = updatedParticipants;
      await RoomService.persistKairaWelcome(roomId, newParticipant.uid);
    }

    return roomData;
  }

  /**
   * Send a join request for a private room
   */
  static async sendJoinRequest(roomId: string): Promise<void> {
    const user = await ensureFirebaseAuth();
    const userProfile = await UserService.ensureUserProfile(user);

    const roomRef = doc(db, 'rooms', roomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) {
      throw new Error('Oda bulunamadı.');
    }

    const roomData = docSnap.data() as RoomDocument;
    const currentRequests = Array.isArray(roomData.requests) ? roomData.requests : [];

    // Check if user already requested
    const existingReq = currentRequests.find((r) => r.uid === user.uid);
    if (existingReq && existingReq.status === 'pending') {
      throw new Error('Zaten katılma isteği gönderilmiş.');
    }

    const newRequest: RoomRequest = {
      uid: user.uid,
      username: String(userProfile.username || user.displayName || 'Oyuncu'),
      displayName: String(userProfile.displayName || user.displayName || 'Oyuncu'),
      avatarUrl: String(userProfile.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };

    // Replace or append request
    const updatedRequests = [
      ...currentRequests.filter((r) => r.uid !== user.uid),
      newRequest,
    ];

    await updateDoc(roomRef, {
      requests: updatedRequests,
      updatedAt: Date.now(),
    });
  }

  /**
   * Accept or reject a join request (Host/Manager action)
   */
  static async respondToJoinRequest(
    roomId: string,
    targetUid: string,
    accept: boolean
  ): Promise<void> {
    const user = await ensureFirebaseAuth();
    const roomRef = doc(db, 'rooms', roomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) return;

    const roomData = docSnap.data() as RoomDocument;
    const currentRequests = Array.isArray(roomData.requests) ? roomData.requests : [];
    const currentParticipants = Array.isArray(roomData.participants) ? roomData.participants : [];

    const targetReq = currentRequests.find((r) => r.uid === targetUid);
    if (!targetReq) return;

    // Remove or mark request
    const updatedRequests = currentRequests.filter((r) => r.uid !== targetUid);
    let updatedParticipants = [...currentParticipants];

    if (accept) {
      const alreadyIn = updatedParticipants.some((p) => p.uid === targetUid);
      if (!alreadyIn) {
        updatedParticipants.push({
          uid: targetReq.uid,
          username: targetReq.username,
          displayName: targetReq.displayName,
          avatarUrl: targetReq.avatarUrl,
          joinedAt: new Date().toISOString(),
          isHost: false,
        });
      }
    }

    await updateDoc(roomRef, {
      requests: updatedRequests,
      participants: updatedParticipants,
      updatedAt: Date.now(),
    });

    if (accept && targetReq) {
      await RoomService.persistKairaWelcome(roomId, targetReq.uid);
    }
  }

  /**
   * Send room invitation to a RAMI user
   */
  static async sendInvite(
    roomId: string,
    targetUser: { uid: string; username: string; displayName?: string; avatarUrl?: string }
  ): Promise<void> {
    const user = await ensureFirebaseAuth();
    const userProfile = await UserService.ensureUserProfile(user);

    const roomRef = doc(db, 'rooms', roomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) {
      throw new Error('Oda bulunamadı.');
    }

    const roomData = docSnap.data() as RoomDocument;
    const currentInvites = Array.isArray(roomData.invites) ? roomData.invites : [];

    // Check if already invited
    const existing = currentInvites.find(
      (i) => i.targetUid === targetUser.uid && i.status === 'pending'
    );
    if (existing) {
      throw new Error('Bu kullanıcıya zaten davet gönderildi.');
    }

    const newInvite: RoomInvite = {
      id: `${roomId}_${targetUser.uid}_${Date.now()}`,
      targetUid: targetUser.uid,
      targetUsername: targetUser.username,
      targetDisplayName: targetUser.displayName || targetUser.username,
      targetAvatarUrl: targetUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      invitedByUid: user.uid,
      invitedByName: String(userProfile.displayName || user.displayName || 'Oyuncu'),
      invitedAt: new Date().toISOString(),
      status: 'pending',
    };

    const updatedInvites = [...currentInvites, newInvite];

    await updateDoc(roomRef, {
      invites: updatedInvites,
      updatedAt: Date.now(),
    });
  }

  /**
   * Accept or reject a room invite
   */
  static async respondToInvite(
    roomId: string,
    accept: boolean
  ): Promise<void> {
    const user = await ensureFirebaseAuth();
    const userProfile = await UserService.ensureUserProfile(user);

    const roomRef = doc(db, 'rooms', roomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) return;

    const roomData = docSnap.data() as RoomDocument;
    const currentInvites = Array.isArray(roomData.invites) ? roomData.invites : [];
    const currentParticipants = Array.isArray(roomData.participants) ? roomData.participants : [];

    // Find pending invite for this user
    const updatedInvites = currentInvites.map((inv) => {
      if (inv.targetUid === user.uid && inv.status === 'pending') {
        return { ...inv, status: accept ? ('accepted' as const) : ('rejected' as const) };
      }
      return inv;
    });

    let updatedParticipants = [...currentParticipants];
    if (accept) {
      const alreadyIn = updatedParticipants.some((p) => p.uid === user.uid);
      if (!alreadyIn) {
        updatedParticipants.push({
          uid: user.uid,
          username: String(userProfile.username || user.displayName || 'Oyuncu'),
          displayName: String(userProfile.displayName || user.displayName || 'Oyuncu'),
          avatarUrl: String(userProfile.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
          joinedAt: new Date().toISOString(),
          isHost: false,
        });
      }
    }

    await updateDoc(roomRef, {
      invites: updatedInvites,
      participants: updatedParticipants,
      updatedAt: Date.now(),
    });

    if (accept) {
      await RoomService.persistKairaWelcome(roomId, user.uid);
    }
  }

  /**
   * Fetches rooms where current user has a pending invite
   */
  static async getUserPendingInvites(): Promise<
    Array<{ room: RoomDocument; invite: RoomInvite }>
  > {
    const user = await ensureFirebaseAuth();
    try {
      const q = query(
        collection(db, 'rooms'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      const results: Array<{ room: RoomDocument; invite: RoomInvite }> = [];

      snap.docs.forEach((d) => {
        const room = d.data() as RoomDocument;
        if (Array.isArray(room.invites)) {
          const inv = room.invites.find(
            (i) => i.targetUid === user.uid && i.status === 'pending'
          );
          if (inv) {
            results.push({ room, invite: inv });
          }
        }
      });

      return results;
    } catch (err) {
      console.error('Error fetching user invites:', err);
      return [];
    }
  }

  /**
   * Subscribe to real-time changes of a single room
   */
  static subscribeToRoom(
    roomId: string,
    onUpdate: (room: RoomDocument) => void,
    onError?: (err: Error) => void
  ) {
    const roomRef = doc(db, 'rooms', roomId);
    return onSnapshot(
      roomRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as RoomDocument);
        }
      },
      (error) => {
        console.error('Room subscription error:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Leave a room
   */
  static async leaveRoom(roomId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const docSnap = await getDoc(roomRef);
      if (!docSnap.exists()) return;

      const roomData = docSnap.data() as RoomDocument;
      const updatedParticipants = (roomData.participants || []).filter(
        (p) => p.uid !== currentUser.uid
      );

      if (updatedParticipants.length === 0) {
        // Archive room if empty
        await updateDoc(roomRef, {
          status: 'archived',
          updatedAt: Date.now(),
        });
      } else {
        // If host left, assign first remaining as host
        const hasHost = updatedParticipants.some((p) => p.isHost);
        if (!hasHost && updatedParticipants.length > 0) {
          updatedParticipants[0].isHost = true;
        }

        await updateDoc(roomRef, {
          participants: updatedParticipants,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Odadan ayrılma hatası:', err);
    }
  }

  /**
   * Send a room chat message (saved in rooms/{roomId}/messages)
   */
  static async sendRoomMessage(
    roomId: string,
    messageData: {
      messageId?: string;
      senderUid: string;
      senderName: string;
      senderUsername?: string;
      senderAvatar: string;
      content: string;
      roleColor?: string;
      roleIcon?: string;
      roleName?: string;
      messageSource?: 'kaira_canonical_welcome';
    }
  ): Promise<void> {
    try {
      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      const requestedMessageId = String(messageData.messageId || '')
        .trim()
        .replace(/\//g, '_')
        .slice(0, 180);
      const msgDoc = requestedMessageId
        ? doc(messagesRef, requestedMessageId)
        : doc(messagesRef);
      const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      await setDoc(msgDoc, {
        id: msgDoc.id,
        senderUid: messageData.senderUid,
        senderName: messageData.senderName,
        senderUsername: messageData.senderUsername || messageData.senderName.toLowerCase().replace(/\s+/g, '_'),
        senderAvatar: messageData.senderAvatar,
        content: messageData.content,
        timestamp: timeStr,
        roleColor: messageData.roleColor || null,
        roleIcon: messageData.roleIcon || null,
        roleName: messageData.roleName || null,
        messageSource: messageData.messageSource || null,
        createdAtServer: serverTimestamp(),
      });
    } catch (err) {
      console.error('Mesaj kaydetme hatası:', err);
      handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}/messages`);
    }
  }

  /**
   * Subscribe to real-time room chat messages
   */
  static subscribeToRoomMessages(
    roomId: string,
    onUpdate: (messages: RoomChatMessage[]) => void,
    onError?: (err: Error) => void
  ) {
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAtServer', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: RoomChatMessage[] = [];
        snapshot.docs.forEach((d) => {
          msgs.push(d.data() as RoomChatMessage);
        });
        onUpdate(msgs);
      },
      (error) => {
        console.warn('Oda mesajları sıralı abonelik hatası, varsayılan dinlemeye geçiliyor:', error);
        return onSnapshot(
          messagesRef,
          (snap) => {
            const msgs: RoomChatMessage[] = [];
            snap.docs.forEach((d) => {
              msgs.push(d.data() as RoomChatMessage);
            });
            onUpdate(msgs);
          },
          (err2) => {
            if (onError) onError(err2);
          }
        );
      }
    );
  }

  /**
   * Call server-side Zipo Gemini AI endpoint
   */
  static async callZipoApi(prompt: string, roomId?: string): Promise<string> {
    try {
      const res = await fetch('/api/chat/zipo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, roomId }),
      });

      if (!res.ok) {
        throw new Error('API yanıtı alınamadı.');
      }

      const data = await res.json();
      return data.reply || 'Zipo şu an yanıt veremiyor.';
    } catch (err) {
      console.error('Zipo API çağrısı hatası:', err);
      return 'Zipo: Üzgünüm, şu an sunucu bağlantımda ufak bir aksaklık var!';
    }
  }

  /**
   * Delete a room chat message
   */
  static async deleteRoomMessage(roomId: string, messageId: string): Promise<void> {
    try {
      const msgRef = doc(db, 'rooms', roomId, 'messages', messageId);
      await deleteDoc(msgRef);
    } catch (err) {
      console.warn('Mesaj silme uyarısı:', err);
    }
  }

  /**
   * Edit a room chat message
   */
  static async editRoomMessage(roomId: string, messageId: string, newContent: string): Promise<void> {
    try {
      const msgRef = doc(db, 'rooms', roomId, 'messages', messageId);
      await updateDoc(msgRef, {
        content: newContent,
        isEdited: true,
        updatedAtServer: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Mesaj düzenleme uyarısı:', err);
    }
  }
}
