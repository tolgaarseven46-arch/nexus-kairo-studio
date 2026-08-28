import type { ConversationTurn } from "./kairoConversationGrounding";

export type DialogueAct =
  | "statement"
  | "question"
  | "correction"
  | "topic_shift"
  | "banter"
  | "uncertain"
  | "noise";

export type DialogueMemoryScope = "session" | "episodic" | "durable_candidate";

export interface DialogueTurnAnalysis {
  acts: DialogueAct[];
  factConfidence: number;
  memoryScope: DialogueMemoryScope;
  isLikelyAbsurd: boolean;
  topicTokens: string[];
}

export interface DialogueClaim {
  source: string;
  subject: string;
  text: string;
  confidence: number;
  status: "active" | "uncertain" | "denied" | "absurd";
}

const CORRECTION_RE =
  /\b(yok|hayır|yanlış|değil|değildi|ben değildim|o ben değildim|onu demedim|öyle demedim|demek istemedim|düzelt(?:eyim|iyorum)?)\b/i;
const TOPIC_SHIFT_RE =
  /\b(bu arada|neyse|konu dışı|şey diyeceğim|şey dicem|onu boşver|geç onu)\b/i;
const UNCERTAINTY_RE =
  /\b(herhalde|galiba|sanırım|belki|muhtemelen|olabilir|emin değilim|düşünüyorum|düşünüyor|düşünüyordu|gibi)\b/i;
const QUESTION_RE =
  /[?？]|(?:^|\s)(kim|kime|kimi|ne|neyi|neden|niye|nasıl|nerede|nereye|hangi|kaç|mı|mi|mu|mü)(?:\s|$)/i;
const BANTER_RE =
  /(?:😂|🤣|😄|😅|:d|\b(?:şaka|dalga|taşak|ha(?:ha)+h*|a?haha+|asdasd+|dfghj+)\b)/i;
const NOISE_RE = /^(?:\s|[.!?])+$/i;
const KEYBOARD_MASH_RE = /^(?:asd|sdf|dfg|qwe|jkl|x+d|h+a+h+a+)[a-zğüşöçı]*$/i;
const ABSURD_RE =
  /(?<![\p{L}])(uzaylı|marslı|ejderha|zombi|müdür aslında robot|dünyayı ele geçir)(?![\p{L}])/iu;
const DURABLE_RE =
  /\b(benim adım|adım|ismim|yaşım|yaşındayım|mesleğim|işim|şehirde yaşıyorum|seviyorum|sevmiyorum|favorim|hedefim|amacım|üzerinde çalışıyorum|geliştiriyorum)\b/i;

const TOPIC_STOP_WORDS = new Set([
  "ama",
  "artık",
  "ben",
  "beni",
  "benim",
  "bir",
  "bize",
  "bizim",
  "bugün",
  "bunu",
  "dedi",
  "dedim",
  "değil",
  "diye",
  "evet",
  "falan",
  "gibi",
  "hayır",
  "için",
  "kanka",
  "lan",
  "mı",
  "mi",
  "mu",
  "mü",
  "nasıl",
  "neyse",
  "olan",
  "onu",
  "öyle",
  "sana",
  "sen",
  "şey",
  "yarın",
  "yok",
]);

function topicTokens(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLocaleLowerCase("tr-TR")
        .replace(/[^a-zçğıöşü0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !TOPIC_STOP_WORDS.has(token)),
    ),
  ).slice(0, 5);
}

export function analyzeDialogueTurn(text: string): DialogueTurnAnalysis {
  const raw = String(text || "").trim();
  const acts: DialogueAct[] = [];
  const noise = !raw || NOISE_RE.test(raw) || KEYBOARD_MASH_RE.test(raw);
  const correction = CORRECTION_RE.test(raw);
  const topicShift = TOPIC_SHIFT_RE.test(raw);
  const uncertain = UNCERTAINTY_RE.test(raw);
  const question = QUESTION_RE.test(raw);
  const banter = BANTER_RE.test(raw);
  const absurd = ABSURD_RE.test(raw);
  const durable = DURABLE_RE.test(raw) && !absurd && !noise;

  if (noise) acts.push("noise");
  if (correction) acts.push("correction");
  if (topicShift) acts.push("topic_shift");
  if (uncertain) acts.push("uncertain");
  if (question) acts.push("question");
  if (banter || absurd) acts.push("banter");
  if (!noise && !question) acts.push("statement");

  let factConfidence = 0.72;
  if (durable) factConfidence = 0.9;
  if (correction) factConfidence = Math.min(factConfidence, 0.76);
  if (uncertain) factConfidence = Math.min(factConfidence, 0.45);
  if (question) factConfidence = Math.min(factConfidence, 0.3);
  if (banter) factConfidence = Math.min(factConfidence, 0.38);
  if (absurd) factConfidence = 0.12;
  if (noise) factConfidence = 0.05;

  const memoryScope: DialogueMemoryScope =
    noise || absurd ? "session" : durable ? "durable_candidate" : "episodic";

  return {
    acts: Array.from(new Set(acts)),
    factConfidence,
    memoryScope,
    isLikelyAbsurd: absurd,
    topicTokens: topicTokens(raw),
  };
}

function participantInText(text: string, participant: string): boolean {
  const normalizedText = text.toLocaleLowerCase("tr-TR");
  const normalizedParticipant = participant.toLocaleLowerCase("tr-TR");
  return new RegExp(
    `(?<![\\p{L}])${normalizedParticipant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`,
    "iu",
  ).test(normalizedText);
}

export function buildDialogueClaimLedger(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
): DialogueClaim[] {
  const userTurns = history
    .filter((turn) => turn.sender === "user")
    .map((turn) => ({
      speaker: turn.participantName || "Kullanıcı",
      text: String(turn.text || ""),
    }));
  const turns = [...userTurns, { speaker: userName, text: userMessage }];
  const participants = Array.from(
    new Set([...userTurns.map((turn) => turn.speaker), userName]),
  ).filter((name) => name !== "Kullanıcı");
  const claims: DialogueClaim[] = [];

  for (const turn of turns) {
    const analysis = analyzeDialogueTurn(turn.text);
    if (
      analysis.acts.includes("correction") &&
      /\b(?:o\s+)?ben değildim\b/i.test(turn.text)
    ) {
      const previous = [...claims]
        .reverse()
        .find(
          (claim) =>
            claim.subject === turn.speaker && claim.status !== "denied",
        );
      if (previous) previous.status = "denied";
    }

    if (analysis.acts.includes("question") || analysis.acts.includes("noise"))
      continue;

    for (const subject of participants) {
      if (!participantInText(turn.text, subject)) continue;
      claims.push({
        source: turn.speaker,
        subject,
        text: turn.text,
        confidence: analysis.factConfidence,
        status: analysis.isLikelyAbsurd
          ? "absurd"
          : analysis.acts.includes("uncertain")
            ? "uncertain"
            : "active",
      });
    }
  }

  return claims.slice(-8);
}

const ACTION_TOPICS = [
  { id: "istifa", pattern: /\b(istifa|işten ayrıl|işi bırak)/i },
  { id: "maaş", pattern: /\b(maaş|zam|ücret)/i },
  { id: "maç", pattern: /\b(maç|maça)/i },
] as const;

export function findDialogueAttributionIssues(
  reply: string,
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
): string[] {
  const ledger = buildDialogueClaimLedger(history, userMessage, userName);
  const participants = Array.from(
    new Set([
      ...history.map((turn) => turn.participantName).filter(Boolean),
      userName,
    ]),
  ) as string[];
  const target = participants.find((name) =>
    participantInText(userMessage, name),
  );
  if (!target) return [];

  const issues: string[] = [];
  const clauses = reply.split(/[.!?;\n]+/).filter(Boolean);
  for (const topic of ACTION_TOPICS) {
    const targetTopicClauses = clauses.filter(
      (clause) =>
        participantInText(clause, target) && topic.pattern.test(clause),
    );
    if (!targetTopicClauses.length) continue;
    const targetHasTopic = ledger.some(
      (claim) =>
        claim.subject === target &&
        claim.status !== "denied" &&
        claim.status !== "absurd" &&
        topic.pattern.test(claim.text),
    );
    const otherHasTopic = ledger.some(
      (claim) =>
        claim.subject !== target &&
        claim.status !== "denied" &&
        claim.status !== "absurd" &&
        topic.pattern.test(claim.text),
    );
    const targetDeniedTopic = ledger.some(
      (claim) =>
        claim.subject === target &&
        claim.status === "denied" &&
        topic.pattern.test(claim.text),
    );
    const revivesDeniedTopic =
      targetDeniedTopic &&
      targetTopicClauses.some(
        (clause) =>
          !/\b(dedi|dedin|demiş|iddia|reddetti|yalanladı|yok|değil)\b/i.test(
            clause,
          ),
      );
    if (revivesDeniedTopic) {
      issues.push(
        `${target} tarafından reddedilen ${topic.id} iddiası yeni tahmin gibi yeniden üretildi`,
      );
      continue;
    }
    if (!targetHasTopic && otherHasTopic) {
      issues.push(
        `${topic.id} konusu ${target} yerine başka bir kişiye ait kaynaktan yanlış aktarıldı`,
      );
    }
  }
  return issues;
}

export function buildDialogueBoardInstruction(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
): string {
  const recentUserTurns = history
    .filter((turn) => turn.sender === "user")
    .slice(-6)
    .map((turn) => ({
      speaker: turn.participantName || "Kullanıcı",
      text: String(turn.text || ""),
      analysis: analyzeDialogueTurn(String(turn.text || "")),
    }));
  const current = {
    speaker: userName,
    text: userMessage,
    analysis: analyzeDialogueTurn(userMessage),
  };
  const turns = [...recentUserTurns, current];
  const claimLedger = buildDialogueClaimLedger(history, userMessage, userName);
  const topics = Array.from(
    new Set(turns.flatMap((turn) => turn.analysis.topicTokens)),
  ).slice(-8);
  const signals = turns
    .slice(-5)
    .map(
      (turn) =>
        `- ${turn.speaker}: [${turn.analysis.acts.join(", ")}; güven=${turn.analysis.factConfidence.toFixed(2)}; hafıza=${turn.analysis.memoryScope}] ${turn.text}`,
    )
    .join("\n");
  const claims = claimLedger
    .map(
      (claim) =>
        `- kaynak=${claim.source}; özne=${claim.subject}; durum=${claim.status}; güven=${claim.confidence.toFixed(2)}; söz="${claim.text}"`,
    )
    .join("\n");

  return `KARMAŞIK DİYALOG TAHTASI:
- Açık konu işaretleri: ${topics.length ? topics.join(", ") : "belirgin konu yok"}
- Son sosyal sinyaller:\n${signals || "- kayıt yok"}
- Kaynaklı iddia defteri:\n${claims || "- açık iddia yok"}
KURALLAR:
- Sohbetin tek ve düzgün bir konu izlemesi gerekmez. Birden fazla konu dalı açık kalabilir.
- Düzeltmeyi, şakayı, aktarılan sözü ve belirsiz ifadeyi kesin gerçek gibi birleştirme.
- İddia defterinde kaynak yalnızca sözü söyleyendir; eylemi yapan kişi "özne"dir. Kaynak ile özneyi ASLA birbirine çevirme. "denied" kaydı geçerli plan değildir.
- Geçmişi hatırlama sorusunda özneye ait etkin iddia kalmadıysa "net bilgi yok" de. Reddedilmiş veya desteksiz bir planı mizah, tahmin ya da "büyük ihtimalle" kalıbıyla yeniden UYDURMA.
- "session" işaretli absürt/gürültülü mesajları kalıcı gerçek sayma; akış içinde şakaya katılabilirsin.
- Her ayrıntıya cevap vermek zorunda değilsin. En doğal tek sosyal hareketi seç: tepki, soru, görüş, şaka, düzeltme veya kısa sessiz kabul.
- Karışıklık önemsizse akışı bozma. Ancak yanlış anlamak kişi, plan veya önemli olay bilgisini değiştirecekse kısa bir netleştirme sor.`;
}
