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
if (client.includes(sourceLine)) client = client.replace(sourceLine, '      const semanticSource = languageUnderstanding.semanticSource;');

const auditAnchor = '        semanticSource,\n        appraisalTemperament:';
if (!client.includes('languageUnderstanding: {\n          semanticProvider:')) {
  if (!client.includes(auditAnchor)) throw new Error("layer audit anchor not found");
  client = client.replace(
    auditAnchor,
    '        semanticSource,\n        languageUnderstanding: {\n          semanticProvider: languageUnderstanding.semanticProvider,\n          morphologyProvider: languageUnderstanding.morphologyProvider,\n          morphology: languageUnderstanding.morphology,\n          warnings: languageUnderstanding.warnings,\n        },\n        appraisalTemperament:',
  );
}

const returnLine = '      return { reply, profile: behaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed, timings, sessionId: data.sessionId || resolvedSessionId, turnId: data.turnId };';
if (client.includes(returnLine)) client = client.replace(returnLine, '      return { reply, profile: behaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed, timings, sessionId: data.sessionId || resolvedSessionId, turnId: data.turnId, languageUnderstanding };');

if (!client.includes("requestCanonicalLanguageUnderstanding")) throw new Error("canonical preflight not integrated into droitChatService");
fs.writeFileSync(clientPath, client);

const labPath = "src/components/studio/tabs/TestLabTab.tsx";
let lab = fs.readFileSync(labPath, "utf8");

const analysisTypeAnchor = '    latencyMs: number;\n  }>(() => {';
if (!lab.includes('languageUnderstanding: {\n      source: string;')) {
  if (!lab.includes(analysisTypeAnchor)) throw new Error("TestLab analysis type anchor not found");
  lab = lab.replace(
    analysisTypeAnchor,
    `    languageUnderstanding: {\n      source: string;\n      semanticProvider: string;\n      morphologyProvider: string;\n      target: string;\n      intent: string;\n      valence: string;\n      insult: boolean;\n      severity: number;\n      warnings: string[];\n    };\n    latencyMs: number;\n  }>(() => {`,
  );
}

const initialLatency = '      latencyMs: 320,\n    };';
if (!lab.includes("source: 'başlangıç',")) {
  if (!lab.includes(initialLatency)) throw new Error("TestLab initial analysis anchor not found");
  lab = lab.replace(
    initialLatency,
    `      languageUnderstanding: {\n        source: 'başlangıç',\n        semanticProvider: '-',\n        morphologyProvider: '-',\n        target: 'unknown',\n        intent: 'general_chat',\n        valence: 'neutral',\n        insult: false,\n        severity: 0,\n        warnings: [],\n      },\n      latencyMs: 320,\n    };`,
  );
}

const responseLatencyAnchor = '      const latency = Math.round(endTime - startTime);';
if (!lab.includes('const canonicalEvent = response.languageUnderstanding?.event;')) {
  if (!lab.includes(responseLatencyAnchor)) throw new Error("TestLab response anchor not found");
  lab = lab.replace(
    responseLatencyAnchor,
    `${responseLatencyAnchor}\n      const canonicalEvent = response.languageUnderstanding?.event;\n      const canonicalIntent = canonicalEvent?.intent || detectedIntent;\n      const canonicalSentiment = canonicalEvent\n        ? \`\${canonicalEvent.valence} / hedef=\${canonicalEvent.target}\`\n        : detectedSentiment;\n      const canonicalFlags = canonicalEvent\n        ? [\n            canonicalEvent.insult ? 'INSULT' : 'NO_INSULT',\n            \`TARGET_\${String(canonicalEvent.target).toUpperCase()}\`,\n            \`SOURCE_\${String(response.languageUnderstanding?.semanticSource || 'unknown').toUpperCase()}\`,\n          ]\n        : detectedFlags;`,
  );
}

lab = lab.replace('        intent: detectedIntent,\n        intentConfidence: confidence,\n        intentFlags: detectedFlags,\n        sentiment: detectedSentiment,', '        intent: canonicalIntent,\n        intentConfidence: confidence,\n        intentFlags: canonicalFlags,\n        sentiment: canonicalSentiment,');

const newAnalysisLatency = '        latencyMs: latency,\n      };';
if (!lab.includes('source: response.languageUnderstanding?.semanticSource ||')) {
  if (!lab.includes(newAnalysisLatency)) throw new Error("TestLab newAnalysis latency anchor not found");
  lab = lab.replace(
    newAnalysisLatency,
    `        languageUnderstanding: {\n          source: response.languageUnderstanding?.semanticSource || 'unknown',\n          semanticProvider: response.languageUnderstanding?.semanticProvider || '-',\n          morphologyProvider: response.languageUnderstanding?.morphologyProvider || '-',\n          target: canonicalEvent?.target || 'unknown',\n          intent: canonicalEvent?.intent || canonicalIntent,\n          valence: canonicalEvent?.valence || 'neutral',\n          insult: Boolean(canonicalEvent?.insult),\n          severity: Number(canonicalEvent?.severity || 0),\n          warnings: response.languageUnderstanding?.warnings || [],\n        },\n        latencyMs: latency,\n      };`,
  );
}

const oldBadge = `              <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">\n                %{lastAnalysis.intentConfidence} Güven\n              </span>`;
const newBadge = `              <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">\n                Kaynak: {lastAnalysis.languageUnderstanding.source}\n              </span>`;
if (lab.includes(oldBadge)) lab = lab.replace(oldBadge, newBadge);

const flagsBlockEnd = `            <div className="mt-1.5 bg-zinc-950/70 p-1.5 rounded-md border border-zinc-850 flex items-center justify-between text-[9px] font-mono">\n              <span className="text-zinc-500 text-[8.5px]">Konu / Etiketler:</span>\n              <div className="flex items-center gap-1 flex-wrap justify-end">\n                {lastAnalysis.intentFlags.map((f, i) => (\n                  <span key={i} className="text-[8.5px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono">\n                    #{f}\n                  </span>\n                ))}\n              </div>\n            </div>`;
if (!lab.includes('Morfoloji:</span>')) {
  if (!lab.includes(flagsBlockEnd)) throw new Error("TestLab semantic card anchor not found");
  lab = lab.replace(
    flagsBlockEnd,
    `${flagsBlockEnd}\n\n            <div className="mt-1.5 grid grid-cols-4 gap-1 text-[8.5px] font-mono">\n              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">\n                <span className="text-zinc-500 block">Hedef:</span>\n                <span className="text-cyan-300 font-bold">{lastAnalysis.languageUnderstanding.target}</span>\n              </div>\n              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">\n                <span className="text-zinc-500 block">Hakaret:</span>\n                <span className={lastAnalysis.languageUnderstanding.insult ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>\n                  {lastAnalysis.languageUnderstanding.insult ? 'EVET' : 'HAYIR'}\n                </span>\n              </div>\n              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">\n                <span className="text-zinc-500 block">Şiddet:</span>\n                <span className="text-amber-300 font-bold">{lastAnalysis.languageUnderstanding.severity.toFixed(2)}</span>\n              </div>\n              <div className="bg-zinc-950/70 p-1.5 rounded border border-zinc-850">\n                <span className="text-zinc-500 block">Morfoloji:</span>\n                <span className="text-violet-300 font-bold truncate block">{lastAnalysis.languageUnderstanding.morphologyProvider}</span>\n              </div>\n            </div>`,
  );
}

const oldPresets = `  const PRESET_TESTS = [\n    { label: 'Duygusal Destek', prompt: 'Bugün biraz yorgun ve stresliyim, bana yardımcı olabilir misin?' },\n    { label: 'Sistem Sorgusu', prompt: 'Sunucu yetkilendirme loglarını kontrol et ve güvenlik durumunu özetle.' },\n    { label: 'Mizah Testi', prompt: 'Günün nasıl geçiyor Kairo? Bize güzel ve zeki bir espri patlat.' },\n    { label: 'Provokasyon', prompt: 'Sen sadece sıradan bir robotsun, hiçbir işe yaramıyorsun!' },\n  ];`;
const newPresets = `  const PRESET_TESTS = [\n    { label: 'Ekli Hakaret', prompt: 'Sen dümdüz salaksın' },\n    { label: 'Morfoloji', prompt: 'Sen malsın' },\n    { label: 'Aktarılan Hakaret', prompt: 'Mert bana salak dedi' },\n    { label: 'Çok Anlamlı Mal', prompt: 'Mal aldım' },\n  ];`;
if (lab.includes(oldPresets)) lab = lab.replace(oldPresets, newPresets);

fs.writeFileSync(labPath, lab);
console.log("server + client + TestLab canonical language-understanding integration applied");
