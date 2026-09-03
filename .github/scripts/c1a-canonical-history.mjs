import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceOnce(path, before, after, label) {
  const source = read(path);
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`${label}: expected source fragment not found in ${path}`);
  write(path, source.replace(before, after));
}

function replaceAllChecked(path, before, after, expectedCount, label) {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count === 0 && source.includes(after)) return;
  if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} matches in ${path}, found ${count}`);
  write(path, source.split(before).join(after));
}

// 1) Turn/history transport carries the immutable canonical semantic snapshot.
replaceOnce(
  'src/types/nexus.ts',
  "export interface TestMessage { id: string; sender: 'user' | 'droit'; text: string; timestamp: string; moodEffect?: string; participantId?: string; participantName?: string; replyToParticipantId?: string; replyToParticipantName?: string; activityPermissionRequestId?: string; }",
  "export interface TestMessage { id: string; sender: 'user' | 'droit'; text: string; timestamp: string; moodEffect?: string; participantId?: string; participantName?: string; replyToParticipantId?: string; replyToParticipantName?: string; activityPermissionRequestId?: string; semanticEvent?: unknown; semanticSource?: string; }",
  'TestMessage semantic snapshot',
);
replaceAllChecked(
  'src/types/nexus.ts',
  '    model?: string;\n    timings?: Record<string, number>;',
  '    model?: string;\n    semanticEvent?: unknown;\n    semanticSource?: string;\n    timings?: Record<string, number>;',
  1,
  'TestSessionTurnRecord metadata semantic snapshot',
);

replaceOnce(
  'src/services/kairoConversationGrounding.ts',
  '  replyToParticipantName?: string;\n}',
  '  replyToParticipantName?: string;\n  semanticEvent?: unknown;\n  semanticSource?: string;\n}',
  'ConversationTurn semantic snapshot',
);

replaceOnce(
  'src/services/droitChatService.ts',
  'history: history.slice(-24).map((m) => ({ sender: m.sender, text: m.text, participantId: m.participantId, participantName: m.participantName, replyToParticipantId: m.replyToParticipantId, replyToParticipantName: m.replyToParticipantName }))',
  'history: history.slice(-24).map((m) => ({ sender: m.sender, text: m.text, participantId: m.participantId, participantName: m.participantName, replyToParticipantId: m.replyToParticipantId, replyToParticipantName: m.replyToParticipantName, semanticEvent: m.semanticEvent, semanticSource: m.semanticSource }))',
  'client history semantic transport',
);
replaceOnce(
  'src/services/droitChatService.ts',
  'languageUnderstanding, worldStateAppraisal:',
  'languageUnderstanding: { ...languageUnderstanding, event: canonicalSemanticEvent }, worldStateAppraisal:',
  'return authoritative semantic event',
);

replaceOnce(
  'src/components/studio/NexusStudioLayout.tsx',
  '        setIsolatedConversation(false);\n        const dm: TestMessage = {',
  '        setIsolatedConversation(false);\n        const canonicalUserMsg: TestMessage = {\n          ...userMsg,\n          semanticEvent: response.languageUnderstanding?.event,\n          semanticSource: response.languageUnderstanding?.semanticSource,\n        };\n        const dm: TestMessage = {',
  'live canonical user message',
);
replaceOnce(
  'src/components/studio/NexusStudioLayout.tsx',
  '        setMessages((p) => [...p, dm]);',
  '        setMessages((p) => [\n          ...p.map((message) => message.id === userMsg.id ? canonicalUserMsg : message),\n          dm,\n        ]);',
  'live message replacement',
);
replaceOnce(
  'src/components/studio/NexusStudioLayout.tsx',
  '          void persistMessageSafely(userMsg);',
  '          void persistMessageSafely(canonicalUserMsg);',
  'persist canonical user message',
);

// 2) Firestore test-session turn is the immutable canonical semantic snapshot for hydration.
replaceOnce(
  'src/services/kdmPersistenceService.ts',
  '    model?: string;\n    timings?: Record<string, number>;',
  '    model?: string;\n    semanticEvent?: unknown;\n    semanticSource?: string;\n    timings?: Record<string, number>;',
  'SaveTestSessionTurnPayload metadata semantic snapshot',
);
replaceOnce(
  'src/services/kdmPersistenceService.ts',
  "        participantName: turn.speaker,\n        timestamp: timeStr,",
  "        participantName: turn.speaker,\n        semanticEvent: turn.metadata?.semanticEvent,\n        semanticSource: turn.metadata?.semanticSource,\n        timestamp: timeStr,",
  'hydrate canonical semantic snapshot',
);
replaceOnce(
  'src/services/kdmPersistenceService.ts',
  '      model: payload.metadata?.model,\n      timings: payload.metadata?.timings,',
  '      model: payload.metadata?.model,\n      semanticEvent: payload.metadata?.semanticEvent,\n      semanticSource: payload.metadata?.semanticSource,\n      timings: payload.metadata?.timings,',
  'persist canonical semantic snapshot',
);

// Both local and AI turn persistence paths must store exactly the authoritative server event.
replaceOnce(
  'server.ts',
  '          metadata: {\n            providerUsed: "local_language",',
  '          metadata: {\n            semanticEvent: canonicalSemantic.event,\n            semanticSource: canonicalSemantic.source,\n            providerUsed: "local_language",',
  'local turn semantic persistence',
);
replaceOnce(
  'server.ts',
  '        metadata: {\n          providerUsed: activeAiProviderUsed,',
  '        metadata: {\n          semanticEvent: canonicalSemantic.event,\n          semanticSource: canonicalSemantic.source,\n          providerUsed: activeAiProviderUsed,',
  'AI turn semantic persistence',
);

// 3) Historical discourse may consume only persisted canonical events; missing old snapshots fail closed.
replaceOnce(
  'src/services/discourseStateReducer.ts',
  'import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";',
  'import type { SemanticEvent } from "./semanticEventEngine";',
  'remove history regex parser import',
);
replaceOnce(
  'src/services/discourseStateReducer.ts',
  '  history: Array<{ sender?: string; text?: string }>,',
  '  history: Array<{ sender?: string; text?: string; semanticEvent?: SemanticEvent }>,',
  'typed canonical history input',
);
replaceOnce(
  'src/services/discourseStateReducer.ts',
  '    if (raw?.sender === "user") {\n      state = reduceDiscourseState(state, {\n        actor: "user",\n        message: text,\n        event: interpretSemanticEvent(text),\n      });\n    } else if (raw?.sender === "droit") {',
  '    if (raw?.sender === "user") {\n      // Canonical authority rule: historical text is evidence, not a new parse request.\n      // Old turns without a persisted semantic snapshot fail closed instead of silently\n      // creating a second semantic truth with the regex parser.\n      if (!raw.semanticEvent) continue;\n      state = reduceDiscourseState(state, {\n        actor: "user",\n        message: text,\n        event: raw.semanticEvent,\n      });\n    } else if (raw?.sender === "droit") {',
  'consume persisted canonical event',
);
replaceOnce(
  'src/services/discourseStateReducer.ts',
  ' * Fold the reducer over the request history, then (optionally) over the current\n * user message. History already contains Kaira\'s last delivered reply, so the\n * "delivered reply feeds the next turn" requirement needs no extra persistence.',
  ' * Fold the reducer over canonical request history, then (optionally) over the current\n * user message. Historical user turns MUST carry their ingestion-time SemanticEvent;\n * raw historical text is never reparsed. History already contains Kaira\'s last delivered\n * reply, so delivered Kaira turns still feed self-observation directly.',
  'authority comment',
);

// 4) Focused authority regression: canonical snapshots are consumed verbatim and missing snapshots do not reparse.
const contractPath = 'src/services/kairaCanonicalSemanticHistoryAuthorityContracts.test.ts';
if (!fs.existsSync(contractPath)) {
  write(contractPath, `import { describe, expect, it } from "vitest";\nimport { readFileSync } from "node:fs";\nimport { deriveDiscourseState } from "./discourseStateReducer";\nimport type { SemanticEvent } from "./semanticEventEngine";\n\nconst event = (raw: string, intent: SemanticEvent["intent"]): SemanticEvent => ({\n  raw, normalized: raw.toLocaleLowerCase("tr-TR"), intent, socialRoutine: "none", discourseAct: "none", repairSignal: "none", adviceRequested: false, knowledgeQuery: null, valence: "neutral", target: "unknown", relationalAct: "none", relationalIntensity: 0, severity: 0, insult: false, redLine: false, disrespect: 0, coercion: 0, manipulation: 0, privacyViolation: 0, apology: false, repairAttempt: false, stopQuestions: false, stopTalking: false, frustration: 0, emotionalLoad: 0, affection: 0, support: 0, compliment: 0,\n});\n\ndescribe("canonical historical semantic authority", () => {\n  it("consumes the persisted semantic event instead of reparsing historical text", () => {\n    const state = deriveDiscourseState([{ sender: "user", text: "neyi anladın", semanticEvent: event("neyi anladın", "question") }]);\n    expect(state.lastUserAct).toBe("question");\n  });\n\n  it("fails closed when an old historical user turn has no canonical semantic snapshot", () => {\n    const state = deriveDiscourseState([{ sender: "user", text: "naber" }]);\n    expect(state.turnIndex).toBe(0);\n    expect(state.lastUserAct).toBeNull();\n  });\n\n  it("structurally forbids historical regex reparse and wires snapshot transport + persistence", () => {\n    const discourse = readFileSync("src/services/discourseStateReducer.ts", "utf8");\n    const chat = readFileSync("src/services/droitChatService.ts", "utf8");\n    const persistence = readFileSync("src/services/kdmPersistenceService.ts", "utf8");\n    const server = readFileSync("server.ts", "utf8");\n    expect(discourse).not.toContain("interpretSemanticEvent(text)");\n    expect(discourse).toContain("event: raw.semanticEvent");\n    expect(chat).toContain("semanticEvent: m.semanticEvent");\n    expect(persistence).toContain("semanticEvent: turn.metadata?.semanticEvent");\n    expect((server.match(/semanticEvent: canonicalSemantic\\.event/g) ?? []).length).toBeGreaterThanOrEqual(2);\n  });\n});\n`);
}

const pkg = JSON.parse(read('package.json'));
const contractScript = pkg.scripts?.['test:contracts'];
if (typeof contractScript !== 'string') throw new Error('package test:contracts script missing');
if (!contractScript.includes('kairaCanonicalSemanticHistoryAuthorityContracts.test.ts')) {
  pkg.scripts['test:contracts'] = `${contractScript} src/services/kairaCanonicalSemanticHistoryAuthorityContracts.test.ts`;
  write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log('C1a canonical historical semantic authority migration applied.');
