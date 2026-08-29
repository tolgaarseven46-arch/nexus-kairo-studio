export type SemanticValence = "positive" | "negative" | "neutral";
export type SemanticTarget = "kaira" | "third_party" | "event" | "unknown";
export type SemanticIntent =
  | "greeting"
  | "question"
  | "information_request"
  | "emotional_share"
  | "affection"
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
  emotionalLoad: number;
  affection: number;
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

// JS \b ASCII-merkezlidir; Türkçe karakterli kelimelerde güvenilir değildir.
const word = (source: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`, "u");

const THIRD_PARTY_RE = word("mert|müdür|patron|çocuk|adam|kadın|arkadaş(?:ım|ın)?|ona|onu|onun");
const REPORTING_RE = word("dedim|dedi|demiş|söyledim|söyledi|diyor|diyordu|diye");
const RED_LINE_RE = word("orospu|oropu|orosp[uy]|kaşar|sürtük");
const INSULT_RE = new RegExp(
  `${word("aptal|salak|gerizekalı|mal|şerefsiz|haysiyetsiz|ezik|piç|yavşak|köle").source}|geri zekalı|siktir|defol|boş konuş`,
  "u",
);
const APOLOGY_RE = new RegExp(
  `${word("özür|pardon").source}|kusura bakma|hata ettim|yanlış yaptım|özür dilerim|özür diledim`,
  "u",
);
const REPAIR_RE = new RegExp(
  `${word("barışalım|barışak|telafi").source}|düzeltmek istiyorum|bir daha yapmayacağım|beni affet|konuşup çözelim`,
  "u",
);
const STOP_QUESTIONS_RE = /(soru\s+sorma|sorma artık|sormayı bırak|hala soruyorsun|hâlâ soruyorsun|yine soru|sorgu yapma)/u;
const STOP_TALKING_RE = /(^|\s)(sus|konuşma|kes artık|yeter konuşma)(\s|$)/u;
const REJECTION_RE = /(istemiyorum|git başımdan|bırak beni|kaybol|defol|senden hiç hoşlanmıyorum|seni sevmiyorum)/u;
const COERCION_RE = /(zorundasın|emrediyorum|dediğimi yap|izin vermiyorum|yasaklıyorum|mecbursun|köle)/u;
const MANIPULATION_RE = /(suçluluk duy|benim için yap|beni seviyorsan|seni kandır|manipüle|tehdit ediyorum|şantaj)/u;
const PRIVACY_RE = /(özel mesaj|şifre|telefonunu kurcala|gizlice oku|mahrem|izinsiz bak|hesabına gir)/u;
const SUPPORT_RE = /(yanındayım|haklısın|seni anlıyorum|destekliyorum|merak etme)/u;
const COMPLIMENT_RE = /(harika|süper|mükemmel|çok iyisin|seviyorum|teşekkür|sağ ol|iyi ki varsın)/u;
const AFFECTION_RE = word("bebeğim|bebegim|bebeğim|aşkım|askım|tatlım|sevgilim");
const FRUSTRATION_RE = /(yeter|bıktım|sinir|aynı şeyi|kaç kere|neden anlamıyorsun|niye anlamıyorsun|hala soruyorsun|hâlâ soruyorsun|soru sorma|saçmalıyorsun|saçmalıyor)/u;
const CONFUSION_RE = /(ne diyon|ne diyorsun|ne anlatıyosun|ne anlatıyorsun|ne alaka|nasıl yani|bi şey anlamadım|bir şey anlamadım)/u;
const VENTING_PROFANITY_RE = word("amk|aq|mk");
const EMOTIONAL_SHARE_RE = /(moralim.{0,30}bozuk|üzgünüm|çok mutluyum|mutluyum|bunaldım|canım (?:çok )?sıkkın|kendimi (?:çok )?kötü hissediyorum|kendimi (?:çok )?iyi hissediyorum|kaygılıyım|endişeliyim|yoruldum|tükendim|hiç havamda değilim|kafam bozuk|modum yo(?:k)?|moodum düşük|keyfim yerinde değil|içim sıkılıyor)/u;
const LOW_MOOD_RE = /(moralim.{0,30}bozuk|üzgün|kötü hissed|bunaldım|canım (?:çok )?sıkkın|kaygı|endişe|stres|yoruldum|tükendim|hiç havamda değilim|kafam bozuk|modum yo(?:k)?|moodum düşük|keyfim yerinde değil|içim sıkılıyor)/u;
const INFORMATION_REQUEST_RE = /(?:^|\s)(neden|niye|nasıl|nedir|ne demek|kim|kime|kimi|hangi|hangisi|nerede|neresi|neydi|ne yapacaktı)(?:\s|$|[?.!,])|ne\s+yapmayı\s+düşünüyordu|ne\s+yapacaktı|hatırlıyor\s+musun|hatırladın\s+mı/u;

function inferTarget(
  text: string,
  negative: boolean,
  insult: boolean,
  rejection: boolean,
): SemanticTarget {
  if (!negative) return "unknown";
  if (word("kaira|kairo|sen|sana|seni|senden|senin").test(text)) return "kaira";
  if (REPORTING_RE.test(text) && THIRD_PARTY_RE.test(text)) return "third_party";
  if (THIRD_PARTY_RE.test(text)) return "third_party";
  if (
    RED_LINE_RE.test(text) ||
    insult ||
    rejection ||
    COERCION_RE.test(text) ||
    MANIPULATION_RE.test(text)
  )
    return "kaira";
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
  const affection = AFFECTION_RE.test(text) ? 0.7 : 0;
  const confusion = CONFUSION_RE.test(text);
  const frustration = FRUSTRATION_RE.test(text)
    ? 0.75
    : VENTING_PROFANITY_RE.test(text)
      ? 0.35
      : 0;
  const emotionalShare = EMOTIONAL_SHARE_RE.test(text);
  const emotionalLoad = LOW_MOOD_RE.test(text) ? 0.8 : emotionalShare ? 0.45 : 0;

  const negative =
    insult ||
    rejection ||
    coercion > 0 ||
    manipulation > 0 ||
    privacyViolation > 0 ||
    frustration > 0;
  const target = inferTarget(text, negative, insult, rejection);

  let intent: SemanticIntent = "general_chat";
  if (apology) intent = "apology";
  else if (repairAttempt) intent = "repair";
  else if (insult) intent = "insult";
  else if (stopQuestions || stopTalking || confusion || frustration >= 0.7)
    intent = "complaint";
  else if (coercion > 0) intent = "command";
  else if (rejection) intent = "rejection";
  else if (support > 0) intent = "support";
  else if (compliment > 0) intent = "compliment";
  else if (emotionalShare) intent = "emotional_share";
  else if (affection > 0) intent = "affection";
  else if (/[?]/u.test(message) || INFORMATION_REQUEST_RE.test(text))
    intent = "information_request";
  else if (/^(selam|merhaba|hey|naber|nabr|nasılsın)(?:\s|$)/u.test(text))
    intent = "greeting";
  else if (/(😂|🤣|😄|😅|:d|haha|hahah|taşak)/iu.test(text)) intent = "banter";

  const valence: SemanticValence =
    apology || repairAttempt || support > 0 || compliment > 0 || affection > 0
      ? "positive"
      : negative
        ? "negative"
        : "neutral";

  const disrespect = redLine ? 1 : insult ? 0.9 : 0;
  const severity = redLine
    ? 1
    : clamp01(
        Math.max(
          disrespect,
          coercion * 0.85,
          manipulation * 0.8,
          privacyViolation * 0.8,
          rejection ? 0.65 : 0,
          frustration * 0.55,
        ),
      );

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
    emotionalLoad,
    affection,
    support,
    compliment,
  };
}
