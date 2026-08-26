export interface NormalizedLanguageInput { raw:string; normalized:string; canonical:string; confidence:number; transformations:string[]; }
const EXACT:Record<string,string>={
 'napyon':'ne yapıyorsun','napiyon':'ne yapıyorsun','napıyon':'ne yapıyorsun','napıyosun':'ne yapıyorsun','napiyosun':'ne yapıyorsun','napıyorsun':'ne yapıyorsun','ne yapıyon':'ne yapıyorsun','ne yapiyon':'ne yapıyorsun',
 'nbr':'naber','naber':'naber','nabersin':'naber','naber kız':'naber','naber kanka':'naber','nasilsin':'nasılsın','slm':'selam','sa':'selam','selamlar':'selam','mrb':'merhaba','sagol':'sağol','saol':'sağol','tsk':'teşekkürler','tşk':'teşekkürler','tesekkurler':'teşekkürler','gorusuruz':'görüşürüz','ii geceler':'iyi geceler','geceler':'iyi geceler'};
const CONCEPTS=[
 {canonical:'naber',forms:['naber','nabersin','nbr']},
 {canonical:'nasılsın',forms:['nasılsın','nasilsin']},
 {canonical:'ne yapıyorsun',forms:['napyon','napiyon','napıyon','napıyosun','napiyosun','napıyorsun','ne yapıyon','ne yapıyorsun']},
 {canonical:'selam',forms:['selam','slm','selamlar']},
 {canonical:'merhaba',forms:['merhaba','mrb']},
 {canonical:'sağol',forms:['sağol','sagol','saol']},
 {canonical:'teşekkürler',forms:['teşekkürler','tesekkurler','tsk','tşk']},
 {canonical:'görüşürüz',forms:['görüşürüz','gorusuruz']},
 {canonical:'iyi geceler',forms:['iyi geceler','ii geceler','geceler']}
];
function clean(s:string){return s.toLocaleLowerCase('tr-TR').trim().replace(/[!?.,;:]+/g,'').replace(/\s+/g,' ')}
function stripAddressing(s:string){return s.replace(/\b(kız|kanka|knk|aga|abi|abla|olm|oğlum|lan|la)\b/g,' ').replace(/\s+/g,' ').trim()}
function ascii(s:string){return s.replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')}
function distance(a:string,b:string){a=ascii(a);b=ascii(b);const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)dp[i][0]=i;for(let j=0;j<=b.length;j++)dp[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length]}
function similarity(a:string,b:string){return 1-distance(a,b)/Math.max(a.length,b.length,1)}
export function normalizeKairoLanguageInput(raw:string):NormalizedLanguageInput{
 const normalized=clean(raw),transformations:string[]=[];const core=stripAddressing(normalized);let canonical=EXACT[normalized]??EXACT[core]??core,confidence=canonical!==core?.99:1;if(canonical!==core)transformations.push(`${normalized} -> ${canonical}`);
 if(canonical===core){let best:{canonical:string;score:number;form:string}|null=null;for(const concept of CONCEPTS)for(const form of concept.forms){const score=similarity(core,form);if(!best||score>best.score)best={canonical:concept.canonical,score,form}}const threshold=core.length<=3?.74:core.length<=5?.76:.8;if(best&&best.score>=threshold){canonical=best.canonical;confidence=Number(best.score.toFixed(2));if(canonical!==core)transformations.push(`fuzzy:${core} ~ ${best.form} (${confidence}) -> ${canonical}`)}}
 if(/^(na+p+y?o+n|nap+y?on)$/.test(canonical)){canonical='ne yapıyorsun';confidence=Math.max(confidence,.95);transformations.push('colloquial what_doing')}
 return{raw,normalized,canonical,confidence,transformations};
}
