export interface NormalizedLanguageInput { raw:string; normalized:string; canonical:string; confidence:number; transformations:string[]; }
const EXACT:Record<string,string>={
  'napyon':'ne yapıyorsun','napiyon':'ne yapıyorsun','napıyon':'ne yapıyorsun','napıyosun':'ne yapıyorsun','napiyosun':'ne yapıyorsun','napıyorsun':'ne yapıyorsun','ne yapıyon':'ne yapıyorsun','ne yapiyon':'ne yapıyorsun',
  'nbr':'naber','naber':'naber','nabersin':'naber','naber kız':'naber','naber kanka':'naber','nasilsin':'nasılsın',
  'slm':'selam','sa':'selam','selamlar':'selam','mrb':'merhaba',
  'sagol':'sağol','saol':'sağol','tsk':'teşekkürler','tşk':'teşekkürler','tesekkurler':'teşekkürler',
  'gorusuruz':'görüşürüz','ii geceler':'iyi geceler','geceler':'iyi geceler'
};
function clean(s:string){return s.toLocaleLowerCase('tr-TR').trim().replace(/[!?.,;:]+/g,'').replace(/\s+/g,' ')}
export function normalizeKairoLanguageInput(raw:string):NormalizedLanguageInput{
 const normalized=clean(raw),transformations:string[]=[];let canonical=EXACT[normalized]??normalized;
 if(canonical!==normalized)transformations.push(`${normalized} -> ${canonical}`);
 if(/^(na+p+y?o+n|nap+y?on)$/.test(canonical)){canonical='ne yapıyorsun';transformations.push('colloquial what_doing')}
 if(/^(n+a+b+e+r+)$/.test(canonical)){canonical='naber';transformations.push('elongated how_are_you')}
 if(/^(s+e+l+a+m+)$/.test(canonical)){canonical='selam';transformations.push('elongated greeting')}
 return{raw,normalized,canonical,confidence:transformations.length?.98:1,transformations};
}
