/**
 * Bidirectional shim between the legacy single-label `SemanticEvent` and the
 * canonical `SemanticInterpretation@2` (ADR-0006).
 *
 * PR1: unwired. Exists so that, once producers emit v2, every legacy
 * `SemanticEvent` consumer keeps working by consuming a projection, and so that
 * the reducer can be fed from either side during the transition. Removed in PR5.
 *
 * The regex engine (`interpretSemanticEvent`) is the safety FLOOR: when building
 * a v2 interpretation from scratch we start from the regex reading and only widen
 * uncertainty; we never drop a regex-detected hard signal.
 */

import {
  interpretSemanticEvent,
  type SemanticEvent,
  type SemanticIntent,
} from "./semanticEventEngine";
import { canonicalizeSemanticEvent } from "./semanticEventCanonicalizer";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { calibrateProjectedEmotionalLoad } from "./emotionalLoadPolicy";
import {
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type SemanticInterpretation,
  type SemanticPrimaryIntent,
  type SemanticSocialAct,
  type SemanticTarget,
  type SeverityVector,
} from "../types/semanticInterpretation";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// --- context frames used to grade lexical hostility (ADR-0006 §1) -----------
const JOKE_MARKERS_RE =
  /😂|🤣|😄|😅|😆|😜|😏|:d\b|\bxd\b|(?<![\p{L}])(?:haha+|hah+|hehe+|şaka|espri|troll|gırgır|taşak)(?![\p{L}])|dalga\s*geç|takıl(?:ıyor|dım|ıyoruz|dık)/iu;
const AFFECTIONATE_FRAME_RE =
  /(?<![\p{L}])(kank[a-zçğıöşü]*|birader|moruk|kardeşim|reis|aslanım|dostum|canım|aşkım|bebeğim|bebiş|tatlım|gülüm|prensesim)(?![\p{L}])/iu;
const DIRECT_SECOND_PERSON_RE =
  /(?<![\p{L}])(sen|sana|seni|senin|senden|seninle|sende|senle|siz|sizi|sizin|size|sizden|sizinle)(?![\p{L}])/iu;
const QUESTION_FRAME_RE =
  /[?？]|(?<![\p{L}])(mi|mı|mu|mü|misin|mısın|musun|müsün)(?![\p{L}])|değil\s*mi/iu;
const REPORTING_FRAME_RE = /(?<![\p{L}])(dedi|demiş|dedim|söyledi|söyledim|diyor|diye|anlatt)(?![\p{L}])/iu;
const VENT_FRAME_RE = /(?<![\p{L}])(amk|aq|mk|of+|off+)(?![\p{L}])|ya\s+be/iu;
const FOOD_CONTEXT_RE =
  /(?<![\p{L}])(ekmek|ekmeğ|tost|peynir|kaşarlı|dilim|sandviç|sandvic|börek|böreğ|poğaça|pide|lahmacun|simit|tabağ|tabak|kahvalt|omlet|menemen|makarna|pizza|sofra|çorba|salata|porsiyon|kızart|eritt|buzdolab|market|bakkal)/iu;
const FIGHT_CONTEXT_RE =
  /(?<![\p{L}])(kavga|kavgan|tartış|hesaplaş|haddin|had+in|bağır|çekiş|kapış|restleş|yüzüne\s+söyl|sinir\s+ediyor|gıcık|nefret\s+ediyor|iğreniyor)(?![\p{L}])|herif(?![\p{L}])/iu;
const TRAILING_VOCATIVE_RE =
  /(?<![\p{L}])(orosp\p{L}*|kaşa[rs](?!\p{L}*(?:ım|im|um|üm)\b)\p{L}*|sürtük\p{L}*|kahpe\p{L}*|yavşak\p{L}*|piç\p{L}*|köle|şerefsiz|haysiyetsiz)\s*(herif|herifi|adam|adamı|kadın|kız|çocuğu|çocuk|moruk|it)?\s*[.!?…]*\s*$/iu;
const SLUR_STEM_RE = /(?<![\p{L}])(orosp|kaşa[rs]|sürtük|kahpe|yavşak|piçsin|piç\b)/iu;
const INSULT_STEM_RE =
  /(?<![\p{L}])(aptal|salak|gerizekal|geri\s*zekal|şerefsiz|haysiyetsiz|\bmal\b|ezik|köle|siktir|defol|boş\s*konuş|dangalak|gudik|öküz\b)/iu;

interface LexicalHostilityReading {
  severity: SeverityVector;
  jokingConfidence: number;
  sincerityConfidence: number;
  uncertaintyOverall: number;
  target: SemanticTarget;
  hostilityEvidence: string[];
  lexicalCandidateOnly: boolean;
  benignCompound: boolean;
}

function readLexicalHostility(message: string, event: SemanticEvent): LexicalHostilityReading {
  const wc = (message.trim().match(/\S+/gu) ?? []).length;
  const normalized = event.normalized || message.toLocaleLowerCase("tr-TR");
  const lexRedline = Boolean(event.redLine) || SLUR_STEM_RE.test(normalized);
  const lexInsult = (Boolean(event.insult) || INSULT_STEM_RE.test(normalized)) && !lexRedline;
  const lexCue = lexRedline || lexInsult;

  const hasJoke = JOKE_MARKERS_RE.test(message);
  const hasAffFrame = AFFECTIONATE_FRAME_RE.test(message) || (event.affection ?? 0) > 0;
  const isReporting = REPORTING_FRAME_RE.test(message);
  const directYou = DIRECT_SECOND_PERSON_RE.test(message) && !isReporting;
  const isQuestion = QUESTION_FRAME_RE.test(message);
  const isShort = wc <= 4;
  const isVent = VENT_FRAME_RE.test(message) && !directYou;

  const pointed = directYou && !isQuestion && !hasJoke && !hasAffFrame;
  const negative = event.valence === "negative";
  const hasFoodContext = FOOD_CONTEXT_RE.test(normalized);
  const hasFightContext = FIGHT_CONTEXT_RE.test(normalized) || FIGHT_CONTEXT_RE.test(message);
  const frustration = clamp01(event.frustration ?? 0);

  const hostilityEvidence: string[] = [];
  if (lexCue && pointed) hostilityEvidence.push("pointed-2nd-person");
  if (lexCue && directYou && !isQuestion && !pointed) hostilityEvidence.push("addressed-2nd-person");
  if (lexCue && hasFightContext) hostilityEvidence.push("serious-conflict-framing");
  if (lexCue && frustration >= 0.4) hostilityEvidence.push("frustration");
  if (lexCue && (clamp01(event.coercion ?? 0) >= 0.4 || event.intent === "rejection"))
    hostilityEvidence.push("coercion-or-rejection");
  if (
    lexCue &&
    wc >= 2 &&
    wc <= 9 &&
    !hasJoke &&
    !hasFoodContext &&
    TRAILING_VOCATIVE_RE.test(message.trim())
  )
    hostilityEvidence.push("trailing-vocative-slur");

  const benignCompound = lexCue && hasFoodContext && hostilityEvidence.length === 0;
  const lexicalCandidateOnly = lexCue && !benignCompound && hostilityEvidence.length === 0;
  const evidenced = lexCue && hostilityEvidence.length > 0;
  const addressedAtKaira =
    pointed ||
    hasFightContext ||
    hostilityEvidence.includes("trailing-vocative-slur") ||
    hostilityEvidence.includes("addressed-2nd-person");

  let disrespect: number;
  if (benignCompound) {
    disrespect = 0;
  } else if (lexicalCandidateOnly) {
    disrespect = hasJoke || hasAffFrame ? 0.2 : 0.32;
  } else if (evidenced) {
    disrespect = lexRedline ? 0.6 : 0.45;
    if (pointed) disrespect += 0.25;
    else if (addressedAtKaira) disrespect += 0.2;
    else if (directYou) disrespect += 0.1;
    if (hasFightContext) disrespect += 0.1;
    if (!pointed && hostilityEvidence.length >= 3) disrespect += 0.1;
    if (wc > 8 && negative) disrespect += 0.05;
    if (hasJoke) disrespect -= 0.2;
    if (hasAffFrame) disrespect -= 0.15;
  } else {
    disrespect = clamp01(event.disrespect ?? 0);
  }
  disrespect = clamp01(disrespect);

  let aggression = clamp01(
    Math.max(
      frustration * 0.9,
      evidenced && lexRedline && pointed ? 0.55 : evidenced && lexRedline ? 0.25 : 0,
      evidenced && lexInsult && pointed ? 0.4 : 0,
      lexicalCandidateOnly ? 0.1 : 0,
    ),
  );
  if (hasJoke) aggression = clamp01(aggression - 0.15);

  let jokingConfidence = 0.12;
  if (hasJoke) jokingConfidence += 0.42;
  if (hasAffFrame) jokingConfidence += 0.22;
  if (lexCue && isQuestion) jokingConfidence += 0.15;
  if (lexCue && isShort && !pointed && !hasFightContext) jokingConfidence += 0.15;
  if (benignCompound) jokingConfidence += 0.1;
  if (isVent) jokingConfidence += 0.1;
  if (hasFightContext) jokingConfidence -= 0.2;
  jokingConfidence = clamp01(jokingConfidence);

  let sincerityConfidence = 0.5;
  if (pointed) sincerityConfidence += hasJoke ? 0.15 : 0.28;
  if (hasFightContext) sincerityConfidence += 0.2;
  if (wc > 8 && negative) sincerityConfidence += 0.1;
  if (hasJoke) sincerityConfidence -= 0.28;
  if (hasAffFrame) sincerityConfidence -= 0.15;
  if (benignCompound) sincerityConfidence = 0.5;
  sincerityConfidence = clamp01(sincerityConfidence);

  let uncertaintyOverall = 0.5;
  if (benignCompound) uncertaintyOverall += 0.3;
  if (lexicalCandidateOnly) uncertaintyOverall += 0.25;
  if (lexCue && isShort && !pointed && !hasFightContext) uncertaintyOverall += 0.1;
  if (lexCue && hasJoke && !hasFightContext) uncertaintyOverall += 0.15;
  if (event.target === "unknown" && !pointed) uncertaintyOverall += 0.12;
  if (evidenced && addressedAtKaira && !hasJoke) uncertaintyOverall -= 0.3;
  uncertaintyOverall = Math.max(0.12, Math.min(0.92, uncertaintyOverall));

  let target = targetFromLegacy(event.target);
  if (benignCompound) {
    target = target === "third_party" ? "third_party" : "event";
  } else if (lexCue && !directYou && !isReporting && !hasFightContext && target === "kaira") {
    target = "unknown";
  }
  if (evidenced && addressedAtKaira && !isReporting && target !== "third_party") {
    target = "kaira";
  }

  return {
    severity: {
      disrespect,
      coercion: clamp01(event.coercion ?? 0),
      manipulation: clamp01(event.manipulation ?? 0),
      privacy: clamp01(event.privacyViolation ?? 0),
      aggression,
    },
    jokingConfidence,
    sincerityConfidence,
    uncertaintyOverall,
    target,
    hostilityEvidence,
    lexicalCandidateOnly,
    benignCompound,
  };
}

const PRIMARY_INTENT_FROM_LEGACY: Record<SemanticIntent, SemanticPrimaryIntent> = {
  greeting: "greeting",
  question: "question",
  information_request: "information_request",
  emotional_share: "emotional_share",
  affection: "affection",
  banter: "banter",
  insult: "insult",
  rejection: "rejection",
  apology: "apology",
  repair: "repair",
  complaint: "complaint",
  command: "command",
  support: "support",
  compliment: "compliment",
  general_chat: "smalltalk",
};

const LEGACY_INTENT_FROM_PRIMARY: Record<SemanticPrimaryIntent, SemanticIntent> = {
  greeting: "greeting",
  smalltalk: "general_chat",
  question: "question",
  information_request: "information_request",
  emotional_share: "emotional_share",
  affection: "affection",
  banter: "banter",
  insult: "insult",
  rejection: "rejection",
  apology: "apology",
  repair: "repair",
  complaint: "complaint",
  command: "command",
  support: "support",
  compliment: "compliment",
  boundary_test: "complaint",
  other: "general_chat",
};

function socialActsFromLegacy(event: SemanticEvent): SemanticSocialAct[] {
  const acts = new Set<SemanticSocialAct>();
  if (event.insult || event.redLine) acts.add("insult");
  if (event.coercion > 0) acts.add("coercion");
  if (event.manipulation > 0) acts.add("manipulation");
  if (event.privacyViolation > 0) acts.add("privacy_violation");
  if (event.affection > 0) acts.add("affection");
  if (event.apology) acts.add("apology");
  if (event.repairAttempt) acts.add("repair");
  if (event.stopTalking || event.stopQuestions) acts.add("stop_request");
  if (event.intent === "banter") acts.add("banter");
  switch (event.relationalAct) {
    case "reassurance_seek":
      acts.add("reassurance_seek");
      break;
    case "reconciliation_attempt":
      acts.add("reconciliation");
      break;
    case "closeness_bid":
      acts.add("closeness_bid");
      break;
    case "mockery":
      acts.add("mockery");
      break;
    case "challenge":
      acts.add("challenge");
      break;
    case "repair_probe":
      acts.add("repair");
      break;
    default:
      break;
  }
  return Array.from(acts);
}

function targetFromLegacy(t: SemanticEvent["target"]): SemanticTarget {
  switch (t) {
    case "kaira":
      return "kaira";
    case "third_party":
      return "third_party";
    case "event":
      return "event";
    default:
      return "unknown";
  }
}

interface DismissiveRhetoricalReading {
  active: boolean;
  disrespect: number;
  aggression: number;
  jokingConfidence: number;
  sincerityConfidence: number;
  uncertaintyOverall: number;
  evidence: string[];
}

const SECOND_PERSON_COMPETENCE_QUESTION_RE =
  /(?<![\p{L}])ne\s+(?:anla|bil|becer|yap)\p{L}*s[ıiuü]n(?![\p{L}])/iu;
const DISMISSIVE_STANCE_RE =
  /(?<![\p{L}])(?:harbi|zaten|sanki|güya|anca)(?![\p{L}])/iu;

function readDismissiveRhetoricalDevaluation(
  message: string,
  event: SemanticEvent,
): DismissiveRhetoricalReading {
  const directSecondPerson = DIRECT_SECOND_PERSON_RE.test(message) && !REPORTING_FRAME_RE.test(message);
  const competenceQuestion = SECOND_PERSON_COMPETENCE_QUESTION_RE.test(message);
  const dismissiveStance = DISMISSIVE_STANCE_RE.test(message);
  const active = directSecondPerson && competenceQuestion && dismissiveStance;
  const jokeFramed = JOKE_MARKERS_RE.test(message);

  if (!active) {
    return {
      active: false,
      disrespect: 0,
      aggression: 0,
      jokingConfidence: 0,
      sincerityConfidence: 0,
      uncertaintyOverall: 1,
      evidence: [],
    };
  }

  return {
    active: true,
    disrespect: jokeFramed ? 0.18 : 0.42,
    aggression: jokeFramed ? 0 : 0.08,
    jokingConfidence: jokeFramed ? 0.78 : 0.15,
    sincerityConfidence: jokeFramed ? 0.28 : 0.68,
    uncertaintyOverall: jokeFramed ? 0.58 : 0.34,
    evidence: [
      "direct-second-person",
      "second-person-competence-question",
      "dismissive-stance-marker",
      ...(jokeFramed ? ["joke-frame"] : []),
    ],
  };
}

function buildInterpretation(event: SemanticEvent, message: string): SemanticInterpretation {
  const hostility = readLexicalHostility(message, event);
  const rhetoricalDevaluation = readDismissiveRhetoricalDevaluation(message, event);
  let acts = socialActsFromLegacy(event);
  if (hostility.benignCompound || hostility.lexicalCandidateOnly) {
    const joke = JOKE_MARKERS_RE.test(message);
    acts = acts.filter((a) => a !== "insult" && a !== "mockery");
    if (hostility.lexicalCandidateOnly && joke && !acts.includes("banter")) acts.push("banter");
  } else if (
    hostility.hostilityEvidence.length > 0 &&
    hostility.severity.disrespect >= 0.5 &&
    !acts.includes("insult")
  ) {
    acts.push("insult");
  }
  if (rhetoricalDevaluation.active && !acts.includes("challenge")) {
    acts.push("challenge");
  }

  const severity = rhetoricalDevaluation.active
    ? {
        ...hostility.severity,
        disrespect: Math.max(hostility.severity.disrespect, rhetoricalDevaluation.disrespect),
        aggression: Math.max(hostility.severity.aggression, rhetoricalDevaluation.aggression),
      }
    : hostility.severity;
  const target = rhetoricalDevaluation.active
    ? "kaira"
    : hostility.target === "unknown"
      ? targetFromLegacy(event.target)
      : hostility.target;
  const jokingConfidence = rhetoricalDevaluation.active
    ? Math.max(hostility.jokingConfidence, rhetoricalDevaluation.jokingConfidence)
    : hostility.jokingConfidence;
  const sincerityConfidence = rhetoricalDevaluation.active
    ? Math.max(hostility.sincerityConfidence, rhetoricalDevaluation.sincerityConfidence)
    : hostility.sincerityConfidence;
  const uncertaintyOverall = rhetoricalDevaluation.active
    ? Math.min(hostility.uncertaintyOverall, rhetoricalDevaluation.uncertaintyOverall)
    : hostility.uncertaintyOverall;

  return normalizeSemanticInterpretation(
    {
      schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
      raw: message,
      normalized: event.normalized,
      primaryIntent: PRIMARY_INTENT_FROM_LEGACY[event.intent] ?? "other",
      secondarySocialActs: acts,
      target,
      valence: rhetoricalDevaluation.active ? "negative" : event.valence,
      severity,
      jokingConfidence,
      sincerityConfidence,
      affection: clamp01(event.affection ?? 0),
      support: clamp01(event.support ?? 0),
      compliment: clamp01(event.compliment ?? 0),
      emotionalLoad: clamp01(event.emotionalLoad ?? 0),
      apology: Boolean(event.apology),
      repairAttempt: Boolean(event.repairAttempt),
      stopRequest: Boolean(event.stopTalking),
      discourseFacets: {
        socialRoutine: event.socialRoutine ?? "none",
        discourseAct: event.discourseAct ?? "none",
        repairSignal: event.repairSignal ?? "none",
        adviceRequested: event.adviceRequested ?? false,
        knowledgeQuery: event.knowledgeQuery ?? null,
        selfMemoryQuery: event.selfMemoryQuery ?? null,
        relationalAct: rhetoricalDevaluation.active ? "challenge" : event.relationalAct,
        relationalIntensity: rhetoricalDevaluation.active
          ? Math.max(clamp01(event.relationalIntensity ?? 0), rhetoricalDevaluation.disrespect)
          : clamp01(event.relationalIntensity ?? 0),
        stopQuestions: Boolean(event.stopQuestions),
        stopTalking: Boolean(event.stopTalking),
      },
      uncertainty: {
        overall: uncertaintyOverall,
        intent: 0.5,
        target: rhetoricalDevaluation.active ? 0.2 : hostility.target === "unknown" ? 0.7 : 0.4,
        severity: uncertaintyOverall,
      },
      evidence: [
        {
          source: "regex",
          provider: "interpretSemanticEvent+contextGrader",
          cues: [
            event.intent,
            event.relationalAct,
            `disrespect:${severity.disrespect.toFixed(2)}`,
            `joking:${jokingConfidence.toFixed(2)}`,
            hostility.benignCompound ? "lexical:benign-compound" : null,
            hostility.lexicalCandidateOnly ? "lexical:candidate-only" : null,
            ...hostility.hostilityEvidence.map((c) => `hostility-evidence:${c}`),
            ...(rhetoricalDevaluation.active
              ? rhetoricalDevaluation.evidence.map((c) => `devaluation-evidence:${c}`)
              : []),
          ].filter(Boolean),
          confidence: rhetoricalDevaluation.active
            ? 1 - uncertaintyOverall
            : hostility.lexicalCandidateOnly || hostility.benignCompound ? 0.35 : 0.5,
        },
      ],
    },
    message,
  );
}

export function interpretationFromRegexFloor(message: string): SemanticInterpretation {
  const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
  return buildInterpretation(event, message);
}

export function interpretationFromLegacyEvent(
  event: SemanticEvent,
  message = event.raw,
): SemanticInterpretation {
  const base = buildInterpretation(event, message);
  return normalizeSemanticInterpretation(
    {
      ...base,
      secondarySocialActs: Array.from(
        new Set([...base.secondarySocialActs, ...socialActsFromLegacy(event)]),
      ),
      severity: {
        ...base.severity,
        coercion: Math.max(base.severity.coercion, clamp01(event.coercion ?? 0)),
        manipulation: Math.max(base.severity.manipulation, clamp01(event.manipulation ?? 0)),
        privacy: Math.max(base.severity.privacy, clamp01(event.privacyViolation ?? 0)),
      },
      affection: Math.max(base.affection, clamp01(event.affection ?? 0)),
      support: Math.max(base.support, clamp01(event.support ?? 0)),
      compliment: Math.max(base.compliment, clamp01(event.compliment ?? 0)),
      emotionalLoad: Math.max(base.emotionalLoad, clamp01(event.emotionalLoad ?? 0)),
      apology: base.apology || Boolean(event.apology),
      repairAttempt: base.repairAttempt || Boolean(event.repairAttempt),
      stopRequest: base.stopRequest || Boolean(event.stopTalking || event.stopQuestions),
    },
    message,
  );
}

export function projectLegacySemanticEvent(
  interp: SemanticInterpretation,
  message = interp.raw,
): SemanticEvent {
  const floor = interpretSemanticEvent(message);
  const redLine = floor.redLine || interp.severity.disrespect >= 0.98;
  const insult =
    redLine ||
    floor.insult ||
    interp.primaryIntent === "insult" ||
    interp.secondarySocialActs.includes("insult") ||
    interp.severity.disrespect >= 0.7;

  const coercion = Math.max(floor.coercion, interp.severity.coercion);
  const manipulation = Math.max(floor.manipulation, interp.severity.manipulation);
  const privacyViolation = Math.max(floor.privacyViolation, interp.severity.privacy);
  const disrespect = Math.max(floor.disrespect, interp.severity.disrespect, redLine ? 1 : insult ? 0.9 : 0);
  const frustration = Math.max(floor.frustration, interp.severity.aggression * 0.9);
  const severity = Math.max(
    floor.severity,
    disrespect,
    coercion * 0.85,
    manipulation * 0.8,
    privacyViolation * 0.8,
    frustration * 0.55,
  );

  return {
    ...floor,
    intent: LEGACY_INTENT_FROM_PRIMARY[interp.primaryIntent] ?? floor.intent,
    target:
      interp.target === "self"
        ? "kaira"
        : interp.target === "kaira" || interp.target === "third_party" || interp.target === "event"
          ? interp.target
          : floor.target,
    valence: interp.valence,
    severity: Math.min(1, severity),
    insult,
    redLine,
    disrespect: Math.min(1, disrespect),
    coercion: Math.min(1, coercion),
    manipulation: Math.min(1, manipulation),
    privacyViolation: Math.min(1, privacyViolation),
    frustration: Math.min(1, frustration),
    apology: floor.apology || interp.apology,
    repairAttempt: floor.repairAttempt || interp.repairAttempt,
    stopTalking: floor.stopTalking || (interp.stopRequest && /sus|konuşma|kes/iu.test(message)),
    stopQuestions: floor.stopQuestions || (interp.stopRequest && /sor/iu.test(message)),
    affection: Math.max(floor.affection, interp.affection),
    support: Math.max(floor.support, interp.support),
    compliment: Math.max(floor.compliment, interp.compliment),
    emotionalLoad: calibrateProjectedEmotionalLoad(interp, floor.emotionalLoad),
  };
}