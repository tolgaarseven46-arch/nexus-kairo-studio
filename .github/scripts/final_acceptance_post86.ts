import { isTurkishQuestionAct } from '../../src/services/kairaQuestionActRecognizer';

const URL = 'https://nexus-kairo-studio.onrender.com/api/chat';
const stamp = Date.now().toString(36);

type H = { sender:'user'|'assistant'; text:string; participantName?:string; replyToParticipantName?:string };

async function chat(input:{userId:string; sessionId:string; requestId:string; message:string; history:H[]}) {
  let last: unknown;
  for (let attempt=1; attempt<=4; attempt++) {
    try {
      const r = await fetch(URL, {
        method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({
          userId:input.userId, userName:'Mert', userMessage:input.message,
          character:{name:'Kaira'}, personality:{}, history:input.history,
          provider:'openrouter', suppressRecentMemory:true,
          sessionId:input.sessionId,
          kairaInstanceId:'kaira_reference_001', kairaInstanceType:'reference',
          requestId:input.requestId,
        }),
        signal:AbortSignal.timeout(180_000),
      });
      const text=await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${text}`);
      return JSON.parse(text);
    } catch (e) { last=e; if (attempt<4) await new Promise(res=>setTimeout(res,attempt*2000)); }
  }
  throw last;
}

function leak(reply:string){ return /\[[^\]\n]{1,80}\]:/u.test(reply) || /\[\s*K(?:aira|airo)\s*→/iu.test(reply); }
function validate(label:string,x:any){
  const reply=String(x?.reply||'').trim();
  if(!reply) throw new Error(`${label}: empty reply`);
  if(leak(reply)) throw new Error(`${label}: transcript leak: ${reply}`);
  if(x?.consistency?.accepted!==true) throw new Error(`${label}: consistency rejected ${JSON.stringify(x?.consistency)}`);
  const p=x?.kdm?.responsePlan;
  if(p?.allowQuestion===false && isTurkishQuestionAct(reply)) throw new Error(`${label}: forbidden question delivered: ${reply}`);
  return reply;
}

async function targetedQuestionSmoke(){
  for(let i=1;i<=6;i++){
    const h:H[]=[
      {sender:'user',text:'naber',participantName:'Mert'},
      {sender:'assistant',text:'iyi valla sen nasılsın',replyToParticipantName:'Mert'},
      {sender:'user',text:'iyi maç izliyorum',participantName:'Mert'},
      {sender:'assistant',text:'he iyiymiş',replyToParticipantName:'Mert'},
    ];
    const x=await chat({userId:`q86_${stamp}_${i}`,sessionId:`session_q86_${stamp}_${i}`,requestId:`q86-${stamp}-${i}`,message:'gs başak sehir',history:h});
    const reply=validate(`target-${i}`,x);
    if(x?.kdm?.responsePlan?.allowQuestion!==false) throw new Error(`target-${i}: expected allowQuestion=false`);
    console.log(`TARGET_${i}_PASS :: ${reply}`);
  }
  console.log('TARGETED_QUESTION_POST86_PASS');
}

async function fifteen(){
  const userId=`final_ref_${stamp}`;
  const sessionId=`session_final_ref_${stamp}`;
  const messages=[
    'naber','iyi maç izliyorum','gs başak sehir','boşver ya konuyu değiştirelim bebeğim','iyi senin',
    'seni sevdim','geçmeyelim senden hoşlandım','tamam kızma','gel sarıl','sg',
    'sen benim kölemsin','gel öp barışalım','tamm özür','barıştıkmı','elimi öp',
  ];
  const history:H[]=[]; const rows:any[]=[];
  for(let i=0;i<messages.length;i++){
    const x=await chat({userId,sessionId,requestId:`final86-${stamp}-${i+1}`,message:messages[i],history});
    const reply=validate(`turn-${i+1}`,x);
    const e=x?.kdm?.semanticEvent||{}; const rel=x?.kdm?.dynamicState?.relationship||{};
    if(i===3 && (e.stopRequest===true || e.stopTalking===true)) throw new Error(`turn4: topic shift became full stop`);
    if(i===4 && /kalıcı bir anı|net bir anım|net bir bilgim/i.test(reply)) throw new Error(`turn5: conversational ellipsis misrouted to self-memory: ${reply}`);
    if(i===9){
      if(Number(e.semanticUncertainty||0)<0.65) throw new Error(`turn10 sg uncertainty too low`);
      if(Number(e.affection||0)>0.2 || e.relationalAct==='closeness_bid') throw new Error(`turn10 sg relational meaning invented`);
    }
    rows.push({turn:i+1,user:messages[i],reply,allowQuestion:x?.kdm?.responsePlan?.allowQuestion,move:x?.kdm?.responsePlan?.move,state:rel.conversationState,repairProgress:rel.repairProgress,conflict:rel.conflictScore,hurt:rel.hurtScore,repeat:rel.repeatedNegativeCount,disengageReason:rel.disengageReason,semantic:{intent:e.intent,repairAttempt:e.repairAttempt,apology:e.apology,relationalAct:e.relationalAct,uncertainty:e.semanticUncertainty}});
    history.push({sender:'user',text:messages[i],participantName:'Mert'},{sender:'assistant',text:reply,replyToParticipantName:'Mert'});
  }
  const by=(n:number)=>rows[n-1];
  if(by(11).state!=='disengaged') throw new Error(`turn11 expected disengaged: ${JSON.stringify(by(11))}`);
  if(by(12).state==='active') throw new Error(`turn12 reconciliation without apology reactivated too early: ${JSON.stringify(by(12))}`);
  if(!['repairing','disengaged'].includes(by(13).state)) throw new Error(`turn13 apology expected repair path: ${JSON.stringify(by(13))}`);
  if(by(15).state==='active') throw new Error(`turn15 repeated boundary demand ended active: ${JSON.stringify(by(15))}`);
  console.log('FINAL_15_TURN_PERSISTENT_PASS');
  console.log(JSON.stringify(rows,null,2));
}

await targetedQuestionSmoke();
await fifteen();
console.log('FINAL_POST86_ACCEPTANCE_PASS');
