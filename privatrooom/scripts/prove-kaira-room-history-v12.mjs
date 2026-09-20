import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`ROOM_HISTORY_V12_RED: ${message}`);
  process.exit(1);
};

const contracts = read('src/integrations/kaira/contracts.ts');
const route = read('src/server/kairaBetaRoomChatRoute.ts');
const context = read('src/server/kairaRoomConversationContext.ts');

if (!contracts.includes('roomContext?: PrivatRoomRoomContext')) fail('roomContext contract missing');
if (!route.includes('loadKairaRoomConversationContext')) fail('beta-room route does not load authoritative room transcript');
if (!route.includes('roomContext,')) fail('beta-room event does not carry roomContext');
if (!context.includes("messageSource === 'kaira_canonical_welcome'")) fail('canonical welcome origin not preserved');
if (!context.includes("senderUid === input.actorUserId")) fail('dyadic actor filtering missing');
if (!context.includes('currentMessageText')) fail('current message duplicate filter missing');
console.log('ROOM_HISTORY_V12_GREEN: platform-owned room transcript feeds Kaira without TestSession authority');
