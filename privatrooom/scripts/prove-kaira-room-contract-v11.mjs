import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`ROOM_CONTRACT_V11_RED: ${message}`);
  process.exit(1);
};

const contracts = read('src/integrations/kaira/contracts.ts');
const betaRoom = read('src/server/kairaBetaRoomChatRoute.ts');
const roomBridge = read('src/server/kairaRoomMentionBridge.ts');

if (!contracts.includes("kind: 'direct' | 'room'")) {
  fail('conversation kind is not typed as direct | room');
}
if (!contracts.includes("conversationKind?: 'direct' | 'room'")) {
  fail('event builder cannot select room conversation kind');
}
if (!contracts.includes("kind: input.conversationKind || 'direct'")) {
  fail('direct backward-compatible default is missing');
}
if (!betaRoom.includes("conversationKind: 'room'")) {
  fail('beta-room producer still mislabels room traffic');
}
if (!roomBridge.includes("conversationKind: 'room'")) {
  fail('room auto-reply producer still mislabels room traffic');
}
for (const [name, source] of [['beta-room', betaRoom], ['room-auto-reply', roomBridge]]) {
  if (/@kaira|@kairo|mentionRequired|requiresMention/iu.test(source)) {
    fail(`${name} introduced a mention gate`);
  }
}

console.log('ROOM_CONTRACT_V11_GREEN: first-class room metadata + mentionless transport verified');
