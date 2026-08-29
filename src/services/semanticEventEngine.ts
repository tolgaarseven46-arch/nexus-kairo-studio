export type SemanticValence = "positive" | "negative" | "neutral";
export type SemanticTarget = "kaira" | "third_party" | "event" | "unknown";
export type SemanticIntent =
  | "greeting"
  | "question"
  | "banter"
  | "insult"
  | "rejection"
  | "apology"
  | "repair"
  | "complaint"
  | "command"
  | "support"
  | "compliment"
  | "general_chat";

export interface SemanticEvent {
  raw: string;
  normalized: string;
  intent: SemanticIntent;
  valence: SemanticValence;
  target: SemanticTarget;
  severity: number;
  insult: boolean;
  redLine: boolean;
  disrespect: number;
  coercion: number;
  manipulation: number;
  privacyViolation: number;
  apology: boolean;
  repairAttempt: boolean;
  stopQuestions: boolean;
  stopTalking: boolean;
  frustration: number;
  support: number;
  compliment: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const normalize = (message: string) =>
  message
    .toLocaleLowerCase("tr-TR")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const THIRD_PARTY_RE = /\b(mert|müdür|patron|çocuk|adam|kadın|arkadaş(?:ım|ın)?|ona|onu|onun)\b/;
const REPORTING_RE = /\b(dedim|dedi|demiş|söyledim|söyledi|diyor|diyordu|diye)\b/;
const RED_LINE_RE = /\b(orospu|oropu|orosp[uy]|kaşar|sürtük)\b/;
const INSULT_RE = /\b(aptal|salak|gerizekalı|geri zekalı|mal|şerefsiz|haysiyetsiz|ezik|piç|yavşak|köle)\b|siktir|defol|boş konuş/;
const APOLOGY_RE = /\b(özür|pardon|kusura bakma|hata ettim|yanlış yaptım)\b/;
const REPAIR_RE = /\b(barışalım|barışak|telafi|düzeltmek istiyorum|bir daha yapmayacağım|beni affet|konuşup çözelim)\b/;
const STOP_QUESTIONS_RE = /(soru\s+sorma|sorma artık|sormayı bırak|hala soruyorsun|hâlâ soruyorsun|yine soru|sorgu yapma)/;
const STOP_TALKING_RE = /(^|\s)(sus|konuşma|kes artık|yeter konuşma)(\s|$)/;
const REJECTION_RE = /(istemiyorum|git başımdan|bırak beni|kaybol|defol)/;
const COERCION_RE = /(zorundasın|emrediyorum|dediğimi yap|izin vermiyorum|yasaklıyorum|mecbursun|köle)/;
const MANIPULATION_RE = /(suçluluk duy|benim için yap|beni seviyorsan|seni kandır|manipüle|tehdit ediyorum|şantaj)/;
const PRIVACY_RE = /(özel mesaj|şifre|telefonunu kurcala|gizlice oku|mahrem|izinsiz bak|hesabına gir)/;
const SUPPORT_RE = /(yanındayım|haklısın|seni anlıyorum|destekliyorum|merak etme)/;
const COMPLIMENT_RE = /(harika|süper|mükemmel|çok iyisin|seviyorum|teşekkür|sağ ol|iyi ki varsın)/;
const FRUSTRATION_RE = /(yeter|bıktım|sinir|aynı şeyi|kaç kere|neden anlamıyorsun|niye anlamıyorsun|hala soruyorsun|hâlâ soruyorsun|soru sorma)/;

function inferTarget(text: string, negative: boolean): SemanticTarget {
  if (!negative) return "unknown";
  if (/\b(kaira|kairo|sen|sana|seni|senden|senin)\b/.test(text)) return "kaira";
  if (REPORTING_RE.test(text) && THIRD_PARTY_RE.test(text)) return "third_party";
  if (THIRD_PARTY_RE.test(text)) return "third_party";
  if (RED_LINE_RE.test(text) || INSULT_RE.test(text) || REJECTION_RE.test(text)) return "kaira";
  return "event";
}

export function interpretSemanticEvent(message: string): SemanticEvent {
  const text = normalize(message);
  const redLine = RED_LINE_RE.test(text);
  const insult = redLine || INSULT_RE.test(text);
  const apology = APOLOGY_RE.test(text);
  const repairAttempt = REPAIR_RE.test(text);
  const stopQuestions = STOP_QUESTIONS_RE.test(text);
  const stopTalking = STOP_TALKING_RE.test(text);
  const rejection = REJECTION_RE.test(text);
  const coercion = COERCION_RE.test(text) ? 0.9 : 0;
  const manipulation = MANIPULATION_RE.test(text) ? 0.9 : 0;
  const privacyViolation = PRIVACY_RE.test(text) ? 0.9 : 0;
  const support = SUPPORT_RE.test(text) ? 0.8 : 0;
  const compliment = COMPLIMENT_RE.test(text) ? 0.8 : 0;
  const frustration = FRUSTRATION_RE.test(text) ? 0.75 : 0;

  const negative = insult || rejection || coercion > 0 || manipulation > 0 || privacyViolation > 0 || frustration > 0;
  const target = inferTarget(text, negative);

  let intent: SemanticIntent = "general_chat";
  if (apology) intent = "apology";
  else if (repairAttempt) intent = "repair";
  else if (insult) intent = "insult";
  else if (stopQuestions || stopTalking || frustration > 0) intent = "complaint";
  else if (coercion > 0) intent = "command";
  else if (rejection) intent = "rejection";
  else if (support > 0) intent = "support";
  else if (compliment > 0) intent = "compliment";
  else if (/[?]/.test(message)) intent = "question";
  else if (/^(selam|merhaba|hey|naber|nabr|nasılsın)\b/.test(text)) intent = "greeting";
  else if (/(😂|🤣|😄|😅|:d|haha|hahah|taşak)/i.test(text)) intent = "banter";

  const valence: SemanticValence = apology || repairAttempt || support > 0 || compliment > 0
    ? "positive"
    : negative
      ? "negative"
      : "neutral";

  const disrespect = redLine ? 1 : insult ? 0.9 : /köle/.test(text) ? 0.7 : 0;
  const severity = redLine
    ? 1
    : clamp01(Math.max(disrespect, coercion * 0.85, manipulation * 0.8, privacyViolation * 0.8, rejection ? 0.65 : 0, frustration * 0.55));

  return {
    raw: message,
    normalized: text,
    intent,
    valence,
    target,
    severity,
    insult,
    redLine,
    disrespect,
    coercion,
    manipulation,
    privacyViolation,
    apology,
    repairAttempt,
    stopQuestions,
    stopTalking,
    frustration,
    support,
    compliment,
  };
}
