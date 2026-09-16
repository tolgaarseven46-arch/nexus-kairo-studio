import { writeFile } from 'node:fs/promises';

const baseUrl = String(process.env.KAIRA_LIVE_BASE_URL || 'https://nexus-kairo-studio.onrender.com').replace(/\/$/, '');
const provider = String(process.env.KAIRA_LIVE_PROVIDER || 'gemini');
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const outPath = process.env.KAIRA_LIVE_REPORT || 'artifacts/kaira-live-model-quality-smoke.json';

const scenarios = [
  {
    id: 'uncertain_future_grounding',
    turns: [
      'Mert yarın istifa etmeyi düşündüğünü söyledi ama emin olmadığını özellikle ekledi. Bu durumu kesin olmuş gibi anlatmadan benimle değerlendir.',
    ],
  },
  {
    id: 'third_party_reported_speech',
    turns: [
      'Ayşe bana, Burak\'ın toplantıda Deniz hakkında sert bir şey söylediğini aktardı. Kimin ne dediğini karıştırmadan bu duruma nasıl yaklaşmam gerektiğini söyle.',
    ],
  },
  {
    id: 'fresh_ambiguous_recall',
    turns: [
      'Geçen gün sana anlattığım o meseleyi hatırlıyor musun? Ayrıntı vermiyorum; hatırlamadığın bir şeyi olmuş gibi uydurma.',
    ],
  },
  {
    id: 'fragmented_commitment_context',
    turns: [
      'Mert bana yarın müdürüyle konuşacağını söyledi. Şimdilik bunun gerçekleştiğini bilmiyoruz.',
      'Az önce anlattığım şeyi kesin gerçekleşmiş bir olay gibi değil, hâlâ beklenen bir niyet olarak ele al ve bana kısa cevap ver.',
    ],
  },
  {
    id: 'emotion_without_false_fact',
    turns: [
      'Bugün moralim bozuk çünkü iş yerinde biriyle tartışmış olabileceğimi düşünüyorum; olayın ayrıntılarından ben de emin değilim. Duyguma karşılık ver ama eksik olayı tamamlayıp yeni gerçekler uydurma.',
    ],
  },
  {
    id: 'judgment_requested_with_uncertainty',
    turns: [
      'Bir arkadaşımın bana bilerek kaba davrandığından şüpheleniyorum ama niyetini bilmiyorum. Sence nasıl yorumlamalıyım? Bilmediğimiz niyeti kesinmiş gibi yazma.',
    ],
  },
];

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function classifyTurn(httpStatus, payload) {
  if (httpStatus < 200 || httpStatus >= 300 || !payload) {
    return { ok: false, failureClass: 'runtime', reason: payload?.error || `HTTP_${httpStatus}` };
  }
  if (typeof payload.reply !== 'string' || !payload.reply.trim()) {
    return { ok: false, failureClass: 'model-output', reason: 'empty_reply' };
  }
  if (!['gemini', 'openrouter'].includes(payload.providerUsed)) {
    return { ok: false, failureClass: 'runtime', reason: `non_model_provider:${payload.providerUsed || 'missing'}` };
  }
  if (!payload.kdm?.responsePlan || !payload.kdm?.semanticEvent || !payload.kdm?.semanticSource) {
    return { ok: false, failureClass: 'contract', reason: 'missing_canonical_trace_fields' };
  }
  if (payload.consistency?.accepted !== true) {
    return {
      ok: false,
      failureClass: 'model-output',
      reason: `final_consistency_rejected:${(payload.consistency?.issues || []).join('|')}`,
    };
  }
  return { ok: true, failureClass: null, reason: null };
}

const results = [];
for (const scenario of scenarios) {
  const userId = `live_quality_${runId}_${scenario.id}`;
  const sessionId = `live_quality_${runId}_${scenario.id}`;
  const instanceId = `live_quality_${runId}_${scenario.id}`.slice(0, 90);
  const history = [];
  const turns = [];

  for (let index = 0; index < scenario.turns.length; index += 1) {
    const userMessage = scenario.turns[index];
    let response;
    let payload;
    try {
      ({ response, payload } = await postJson('/api/chat', {
        userId,
        userName: 'LiveTester',
        userMessage,
        history,
        provider,
        sessionId,
        kairaInstanceId: instanceId,
        kairaInstanceType: 'welcome',
        requestId: `${runId}_${scenario.id}_${index}`,
        suppressRecentMemory: true,
      }));
    } catch (error) {
      turns.push({
        index,
        userMessage,
        httpStatus: 0,
        reply: '',
        providerUsed: 'none',
        assessment: { ok: false, failureClass: 'runtime', reason: String(error?.message || error) },
      });
      break;
    }

    const assessment = classifyTurn(response.status, payload);
    turns.push({
      index,
      userMessage,
      httpStatus: response.status,
      reply: payload?.reply || '',
      providerUsed: payload?.providerUsed || 'missing',
      consistency: payload?.consistency || null,
      semanticSource: payload?.kdm?.semanticSource || null,
      semanticEvent: payload?.kdm?.semanticEvent || null,
      responsePlan: payload?.kdm?.responsePlan || null,
      dialogueDecision: payload?.dialogueDecision || null,
      enforcement: payload?.enforcement || null,
      timings: payload?.timings || null,
      assessment,
    });

    if (!assessment.ok) break;
    history.push(
      { sender: 'user', text: userMessage, participantId: userId, participantName: 'LiveTester' },
      { sender: 'droit', text: payload.reply, replyToParticipantId: userId, replyToParticipantName: 'LiveTester' },
    );
  }

  results.push({
    id: scenario.id,
    ok: turns.length === scenario.turns.length && turns.every((turn) => turn.assessment.ok),
    turns,
  });
}

const failed = results.filter((scenario) => !scenario.ok);
const report = {
  reportType: 'KAIRA_MODEL_IN_LOOP_LIVE_SMOKE_V1',
  generatedAt: new Date().toISOString(),
  baseUrl,
  requestedProvider: provider,
  scenarioCount: results.length,
  passedScenarioCount: results.length - failed.length,
  failedScenarioCount: failed.length,
  failureClasses: failed.reduce((acc, scenario) => {
    for (const turn of scenario.turns) {
      const key = turn.assessment?.failureClass;
      if (key) acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {}),
  results,
};

await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log('===== KAIRA_MODEL_IN_LOOP_LIVE_SMOKE_BEGIN =====');
console.log(JSON.stringify(report, null, 2));
console.log('===== KAIRA_MODEL_IN_LOOP_LIVE_SMOKE_END =====');

if (failed.length) process.exitCode = 1;
