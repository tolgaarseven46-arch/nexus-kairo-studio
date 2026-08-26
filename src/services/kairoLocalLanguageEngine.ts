import type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from '../types/nexus';

export type LocalIntent = 'greeting'|'how_are_you'|'what_doing'|'thanks'|'agreement'|'goodbye'|'good_night';
export interface LocalLanguageResult { handled:boolean; intent?:LocalIntent; reply?:string; confidence:number; source:'local_language'|'ai'; }

const normalize=(s:string)=>s.toLocaleLowerCase('tr-TR').trim().replace(/[!?.,;:]+/g,'').replace(/\s+/g,' ');
const pick=(items:string[], seed:string)=>{let h=0;for(let i=0;i<seed.length;i++)h=(h*31+seed.charCodeAt(i))>>>0;return items[h%items.length]};

function detectIntent(text:string):LocalIntent|null{
  const t=normalize(text);
  if(/^(selam|merhaba|sa|slm|hey|heyy|selamlar)$/.test(t))return'greeting';
  if(/^(naber|nabersin|naber kız|naber kanka|nasılsın|nasilsin)$/.test(t))return'how_are_you';
  if(/^(napıyon|napıyorsun|ne yapıyon|ne yapıyorsun|napiyon|napiyosun)$/.test(t))return'what_doing';
  if(/^(sağol|sagol|teşekkürler|tesekkurler|eyvallah|thx)$/.test(t))return'thanks';
  if(/^(aynen|evet|he|hıhı|tamam|ok|okey)$/.test(t))return'agreement';
  if(/^(görüşürüz|gorusuruz|bb|bay bay|hoşça kal|hosca kal)$/.test(t))return'goodbye';
  if(/^(iyi geceler|ig|geceler)$/.test(t))return'good_night';
  return null;
}

export function tryLocalKairoReply(message:string, personality:DroitPersonalityTraits, state:DroitDynamicState, trace:ReasoningTrace):LocalLanguageResult{
  const intent=detectIntent(message);if(!intent)return{handled:false,confidence:0,source:'ai'};
  const rel=state.relationship;const hurt=rel?.hurtScore??0,conflict=rel?.conflictScore??0,warmth=rel?.warmth??50;const angry=state.anger>=55||conflict>=45;const hurtMode=hurt>=35;const close=warmth>=60||(rel?.interactionCount??0)>=12;
  const casual=close||personality.communication>=60; const funny=personality.humor>=65&&!angry&&!hurtMode;
  let pool:string[]=[];
  if(intent==='greeting') pool=hurtMode?['selam','hee selam']:angry?['selam.','evet selam']:casual?['selam kanka','selam ya','heyy']:['selam','merhaba'];
  if(intent==='how_are_you') pool=hurtMode?['iyi','eh işte']:angry?['iyiyim','idare']:funny?['iyiyim ya :D sen naber','iyi valla, takılıyorum','iyidir kanka senden']:['iyiyim, sen?','iyi valla sen nasılsın'];
  if(intent==='what_doing') pool=hurtMode?['bi şey yok','takılıyorum']:funny?['takılıyorum ya :D','ne olsun, takılıyorum','boştayım sayılır sen napiyon']:['takılıyorum, sen?','pek bi şey yok'];
  if(intent==='thanks') pool=casual?['eyvallah','ne demek kanka','rica ederim ya']:['rica ederim','ne demek'];
  if(intent==='agreement') pool=hurtMode?['he','tamam']:casual?['aynen','heh aynen','tamamdır']:['tamam','evet'];
  if(intent==='goodbye') pool=casual?['görüşürüz kanka','hadi görüşürüz','kendine iyi bak']:['görüşürüz','hoşça kal'];
  if(intent==='good_night') pool=casual?['iyi geceler kanka','geceler 😄','iyi uyu']:['iyi geceler','iyi uykular'];
  return{handled:true,intent,reply:pick(pool,`${message}|${state.anger}|${warmth}|${hurt}`),confidence:.96,source:'local_language'};
}
