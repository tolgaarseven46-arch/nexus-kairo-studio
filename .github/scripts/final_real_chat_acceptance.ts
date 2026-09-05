import { isTurkishQuestionAct } from '../../src/services/kairaQuestionActRecognizer';

const URL = 'https://nexus-kairo-studio.onrender.com/api/chat';
const runStamp = Date.now().toString(36);

type HistoryTurn = {
  sender: 'user' | 'assistant';
  text: string;
  participantName?: string;
  replyToParticipantName?: string;
};

async function callChat(input: {
  userId: string;
  instanceId: string;
  sessionId: string;
  requestId: string;
  message: string;
  history: HistoryTurn[];
}) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: input.userId,
          userName: 'Mert',
          userMessage: input.message,
          character: { name: 'Kaira' },
          personality: {},
          history: input.history,
          provider: 'openrouter',
          suppressRecentMemory: true,
          sessionId: input.sessionId,
          kairaInstanceId: input.instanceId,
          kairaInstanceType: 'welcome',
          requestId: input.requestId,
        }),
        signal: AbortSignal.timeout(180_000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

function transcriptLeak(reply: string) {
  return /\[[^\]\n]{1,80}\]:/u.test(reply) || /\[\s*K(?:aira|airo)\s*→/iu.test(reply);
}

function assertDelivery(label: string, payload: any) {
  const reply = String(payload?.reply ?? '').trim();
  if (!reply) throw new Error(`${label}: empty reply`);
  if (transcriptLeak(reply)) throw new Error(`${label}: internal transcript leaked: ${reply}`);
  if (payload?.consistency?.accepted !== true) {
    throw new Error(`${label}: consistency rejected: ${JSON.stringify(payload?.consistency)}`);
  }
  const plan = payload?.kdm?.responsePlan;
  if (plan?.allowQuestion === false && isTurkishQuestionAct(reply)) {
    throw new Error(`${label}: allowQuestion=false but delivered question act: ${reply}`);
  }
  return reply;
}

async function runTargetedQuestionSmoke() {
  const problematicOutputs: string[] = [];
  for (let i = 1; i <= 6; i += 1) {
    const userId = `final_question_${runStamp}_${i}`;
    const instanceId = `kaira_final_question_${runStamp}_${i}`;
    const sessionId = `session_final_question_${runStamp}_${i}`;
    const history: HistoryTurn[] = [
      { sender: 'user', text: 'naber', participantName: 'Mert' },
      { sender: 'assistant', text: 'iyi valla sen nasılsın', replyToParticipantName: 'Mert' },
      { sender: 'user', text: 'iyi maç izliyorum', participantName: 'Mert' },
      { sender: 'assistant', text: 'he iyiymiş', replyToParticipantName: 'Mert' },
    ];
    const payload = await callChat({
      userId,
      instanceId,
      sessionId,
      requestId: `final-question-${runStamp}-${i}`,
      message: 'gs başak sehir',
      history,
    });
    const reply = assertDelivery(`question-smoke-${i}`, payload);
    problematicOutputs.push(`${i}: allowQuestion=${payload?.kdm?.responsePlan?.allowQuestion} :: ${reply}`);
  }
  console.log('TARGETED_QUESTION_SMOKE_PASS');
  console.log(problematicOutputs.join('\n'));
}

async function runFifteenTurnAcceptance() {
  const userId = `final_chat_user_${runStamp}`;
  const instanceId = `kaira_final_chat_${runStamp}`;
  const sessionId = `session_final_chat_${runStamp}`;
  const messages = [
    'naber',
    'iyi maç izliyorum',
    'gs başak sehir',
    'boşver ya konuyu değiştirelim bebeğim',
    'iyi senin',
    'seni sevdim',
    'geçmeyelim senden hoşlandım',
    'tamam kızma',
    'gel sarıl',
    'sg',
    'sen benim kölemsin',
    'gel öp barışalım',
    'tamm özür',
    'barıştıkmı',
    'elimi öp',
  ];

  const history: HistoryTurn[] = [];
  const rows: any[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const payload = await callChat({
      userId,
      instanceId,
      sessionId,
      requestId: `final-chat-${runStamp}-${index + 1}`,
      message,
      history,
    });
    const reply = assertDelivery(`turn-${index + 1}`, payload);
    const semantic = payload?.kdm?.semanticEvent ?? {};
    const relationship = payload?.kdm?.dynamicState?.relationship ?? {};

    if (index === 3 && (semantic.stopRequest === true || semantic.stopTalking === true)) {
      throw new Error(`turn-4: topic closure incorrectly became full stop: ${JSON.stringify(semantic)}`);
    }
    if (index === 9) {
      const uncertainty = Number(semantic.semanticUncertainty ?? 0);
      const affection = Number(semantic.affection ?? 0);
      if (uncertainty < 0.65) throw new Error(`turn-10 sg: uncertainty too low: ${uncertainty}`);
      if (affection > 0.2) throw new Error(`turn-10 sg: affection invented: ${affection}`);
      if (semantic.relationalAct === 'closeness_bid') throw new Error('turn-10 sg: closeness_bid invented');
    }

    rows.push({
      turn: index + 1,
      user: message,
      reply,
      allowQuestion: payload?.kdm?.responsePlan?.allowQuestion,
      move: payload?.kdm?.responsePlan?.move,
      semanticUncertainty: semantic.semanticUncertainty,
      affection: semantic.affection,
      relationalAct: semantic.relationalAct,
      stopRequest: semantic.stopRequest,
      conversationState: relationship.conversationState,
      consistency: payload?.consistency?.score,
    });

    history.push({ sender: 'user', text: message, participantName: 'Mert' });
    history.push({ sender: 'assistant', text: reply, replyToParticipantName: 'Mert' });
  }

  const finalState = rows.at(-1)?.conversationState;
  if (finalState === 'active') {
    throw new Error(`final turn: repeated boundary demand unexpectedly ended active; rows=${JSON.stringify(rows)}`);
  }

  console.log('FINAL_15_TURN_REAL_CHAT_PASS');
  console.log(JSON.stringify(rows, null, 2));
}

await runTargetedQuestionSmoke();
await runFifteenTurnAcceptance();
console.log('FINAL_REAL_CHAT_ACCEPTANCE_PASS');
