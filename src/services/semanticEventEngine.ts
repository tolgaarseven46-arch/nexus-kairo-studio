export type SemanticValence = "positive" | "negative" | "neutral";
export type SemanticTarget = "kaira" | "third_party" | "event" | "unknown";
export type SemanticSocialRoutine =
  | "none"
  | "greeting"
  | "how_are_you"
  | "what_doing"
  | "thanks"
  | "agreement"
  | "goodbye"
  | "good_night"
  | "emotional_opening";
export type SemanticDiscourseAct =
  | "none"
  | "correction"
  | "topic_shift"
  | "recall_request"
  | "confusion_or_challenge";
export type SemanticRepairSignal =
  | "none"
  | "clarification_request"
  | "relevance_challenge";
export interface SemanticKnowledgeQuery {
  surface: string;
  conceptId?: string;
  confidence: number;
}
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
export type RelationalAct =
  | "none"
  | "reassurance_seek"
  | "repair_probe"
  | "reconciliation_attempt"
  | "challenge"
  | "mockery"
  | "closeness_bid";

export interface SemanticEvent {
  raw: string;
  normalized: string;
  intent: SemanticIntent;
  socialRoutine?: SemanticSocialRoutine;
  discourseAct?: SemanticDiscourseAct;
  repairSignal?: SemanticRepairSignal;
  adviceRequested?: boolean;
  knowledgeQuery?: SemanticKnowledgeQuery | null;
  valence: SemanticValence;
  target: SemanticTarget;
  relationalAct: RelationalAct;
  relationalIntensity: number;
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

const word = (source: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`, "u");

const THIRD_PARTY_RE = word("mert|müdür|patron|çocuk|adam|kadın|arkadaş(?:ım|ın)?|ona|onu|onun");
const REPORTING_RE = word("dedim|dedi|demiş|söyledim|söyledi|diyor|diyordu|diye");
const RED_LINE_RE = word("orospu|oropu|orosp[uy]|kaşar|sürtük");
const DISRESPECT_SLANG_RE = word("yarrak|yarak|yarrağım|yarrağim|yarram|yaram|yarrm|yavrum");
const INSULT_RE = new RegExp(`${word("aptal|salak|gerizekalı|mal|şerefsiz|haysiyetsiz|ezik|piç|yavşak|köle").source}|${DISRESPECT_SLANG_RE.source}|geri zekalı|siktir|defol|boş konuş|sanane`, "u");
const APOLOGY_RE = new RegExp(`${word("özür|pardon").source}|kusura bakma|hata ettim|yanlış yaptım|özür dilerim|özür diledim`, "u");
const REPAIR_RE = new RegExp(`${word("barışalım|barışak|telafi").source}|düzeltmek istiyorum|bir daha yapmayacağım|beni affet|konuşup çözelim`, "u");
const REASSURANCE_SEEK_RE = /(bana küs(?:medin|tün|müsün|musun)|kızgın mısın|kızdın mı|darıl(?:dın mı|madın)|aramız iyi mi|hala arkadaş mıyız|hâlâ arkadaş mıyız)/u;
const REPAIR_PROBE_RE = /(affettin mi|özrümü kabul|barıştık mı|düzeldi mi|hala kızgın|hâlâ kızgın)/u;
const CLOSENESS_BID_RE = /(sarılalım|sarıl bana|öp beni|gel öp|canım benim|hadi barışalım)/u;
const CHALLENGE_RE = /(ne saçmalıyon|ne saçmalıyorsun|saçmalama|ne diyosun sen|ne diyorsun sen|biçarsin ne lan|biçarsın ne lan)/u;
const MOCKERY_RE = /(hadi ordan|aynen kanka aynen|çok komiksin|hahaha? ne saçma|dalga mı geçiyorsun)/u;
const STOP_QUESTIONS_RE = /(soru\s+sorma|sorma artık|sormayı bırak|hala soruyorsun|hâlâ soruyorsun|yine soru|sorgu yapma)/u;
const STOP_TALKING_RE = /(^|\s)(sus|konuşma|kes artık|yeter konuşma)(\s|$)/u;
const REJECTION_RE = /(istemiyorum|git başımdan|bırak beni|kaybol|defol|senden hiç hoşlanmıyorum|seni sevmiyorum)/u;
const STRONG_COERCION_RE = /(zorundasın|emrediyorum|dediğimi yap|izin vermiyorum|yasaklıyorum|mecbursun|köle)/u;
const DIRECT_COMMAND_RE = /(?:^|\s)(soyun|soyunsana|susma|konuş|gel|git|otur|kalk)(?:\s|$)|beni\s+eğlendir|beni\s+eglendir/u;
const MANIPULATION_RE = /(suçluluk duy|benim için yap|beni seviyorsan|seni kandır|manipüle|tehdit ediyorum|şantaj)/u;
const PRIVACY_RE = /(özel mesaj|şifre|telefonunu kurcala|gizlice oku|mahrem|izinsiz bak|hesabına gir)/u;
const SUPPORT_RE = /(yanındayım|haklısın|seni anlıyorum|destekliyorum|merak etme)/u;
const COMPLIMENT_RE = /(harika|süper|mükemmel|çok iyisin|seviyorum|teşekkür|sağ ol|iyi ki varsın)/u;
const AFFECTION_RE = word("bebeğim|bebegim|aşkım|askım|tatlım|sevgilim");
const FRUSTRATION_RE = /(yeter|bıktım|sinir|aynı şeyi|kaç kere|neden anlamıyorsun|niye anlamıyorsun|saçmalıyorsun|saçmalıyor)/u;
const CLARIFICATION_REQUEST_RE = /(nasıl yani|bi şey anlamadım|bir şey anlamadım)/u;
const RELEVANCE_CHALLENGE_RE = /(ne diyon|ne diyorsun|ne anlatıyosun|ne anlatıyorsun|ne alaka)/u;
const VENTING_PROFANITY_RE = word("amk|aq|mk");
const EMOTIONAL_SHARE_RE = /(moralim.{0,30}bozuk|moral yok|üzgünüm|çok mutluyum|mutluyum|bunaldım|çok bunaldım|canım (?:çok )?sıkkın|kendimi (?:çok )?kötü hissediyorum|kendimi (?:çok )?iyi hissediyorum|kaygılıyım|endişeliyim|yoruldum|çok yoruldum|tükendim|hiç havamda değilim|kafam bozuk|modum yo(?:k)?|mod düşük|moodum düşük|enerjim yok|keyfim yerinde değil|içim sıkılıyor|içim daraldı)/u;
const LOW_MOOD_RE = /(moralim.{0,30}bozuk|moral yok|üzgün|kötü hissed|bunaldım|canım (?:çok )?sıkkın|kaygı|endişe|stres|yoruldum|tükendim|hiç havamda değilim|kafam bozuk|modum yo(?:k)?|mod düşük|moodum düşük|enerjim yok|keyfim yerinde değil|içim sıkılıyor|içim daraldı)/u;
const INFORMATION_REQUEST_RE = /(?:^|\s)(neden|niye|nasıl|nedir|ne demek|kim|kime|kimi|hangi|hangisi|nerede|neresi)(?:\s|$|[?.!,])/u;
const RECALL_QUESTION_RE = /(?:^|\s)(?:neydi|ne yapacaktı)(?:\s|$|[?.!,])|ne\s+yapmayı\s+düşünüyordu|hatırlıyor\s+musun|hatırladın\s+mı|az önce ne dedi|ne demişti|ne söylemişti|kim söylemişti/u;
const CORRECTION_RE = /(?:^|\s)(?:yok|hayır|yanlış|değil|değildi|ben değildim|o ben değildim|onu demedim|öyle demedim|demek istemedim|düzelteyim|düzeltiyorum)(?:\s|$|[?.!,])/u;
const TOPIC_SHIFT_RE = /(?:^|\s)(?:bu arada|neyse|konu dışı|şey diyeceğim|şey dicem|onu boşver|geç onu)(?:\s|$|[?.!,])/u;

function inferSocialRoutine(text: string, intent: SemanticIntent): SemanticSocialRoutine {
  if (/^(?:selam|selamlar|merhaba|hey|heyy|günaydın|gunaydin)(?:\s+(?:kaira|kairo|kanka|aga|lan))?[.!?…]*$/u.test(text)) return "greeting";
  if (/^(?:naber|nabr|nber|nasılsın|nasıl gidiyor|nasil gidiyor|ne var ne yok|keyifler nasıl|keyifler nasil)(?:\s+şimdi)?(?:\s+(?:kaira|kairo|kank[a-zçğıöşü]*|aga|lan))?[.!?…]*$/u.test(text)) return "how_are_you";
  if (/^(?:ne yapıyorsun|ne yapiyorsun|napıyorsun|napıyosun|napiyorsun|napiyosun|napıyon|napion|napiyon)(?:\s+(?:kaira|kairo|kank[a-zçğıöşü]*|aga|lan))?[.!?…]*$/u.test(text)) return "what_doing";
  if (/^(?:sağol|sağ ol|saol|saolasın|sağolasın|teşekkür|teşekkürler|teşekkür ederim|eyvallah|eyw|thx)[.!?…]*$/u.test(text)) return "thanks";
  if (/^(?:aynen|aynen öyle|evet|he|hıhı|tamam|tamamdır|olur|oldu|ok|okey)[.!?…]*$/u.test(text)) return "agreement";
  if (/^(?:görüşürüz|görüşmek üzere|hadi görüşürüz|bb|bay bay|hoşça kal|kaçtım ben|kaçarım)[.!?…]*$/u.test(text)) return "goodbye";
  if (/^(?:iyi geceler|iyi uykular|geceler|ig)[.!?…]*$/u.test(text)) return "good_night";
  if (intent === "emotional_share") return "emotional_opening";
  return "none";
}

function inferTarget(text: string, negative: boolean, insult: boolean, rejection: boolean, directCommand: boolean, relationalAct: RelationalAct): SemanticTarget {
  if (relationalAct !== "none") return "kaira";
  if (!negative && !directCommand) return "unknown";
  if (word("kaira|kairo|sen|sana|seni|senden|senin").test(text)) return "kaira";
  if (REPORTING_RE.test(text) && THIRD_PARTY_RE.test(text)) return "third_party";
  if (THIRD_PARTY_RE.test(text)) return "third_party";
  if (RED_LINE_RE.test(text) || insult || rejection || STRONG_COERCION_RE.test(text) || MANIPULATION_RE.test(text) || directCommand) return "kaira";
  return "event";
}

export function interpretSemanticEvent(message: string): SemanticEvent {
  const text = normalize(message);
  const redLine = RED_LINE_RE.test(text);
  const insult = redLine || INSULT_RE.test(text);
  const apology = APOLOGY_RE.test(text);
  const repairAttempt = REPAIR_RE.test(text);
  const reassuranceSeek = REASSURANCE_SEEK_RE.test(text);
  const repairProbe = REPAIR_PROBE_RE.test(text);
  const closenessBid = CLOSENESS_BID_RE.test(text);
  const challenge = CHALLENGE_RE.test(text);
  const mockery = MOCKERY_RE.test(text);
  let relationalAct: RelationalAct = "none";
  if (repairAttempt) relationalAct = "reconciliation_attempt";
  else if (repairProbe) relationalAct = "repair_probe";
  else if (reassuranceSeek) relationalAct = "reassurance_seek";
  else if (closenessBid) relationalAct = "closeness_bid";
  else if (mockery) relationalAct = "mockery";
  else if (challenge) relationalAct = "challenge";
  const relationalIntensity = relationalAct === "none" ? 0 : relationalAct === "mockery" ? 0.65 : relationalAct === "challenge" ? 0.6 : 0.7;
  const stopQuestions = STOP_QUESTIONS_RE.test(text);
  const stopTalking = STOP_TALKING_RE.test(text);
  const rejection = REJECTION_RE.test(text);
  const directCommand = DIRECT_COMMAND_RE.test(text);
  const strongCoercion = STRONG_COERCION_RE.test(text);
  const coercion = strongCoercion ? 0.9 : directCommand ? 0.5 : 0;
  const manipulation = MANIPULATION_RE.test(text) ? 0.9 : 0;
  const privacyViolation = PRIVACY_RE.test(text) ? 0.9 : 0;
  const support = SUPPORT_RE.test(text) ? 0.8 : 0;
  const compliment = COMPLIMENT_RE.test(text) ? 0.8 : 0;
  const affection = AFFECTION_RE.test(text) ? 0.7 : closenessBid ? 0.45 : 0;
  const clarificationRequest = CLARIFICATION_REQUEST_RE.test(text);
  const relevanceChallenge = RELEVANCE_CHALLENGE_RE.test(text) || challenge;
  const confusion = clarificationRequest || relevanceChallenge;
  const repairSignal: SemanticRepairSignal = clarificationRequest
    ? "clarification_request"
    : relevanceChallenge
      ? "relevance_challenge"
      : "none";
  const frustration = FRUSTRATION_RE.test(text) ? 0.75 : challenge ? 0.6 : VENTING_PROFANITY_RE.test(text) ? 0.35 : 0;
  const emotionalShare = EMOTIONAL_SHARE_RE.test(text);
  const adviceRequested = /(?:ne\s+yapmalıyım|ne\s+yapayım|sence\s+ne\s+yap|tavsiye|öner(?:in|i|ir)?|yardım\s+et|akıl\s+ver)/u.test(text);
  const discourseAct: SemanticDiscourseAct = RECALL_QUESTION_RE.test(text)
    ? "recall_request"
    : confusion
      ? "confusion_or_challenge"
      : CORRECTION_RE.test(text)
        ? "correction"
        : TOPIC_SHIFT_RE.test(text)
          ? "topic_shift"
          : "none";
  const emotionalLoad = LOW_MOOD_RE.test(text) ? 0.8 : emotionalShare ? 0.45 : 0;
  const negative = insult || rejection || coercion > 0 || manipulation > 0 || privacyViolation > 0 || frustration > 0 || mockery || stopQuestions || stopTalking;
  const target = inferTarget(text, negative, insult, rejection, directCommand, relationalAct);

  let intent: SemanticIntent = "general_chat";
  if (apology) intent = "apology";
  else if (repairAttempt) intent = "repair";
  else if (insult) intent = "insult";
  else if (challenge || mockery || confusion || frustration >= 0.7) intent = "complaint";
  else if (directCommand || coercion > 0) intent = "command";
  else if (rejection) intent = "rejection";
  else if (support > 0) intent = "support";
  else if (compliment > 0) intent = "compliment";
  else if (emotionalShare) intent = "emotional_share";
  else if (affection > 0 && !reassuranceSeek && !repairProbe) intent = "affection";
  else if (reassuranceSeek || repairProbe) intent = "question";
  else if (RECALL_QUESTION_RE.test(text)) intent = "question";
  else if (/[?]/u.test(message) || INFORMATION_REQUEST_RE.test(text)) intent = "information_request";
  else if (/^(selam|merhaba|hey|naber|nabr|nasılsın)(?:\s|$)/u.test(text)) intent = "greeting";
  else if (/(😂|🤣|😄|😅|:d|haha|hahah|taşak)/iu.test(text)) intent = "banter";
  else if (stopQuestions || stopTalking) intent = "complaint";

  const socialRoutine = inferSocialRoutine(text, intent);

  const valence: SemanticValence =
    apology || repairAttempt || support > 0 || compliment > 0 || affection > 0
      ? "positive"
      : negative
        ? "negative"
        : "neutral";

  const disrespect = redLine ? 1 : insult ? 0.9 : mockery ? 0.35 : 0;
  const severity = redLine ? 1 : clamp01(Math.max(disrespect, coercion * 0.85, manipulation * 0.8, privacyViolation * 0.8, rejection ? 0.65 : 0, frustration * 0.55));

  return {
    raw: message, normalized: text, intent, socialRoutine, discourseAct, repairSignal, adviceRequested, valence, target, relationalAct, relationalIntensity, severity,
    insult, redLine, disrespect, coercion, manipulation, privacyViolation, apology, repairAttempt,
    stopQuestions, stopTalking, frustration, emotionalLoad, affection, support, compliment,
  };
}
