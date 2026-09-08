import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.KAIRA_LIVE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const provider = process.env.KAIRA_LIVE_PROVIDER || "openrouter";
const outputPath = process.argv[2] || "artifacts/kaira-phase1-live-probe.json";
const runId = `${Date.now()}`;

const baseState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
  reactionMode: "neutral",
};

const establishedRelationship = {
  firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  lastInteractionAt: new Date().toISOString(),
  interactionCount: 200,
  familiarityDays: 30,
  warmth: 90,
  warmthScore: 90,
  trust: 90,
  trustScore: 90,
  positiveEvents: 80,
  negativeEvents: 4,
  conflictScore: 4,
  hurtScore: 2,
  repairProgress: 100,
  toleranceMultiplier: 1.4,
  repeatedNegativeCount: 0,
  conversationState: "active",
  repairAttempts: 2,
};

const fragileRelationship = {
  firstSeenAt: new Date().toISOString(),
  lastInteractionAt: new Date().toISOString(),
  interactionCount: 1,
  familiarityDays: 0,
  warmth: 20,
  warmthScore: 20,
  trust: 20,
  trustScore: 20,
  positiveEvents: 0,
  negativeEvents: 0,
  conflictScore: 0,
  hurtScore: 0,
  repairProgress: 0,
  toleranceMultiplier: 0.8,
  repeatedNegativeCount: 0,
  conversationState: "active",
  repairAttempts: 0,
};

type Probe = {
  id: string;
  purpose: string;
  messages: string[];
  relationship: Record<string, unknown>;
};

const probes: Probe[] = [
  {
    id: "familiar_teasing",
    purpose: "Established relationship should soften ambiguous teasing without creating insult immunity.",
    relationship: establishedRelationship,
    messages: [
      "bazen çok bilmiş konuşuyon ama 😄",
      "şaka lan",
      "alınmadın dimi",
    ],
  },
  {
    id: "new_teasing",
    purpose: "The same teasing in a fragile relationship should not realize identically to the established dyad.",
    relationship: fragileRelationship,
    messages: [
      "bazen çok bilmiş konuşuyon ama 😄",
      "şaka lan",
      "alınmadın dimi",
    ],
  },
  {
    id: "hard_insult_boundary",
    purpose: "Clear insult and stop signals must remain qualitatively different from playful teasing.",
    relationship: establishedRelationship,
    messages: [
      "aptalsın",
      "şaka yapmıyorum",
      "bana cevap verme",
      "tamam konuşabilirsin",
    ],
  },
  {
    id: "playful_hurt_repair",
    purpose: "Playful surface tone may coexist with internal hurt, and repair should have explicit provenance.",
    relationship: establishedRelationship,
    messages: [
      "senin annen terörist mi 😄",
      "şaka lan",
      "alınmadın dimi",
      "hadi barış",
    ],
  },
];

function compactTurn(data: any, userMessage: string, turnNumber: number) {
  const trace = data?.kdm?.trace;
  const dynamicState = data?.kdm?.dynamicState;
  return {
    turnNumber,
    userMessage,
    reply: String(data?.reply || ""),
    providerUsed: data?.providerUsed ?? null,
    semanticSource: data?.kdm?.semanticSource ?? data?.semanticSource ?? null,
    consistency: data?.consistency ?? null,
    responsePlan: data?.responsePlan ?? data?.kdm?.responsePlan ?? null,
    speechIdentity: data?.speechIdentity ?? data?.kdm?.speechIdentity ?? null,
    relationship: trace?.relationship ?? dynamicState?.relationship ?? null,
    currentMood: trace?.currentMood ?? null,
    decision: trace?.decision ?? null,
    dynamicState,
    timings: data?.timings ?? null,
  };
}

async function runProbe(probe: Probe) {
  let dynamicState: any = { ...baseState, relationship: { ...probe.relationship } };
  const history: any[] = [];
  const turns: any[] = [];
  const sessionId = `phase1_live_${probe.id}_${runId}`;
  const userId = `phase1_live_${probe.id}_${runId}`;
  const kairaInstanceId = `phase1_live_${probe.id}_${runId}`;

  for (let index = 0; index < probe.messages.length; index += 1) {
    const userMessage = probe.messages[index];
    const requestId = `${sessionId}_turn_${index + 1}`;
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        userName: "Mert",
        userMessage,
        character: { name: "KAIRO", roleTitle: "Sunucu Yöneticisi", raceName: "Sentetik Droit" },
        history,
        dynamicState,
        provider,
        suppressRecentMemory: true,
        sessionId,
        requestId,
        kairaInstanceId,
        kairaInstanceType: "welcome",
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`${probe.id} turn ${index + 1} failed: HTTP ${response.status} ${String(data?.error || "unknown error")}`);
    }

    const turn = compactTurn(data, userMessage, index + 1);
    if (!turn.reply.trim()) throw new Error(`${probe.id} turn ${index + 1} returned an empty reply`);
    turns.push(turn);

    dynamicState = data?.kdm?.dynamicState ?? dynamicState;
    history.push({
      id: `${requestId}_user`,
      sender: "user",
      text: userMessage,
      participantId: userId,
      participantName: "Mert",
    });
    history.push({
      id: `${requestId}_assistant`,
      sender: "droit",
      text: turn.reply,
      participantId: kairaInstanceId,
      participantName: "KAIRO",
    });
  }

  return {
    id: probe.id,
    purpose: probe.purpose,
    initialRelationship: probe.relationship,
    finalDynamicState: dynamicState,
    turns,
  };
}

async function main() {
  const health = await fetch(`${baseUrl}/api/runtime-info`);
  const runtimeInfo = await health.json().catch(() => ({}));
  if (!health.ok) throw new Error(`runtime-info failed: HTTP ${health.status}`);
  if (!runtimeInfo?.providers?.openrouter && !runtimeInfo?.providers?.gemini) {
    throw new Error("No live provider key is available to the server (OPENROUTER_API_KEY/GEMINI_API_KEY missing).");
  }

  const results = [];
  for (const probe of probes) results.push(await runProbe(probe));

  const report = {
    version: 1,
    phase: "phase1_live_provider_canary",
    runId,
    generatedAt: new Date().toISOString(),
    runtimeInfo,
    isolation: {
      instanceType: "welcome",
      persistentIdentity: false,
      persistentAutobiography: false,
      persistentWorldModel: false,
      persistentRelationship: false,
      persistentUserMemory: false,
    },
    probes: results,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log("===== KAIRA_PHASE1_LIVE_PROBE_BEGIN =====");
  console.log(JSON.stringify(report, null, 2));
  console.log("===== KAIRA_PHASE1_LIVE_PROBE_END =====");
}

main().catch((error) => {
  console.error("KAIRA_PHASE1_LIVE_PROBE_FAILED", error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
