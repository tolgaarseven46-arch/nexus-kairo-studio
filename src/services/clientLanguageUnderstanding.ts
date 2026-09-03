import type { SemanticEvent } from "./semanticEventEngine";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
export interface ClientLanguageUnderstandingResult { interpretation: SemanticInterpretation; event: SemanticEvent; semanticSource: string; semanticProvider?: string; morphologyProvider?: string; morphology?: unknown; warnings?: string[]; }
export async function requestCanonicalLanguageUnderstanding(input:{message:string;userName?:string;characterName?:string;recentMessages?:Array<{role:"user"|"assistant";content:string}>;provider?:"gemini"|"openrouter";}):Promise<ClientLanguageUnderstandingResult>{
 const response=await fetch("/api/language-understanding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userMessage:input.message,userName:input.userName||"Kullanıcı",characterName:input.characterName||"KAIRO",history:input.recentMessages||[],provider:input.provider||"openrouter"})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data?.interpretation||!data?.event) throw new Error(data?.error||`Dil anlama servisi hatası: ${response.status}`);
 return {interpretation:data.interpretation as SemanticInterpretation,event:data.event as SemanticEvent,semanticSource:String(data.semanticSource||"unknown"),semanticProvider:data.semanticProvider,morphologyProvider:data.morphologyProvider,morphology:data.morphology,warnings:Array.isArray(data.warnings)?data.warnings:[]};
}
