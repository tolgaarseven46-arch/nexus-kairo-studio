import type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from '../types/nexus';

export interface KairoSpeechIdentity {
  register: 'casual' | 'balanced' | 'firm' | 'hurt';
  sentenceLength: 'very_short' | 'short' | 'medium';
  slangLevel: number;
  humorLevel: number;
  emojiLevel: number;
  warmthLevel: number;
  directness: number;
  instructions: string[];
}

const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)));
export function computeKairoSpeechIdentity(personality:DroitPersonalityTraits, state:DroitDynamicState, trace:ReasoningTrace):KairoSpeechIdentity {
  const rel=state.relationship; const negative=trace.messageInterpretation.sentiment==='negatif'; const hurt=rel?.hurtScore??0; const conflict=rel?.conflictScore??0; const warmth=rel?.warmth??50;
  const humor=clamp(personality.humor-(negative?35:0)-(hurt*.25)); const slang=clamp(35+personality.communication*.25+personality.humor*.2-personality.seriousness*.25); const directness=clamp(45+personality.authority*.3+personality.decisionMaking*.2+(negative?15:0)); const warmthLevel=clamp(warmth+personality.empathy*.2-hurt*.35-conflict*.2);
  const register:KairoSpeechIdentity['register']=hurt>=35?'hurt':negative||conflict>=30?'firm':warmthLevel>=65?'casual':'balanced';
  const sentenceLength=register==='hurt'?'very_short':personality.communication>=70?'short':'medium'; const emojiLevel=register==='firm'||register==='hurt'?0:clamp(humor*.18);
  const instructions=[
    'Bir yapay zeka asistanı gibi değil, tekil ve tutarlı bir kişi gibi konuş.',
    'Kurumsal müşteri hizmetleri dili, yapay nezaket, gereksiz açıklama ve sonuç özeti kullanma.',
    sentenceLength==='very_short'?'Çok kısa konuş; bazen tek cümle veya birkaç kelime yeterli.':sentenceLength==='short'?'Kısa, gündelik cümleler kur; gereksiz ikinci açıklamayı ekleme.':'Doğal sohbet uzunluğunu koru; ders anlatır gibi uzatma.',
    register==='casual'?'Rahat ve samimi konuş; uygun yerde doğal argo kullanabilirsin.':register==='firm'?'Net ve mesafeli konuş; şakaya kaçıp gerilimi yok etme.':register==='hurt'?'Kırgınlığı açıklamak yerine konuşma biçimine yansıt; kısa ve mesafeli ol.':'Rahat ama ölçülü konuş.',
    humor>=65?'Mizah uygunsa kısa ve kendiliğinden olsun; espriyi açıklama.':'Mizahı zorla ekleme.',
    'KDM kararının ne olduğunu kullanıcıya açıklama; sadece o kararın doğal davranışını göster.',
    'Her mesajda selamlama, yardım teklifi veya “nasıl yardımcı olabilirim” kalıbı kullanma.',
    'Aynı cümle kalıplarını sürekli tekrar etme; konuşma ritmini bağlama göre değiştir.'
  ];
  return {register,sentenceLength,slangLevel:slang,humorLevel:humor,emojiLevel,warmthLevel,directness,instructions};
}

export function speechIdentityPrompt(s:KairoSpeechIdentity):string {
  return `=== KONUŞMA KİMLİĞİ KATMANI ===\nKayıt: ${s.register}\nCümle uzunluğu: ${s.sentenceLength}\nArgo doğallığı: %${s.slangLevel}\nMizah: %${s.humorLevel}\nEmoji eğilimi: %${s.emojiLevel}\nSıcaklık: %${s.warmthLevel}\nDoğrudanlık: %${s.directness}\n${s.instructions.map(x=>`- ${x}`).join('\n')}`;
}
