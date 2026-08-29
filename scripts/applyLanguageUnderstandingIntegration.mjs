import fs from "node:fs";

const serverPath = "server.ts";
let server = fs.readFileSync(serverPath, "utf8");

const oldImport = 'import { resolveCanonicalSemanticEvent } from "./src/services/semanticEventAuthority";';
const newImport = 'import { resolveServerLanguageUnderstanding } from "./src/services/serverLanguageUnderstanding";';
if (server.includes(oldImport)) server = server.replace(oldImport, newImport);

const healthLine = 'app.get("/api/health", (_q, r) =>';
const languageEndpoint = `app.post("/api/language-understanding", async (req, res) => {\n  try {\n    const {\n      userMessage,\n      userName = "Kullanıcı",\n      characterName = "KAIRO",\n      history = [],\n      provider = "openrouter",\n    } = req.body || {};\n    if (!userMessage?.trim())\n      return res.status(400).json({ error: "userMessage is required" });\n\n    const recentMessages = Array.isArray(history)\n      ? history.slice(-8).map((item: any) => ({\n          role: item?.role === "assistant" ? ("assistant" as const) : ("user" as const),\n          content: String(item?.content || ""),\n        }))\n      : [];\n\n    const result = await resolveServerLanguageUnderstanding({\n      message: String(userMessage),\n      context: { userName, characterName, recentMessages },\n      preferredProvider: provider,\n      generateText,\n    });\n\n    res.json({ ok: true, ...result });\n  } catch (error: any) {\n    res.status(500).json({\n      ok: false,\n      error: error?.message || "Language understanding failed",\n    });\n  }\n});\n`;
if (!server.includes('app.post("/api/language-understanding"')) {
  if (!server.includes(healthLine)) throw new Error("health endpoint insertion point not found");
  server = server.replace(healthLine, `${languageEndpoint}\n${healthLine}`);
}

const cleanHistoryLine = '    const cleanHistory = sanitizeKairoChatHistory(history);';
const integrationBlock = `${cleanHistoryLine}\n    const languageUnderstanding = await resolveServerLanguageUnderstanding({\n      message: userMessage,\n      incomingSemanticEvent,\n      context: {\n        userName,\n        characterName: character.name || "KAIRO",\n        recentMessages: cleanHistory.slice(-8).map((item: any) => ({\n          role:\n            item.sender === "user"\n              ? ("user" as const)\n              : ("assistant" as const),\n          content: String(item.text || ""),\n        })),\n      },\n      preferredProvider: provider,\n      generateText,\n    });\n    const canonicalSemantic = {\n      event: languageUnderstanding.event,\n      source: languageUnderstanding.semanticSource,\n    };`;
if (!server.includes("const languageUnderstanding = await resolveServerLanguageUnderstanding")) {
  if (!server.includes(cleanHistoryLine)) throw new Error("cleanHistory insertion point not found");
  server = server.replace(cleanHistoryLine, integrationBlock);
}

const oldCanonical = '      canonicalSemantic = resolveCanonicalSemanticEvent(userMessage, incomingSemanticEvent),\n';
if (server.includes(oldCanonical)) server = server.replace(oldCanonical, "");
if (server.includes("resolveCanonicalSemanticEvent")) throw new Error("legacy canonical semantic resolver still referenced");
fs.writeFileSync(serverPath, server);

const clientPath = "src/services/droitChatService.ts";
let client = fs.readFileSync(clientPath, "utf8");
const clientImport = 'import { requestCanonicalLanguageUnderstanding, type ClientLanguageUnderstandingResult } from "./clientLanguageUnderstanding";';
if (!client.includes(clientImport)) {
  const anchor = 'import { auth } from "../lib/firebase";';
  if (!client.includes(anchor)) throw new Error("droitChatService import anchor not found");
  client = client.replace(anchor, `${anchor}\n${clientImport}`);
}

const responseFieldAnchor = '  turnId?: string;\n}';
if (!client.includes('languageUnderstanding?: ClientLanguageUnderstandingResult;')) {
  if (!client.includes(responseFieldAnchor)) throw new Error("response interface anchor not found");
  client = client.replace(responseFieldAnchor, '  turnId?: string;\n  languageUnderstanding?: ClientLanguageUnderstandingResult;\n}');
}

const oldSemanticLine = '    const semanticEvent = interpretSemanticEvent(userMessage);';
const semanticPreflight = `    let languageUnderstanding: ClientLanguageUnderstandingResult;\n    try {\n      languageUnderstanding = await requestCanonicalLanguageUnderstanding({\n        message: userMessage,\n        userName,\n        characterName: characterInfo.name || "KAIRO",\n        provider,\n        recentMessages: history.slice(-8).map((m) => ({\n          role: m.sender === "droit" ? ("assistant" as const) : ("user" as const),\n          content: m.text,\n        })),\n      });\n    } catch (error) {\n      languageUnderstanding = {\n        event: interpretSemanticEvent(userMessage),\n        semanticSource: "fallback_regex",\n        warnings: [\n          \`Canonical language preflight failed: \${error instanceof Error ? error.message : String(error)}\`,\n        ],\n      };\n    }\n    const semanticEvent = languageUnderstanding.event;`;
if (client.includes(oldSemanticLine)) client = client.replace(oldSemanticLine, semanticPreflight);

const sourceLine = '      const semanticSource = String(data.kdm?.semanticSource || "client_fallback");';
if (client.includes(sourceLine)) {
  client = client.replace(sourceLine, '      const semanticSource = languageUnderstanding.semanticSource;');
}

const returnLine = '      return { reply, profile: behaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed, timings, sessionId: data.sessionId || resolvedSessionId, turnId: data.turnId };';
if (client.includes(returnLine)) {
  client = client.replace(returnLine, '      return { reply, profile: behaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed, timings, sessionId: data.sessionId || resolvedSessionId, turnId: data.turnId, languageUnderstanding };');
}

if (!client.includes("requestCanonicalLanguageUnderstanding")) throw new Error("canonical preflight not integrated into droitChatService");
fs.writeFileSync(clientPath, client);
console.log("server + client canonical language-understanding integration applied");
