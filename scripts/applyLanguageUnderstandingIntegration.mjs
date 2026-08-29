import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

const oldImport = 'import { resolveCanonicalSemanticEvent } from "./src/services/semanticEventAuthority";';
const newImport = 'import { resolveServerLanguageUnderstanding } from "./src/services/serverLanguageUnderstanding";';

if (source.includes(oldImport)) {
  source = source.replace(oldImport, newImport);
}

const cleanHistoryLine = '    const cleanHistory = sanitizeKairoChatHistory(history);';
const integrationBlock = `${cleanHistoryLine}\n    const languageUnderstanding = await resolveServerLanguageUnderstanding({\n      message: userMessage,\n      incomingSemanticEvent,\n      context: {\n        userName,\n        characterName: character.name || "KAIRO",\n        recentMessages: cleanHistory.slice(-8).map((item: any) => ({\n          role:\n            item.sender === "user"\n              ? ("user" as const)\n              : ("assistant" as const),\n          content: String(item.text || ""),\n        })),\n      },\n      preferredProvider: provider,\n      generateText,\n    });\n    const canonicalSemantic = {\n      event: languageUnderstanding.event,\n      source: languageUnderstanding.semanticSource,\n    };`;

if (!source.includes("const languageUnderstanding = await resolveServerLanguageUnderstanding")) {
  if (!source.includes(cleanHistoryLine)) {
    throw new Error("cleanHistory insertion point not found");
  }
  source = source.replace(cleanHistoryLine, integrationBlock);
}

const oldCanonical = '      canonicalSemantic = resolveCanonicalSemanticEvent(userMessage, incomingSemanticEvent),\n';
if (source.includes(oldCanonical)) {
  source = source.replace(oldCanonical, "");
}

if (source.includes("resolveCanonicalSemanticEvent")) {
  throw new Error("legacy canonical semantic resolver still referenced");
}

if (!source.includes("resolveServerLanguageUnderstanding")) {
  throw new Error("language understanding bridge was not integrated");
}

fs.writeFileSync(path, source);
console.log("server.ts language-understanding integration applied");
