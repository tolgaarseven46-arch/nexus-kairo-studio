import fs from 'node:fs';

let server = fs.readFileSync('server.ts', 'utf8');

const oldBlock = `      enforcementRules = {\n        continueConversation: behaviorContract.continueConversation && runtimeFlag(authoritativePersonality, "runtimeContinueConversation", true),\n        humorAllowed: behaviorContract.playfulness === "allowed" && runtimeFlag(authoritativePersonality, "runtimeHumorAllowed", true),\n        askQuestion: behaviorContract.questions === "allowed" && runtimeFlag(authoritativePersonality, "runtimeAskQuestion", true),\n        behaviorContract,`;
const newBlock = `      enforcementRules = {\n        continueConversation: responsePlan.continueConversation,\n        humorAllowed: responsePlan.allowHumor,\n        askQuestion: responsePlan.allowQuestion,\n        behaviorContract,`;

if (server.includes(oldBlock)) server = server.replace(oldBlock, newBlock);
else if (!server.includes(newBlock)) throw new Error('Missing final enforcement authority patch target');

const liveFlagLeaks = [
  'runtimeFlag(authoritativePersonality, "runtimeContinueConversation"',
  'runtimeFlag(authoritativePersonality, "runtimeHumorAllowed"',
  'runtimeFlag(authoritativePersonality, "runtimeAskQuestion"',
].filter((needle) => server.includes(needle));
if (liveFlagLeaks.length) throw new Error(`Legacy live runtime flag veto remains: ${liveFlagLeaks.join(', ')}`);

const runtimeFlagDefinition = `function runtimeFlag(personality: DroitPersonalityTraits, key: string, fallback = true) {\n  const value = personality?.[key];\n  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;\n  return value >= 50;\n}\n`;
const runtimeFlagCalls = (server.match(/runtimeFlag\(/g) || []).length;
if (runtimeFlagCalls === 1 && server.includes(runtimeFlagDefinition)) {
  server = server.replace(runtimeFlagDefinition, '');
} else if (runtimeFlagCalls > 1) {
  throw new Error(`Unexpected remaining runtimeFlag usages in server: ${runtimeFlagCalls - 1}`);
}

fs.writeFileSync('server.ts', server);
console.log('KairaResponsePlan is final WHAT/WHETHER enforcement authority');
