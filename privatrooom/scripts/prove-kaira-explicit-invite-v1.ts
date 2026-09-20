import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildInitialBetaRoomParticipants,
  canInviteKaira,
  isKairaParticipant,
} from "../src/server/kairaInviteContract";
import {
  ROOM_ADMIN_CAPABILITY_VERSION,
  issueRoomAdminCapability,
  verifyRoomAdminCapability,
} from "../src/server/roomAdminCapability";

const creator = {
  uid: "owner_1",
  username: "owner",
  displayName: "Owner",
  avatarUrl: "",
  joinedAt: "2026-09-19T00:00:00.000Z",
  isHost: true,
  roleId: "owner" as const,
};

const participants = buildInitialBetaRoomParticipants(creator);
assert.equal(participants.length, 1, "new room must start with only the human creator");
assert.equal(isKairaParticipant(participants), false, "Kaira must be absent before explicit invite");
assert.equal(canInviteKaira({ creatorUid: "owner_1", participants }, "owner_1"), true);
assert.equal(canInviteKaira({ creatorUid: "owner_1", participants }, "member_2"), false);

const issuedCapability = issueRoomAdminCapability({
  roomId: "room_capability_proof",
  ownerUid: "owner_1",
  nowMs: 1_000,
  ttlMs: 10_000,
  token: "rac1_test_token",
});
assert.equal(issuedCapability.record.version, ROOM_ADMIN_CAPABILITY_VERSION);
assert.equal(issuedCapability.record.expiresAtMs, 11_000);
assert.deepEqual(
  verifyRoomAdminCapability({
    presentedToken: issuedCapability.token,
    record: issuedCapability.record,
    roomId: "room_capability_proof",
    roomCreatorUid: "owner_1",
    nowMs: 5_000,
  }),
  { valid: true, reason: null },
);
assert.equal(
  verifyRoomAdminCapability({
    presentedToken: issuedCapability.token,
    record: issuedCapability.record,
    roomId: "room_capability_proof",
    roomCreatorUid: "owner_1",
    nowMs: 12_000,
  }).reason,
  "expired",
);
assert.equal(
  verifyRoomAdminCapability({
    presentedToken: issuedCapability.token,
    record: { ...issuedCapability.record, revokedAtMs: 6_000 },
    roomId: "room_capability_proof",
    roomCreatorUid: "owner_1",
    nowMs: 7_000,
  }).reason,
  "revoked",
);
assert.equal(
  verifyRoomAdminCapability({
    presentedToken: issuedCapability.token,
    record: issuedCapability.record,
    roomId: "room_capability_proof",
    roomCreatorUid: "owner_2",
    nowMs: 5_000,
  }).reason,
  "owner_mismatch",
);
assert.equal(
  verifyRoomAdminCapability({
    presentedToken: issuedCapability.token,
    record: { ...issuedCapability.record, version: 99 },
    roomId: "room_capability_proof",
    roomCreatorUid: "owner_1",
    nowMs: 5_000,
  }).reason,
  "version_mismatch",
);
assert.equal(
  verifyRoomAdminCapability({
    presentedToken: "wrong-token",
    record: issuedCapability.record,
    roomId: "room_capability_proof",
    roomCreatorUid: "owner_1",
    nowMs: 5_000,
  }).reason,
  "hash_mismatch",
);

const createRoute = readFileSync(
  new URL("../src/server/betaRoomCreateRoute.ts", import.meta.url),
  "utf8",
);
assert.match(createRoute, /buildInitialBetaRoomParticipants\(/);
assert.match(createRoute, /state:\s*'absent'/);
assert.match(createRoute, /\/kaira-invite'/);
assert.match(createRoute, /verifyIdToken\(/);
assert.match(createRoute, /inviteRequestId/);
assert.match(createRoute, /roomAdminCapability/);
assert.match(createRoute, /roomAdminCapabilities/);
assert.match(createRoute, /\/admin-capability\/status/);
assert.match(createRoute, /\/admin-capability\/rotate/);
assert.match(createRoute, /\/admin-capability\/revoke/);
assert.match(createRoute, /verifyRoomAdminCapability/);
assert.match(createRoute, /ROOM_ADMIN_CAPABILITY_VERSION/);
assert.doesNotMatch(createRoute, /betaRoomSecrets/);
const createHandlerStart = createRoute.indexOf("app.post('/api/beta/rooms'");
const inviteHandlerStart = createRoute.indexOf("'/api/beta/rooms/:roomId/kaira-invite'");
assert.ok(createHandlerStart >= 0 && inviteHandlerStart > createHandlerStart);
const createHandlerBody = createRoute.slice(createHandlerStart, inviteHandlerStart);
assert.doesNotMatch(
  createHandlerBody,
  /persistCanonicalKairaLifecycleWelcome\s*\(/,
  "room creation must not persist a Kaira welcome",
);

const roomService = readFileSync(
  new URL("../src/services/roomService.ts", import.meta.url),
  "utf8",
);
assert.match(roomService, /room_admin_capability:v1:/);
assert.match(roomService, /LEGACY_ROOM_ADMIN_CAPABILITY_STORAGE_PREFIX/);
assert.match(roomService, /checkRoomAdminCapability/);
assert.match(roomService, /rotateRoomAdminCapability/);
assert.match(roomService, /revokeRoomAdminCapability/);
assert.match(roomService, /clearAllRoomAdminCapabilities/);
assert.match(roomService, /X-Room-Admin-Capability/);
assert.match(roomService, /Authorization/);
assert.match(roomService, /const user = auth\.currentUser \|\| \(await ensureFirebaseAuth\(\)\);/);
assert.match(roomService, /messageId\?: string/);
assert.match(roomService, /requestedMessageId/);
assert.match(roomService, /creatorUid:\s*user\.uid/);
assert.match(roomService, /creatorName:\s*user\.displayName/);


const createRoomModal = readFileSync(
  new URL("../src/components/CreateRoomModal.tsx", import.meta.url),
  "utf8",
);
assert.match(createRoomModal, /hasValidatedRoomAdminCapability/);
assert.match(createRoomModal, /checkRoomAdminCapability/);
assert.match(createRoomModal, /canManageKaira[\s\S]*hasValidatedRoomAdminCapability/);
assert.match(
  createRoomModal,
  /const \[currentUser, setCurrentUser\] = useState\(auth\.currentUser\)/,
  "Kaira invite visibility must react to Firebase auth readiness",
);
assert.match(
  createRoomModal,
  /ensureFirebaseAuth\(\)[\s\S]*setCurrentUser\(u\)/,
  "resolved Firebase user must update React state",
);
assert.doesNotMatch(
  createRoomModal,
  /const currentUser = auth\.currentUser;/,
  "one-shot auth reads can leave owner-only Kaira controls permanently hidden",
);
assert.match(
  createRoomModal,
  /await RoomService\.sendRoomMessage\(activeRoom\.roomId, \{[\s\S]*messageId:\s*newMsg\.id/,
  "user message must persist before Kaira context is built",
);
assert.match(
  createRoomModal,
  /kaira_reply_not_persisted/,
  "UI must reject ephemeral Kaira replies without a persisted reply id",
);
assert.doesNotMatch(
  createRoomModal,
  /id:\s*`rm_kaira_\$\{Date\.now\(\)\}`/,
  "Kaira replies must not exist only in local React state",
);

const principalRoute = readFileSync(
  new URL("../src/server/kairaPrincipalRoute.ts", import.meta.url),
  "utf8",
);
assert.match(principalRoute, /if \(!isKairaPresenceActive\(data\)\) return;/);

const serverEntry = readFileSync(
  new URL("../server.ts", import.meta.url),
  "utf8",
);
assert.doesNotMatch(serverEntry, /await\s+bootstrapKairaPrincipal\s*\(/);
assert.match(
  serverEntry,
  /app\.listen\([\s\S]*void\s+bootstrapKairaPrincipal\(\)/,
  "HTTP listener must become ready before asynchronous Kaira bootstrap can block",
);

const chatRoute = readFileSync(
  new URL("../src/server/kairaBetaRoomChatRoute.ts", import.meta.url),
  "utf8",
);
assert.match(chatRoute, /!isKairaPresenceActive\(room\)/);
assert.match(chatRoute, /!isKairaParticipant\(participants\)/);
assert.match(chatRoute, /error: 'kaira_not_active'/);
assert.match(chatRoute, /acquireRoomTurnLock/);
assert.match(chatRoute, /roomTurnTails/);
assert.match(chatRoute, /messageSource:\s*'kaira_integration'/);
assert.match(chatRoute, /replyMessageId/);
assert.match(chatRoute, /superseded_by_newer_user_message/);
assert.match(chatRoute, /stale reply suppressed/);

const conversationContext = readFileSync(
  new URL("../src/server/kairaRoomConversationContext.ts", import.meta.url),
  "utf8",
);
assert.match(conversationContext, /kaira_invite_introduction/);
assert.match(conversationContext, /isWelcome:/);

console.log("kaira explicit invite contract proof: GREEN");
