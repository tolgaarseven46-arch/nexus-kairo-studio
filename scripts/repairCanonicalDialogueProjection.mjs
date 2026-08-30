import fs from 'node:fs';

let server = fs.readFileSync('server.ts', 'utf8');

const repairAttributionCall = (replyName) => {
  const re = new RegExp(
    `findDialogueAttributionIssues\\(\\s*${replyName},\\s*cleanHistory,\\s*userMessage,\\s*userName,\\s*\\)`,
    'u',
  );
  server = server.replace(
    re,
    `findDialogueAttributionIssues(\n            ${replyName},\n            cleanHistory,\n            userMessage,\n            userName,\n            dialogueAnalysis,\n          )`,
  );
};

repairAttributionCall('repairedReply');
repairAttributionCall('fallback');

const remaining = [...server.matchAll(/findDialogueAttributionIssues\([\s\S]*?\)/gu)]
  .filter((match) => !match[0].includes('dialogueAnalysis'));

if (remaining.length > 0) {
  throw new Error(`Current-turn attribution projection leak remains: ${remaining.length}`);
}

fs.writeFileSync('server.ts', server);
console.log('Canonical dialogue attribution projection leaks repaired');
