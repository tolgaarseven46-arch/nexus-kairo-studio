import type { WorldEventObservation } from "./worldModelEventStore";

export interface RetrievedWorldEvent {
  observation: WorldEventObservation;
  score: number;
  reasons: string[];
}

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const tokens = (value: string) =>
  normalize(value).split(/[^\p{L}\p{N}_]+/u).filter((token) => token.length >= 2);

const RECALL_RE = /\b(?:ne demişti|ne dedi|ne olmuştu|ne oldu|hatırlıyor musun|hatırladın mı|hakkında ne biliyorsun|kimdi|kime|kimi)\b/iu;
const REPORTED_SPEECH_RE = /\b(?:ne demişti|ne dedi|demişti|dedi|söylemişti|söyledi)\b/iu;
const COMPARISON_RECALL_RE = /\b(?:mi|mı|mu|mü)\b.*\b(?:demişti|dedi|söylemişti|söyledi)\b/iu;
const STORED_QUERY_RE = /[?？]\s*$|\b(?:ne demişti|ne dedi|ne olmuştu|ne oldu|hatırlıyor musun|hatırladın mı|hakkında ne biliyorsun)\b|\b(?:mi|mı|mu|mü)\b.*\b(?:demişti|dedi|söylemişti|söyledi)\b/iu;

export function shouldRetrieveWorldEvents(message: string): boolean {
  const text = normalize(message);
  if (RECALL_RE.test(text) || COMPARISON_RECALL_RE.test(text)) return true;
  return /\b(?:dün|geçen|önceki|daha önce|hatırla|hatırlat)\b/iu.test(text);
}

export function rankWorldEventObservations(
  message: string,
  observations: WorldEventObservation[],
  maxItems = 5,
): RetrievedWorldEvent[] {
  const queryTokens = new Set(tokens(message));
  const asksReportedSpeech = REPORTED_SPEECH_RE.test(normalize(message));
  const ranked = observations
    .filter((observation) => !STORED_QUERY_RE.test(normalize(observation.event.raw || "")))
    .map((observation) => {
      const reasons: string[] = [];
      let score = 0;
      const event = observation.event;
      const names = [event.actor?.name, event.target?.name, observation.speakerName]
        .filter((value): value is string => Boolean(value))
        .map(normalize);

      for (const name of names) {
        if (queryTokens.has(name)) {
          score += 5;
          reasons.push(`name:${name}`);
        }
      }

      const rawTokens = new Set(tokens(event.raw || ""));
      let overlap = 0;
      for (const token of queryTokens) {
        if (rawTokens.has(token)) overlap += 1;
      }
      if (overlap) {
        score += Math.min(3, overlap);
        reasons.push(`token_overlap:${overlap}`);
      }

      if (asksReportedSpeech && observation.kind === "reported_claim") {
        score += 1.5;
        reasons.push("reported_speech_match");
      }

      if (observation.kind === "direct_interaction") {
        score += 1.25;
        reasons.push("direct_interaction");
      }
      if (observation.status === "grounded") {
        score += 1.5;
        reasons.push("grounded");
      } else {
        score -= 0.75;
        reasons.push("ambiguous");
      }
      score += Math.max(0, Math.min(1, event.certainty ?? 0));

      return { observation, score, reasons };
    });

  const aboveThreshold = ranked.filter((item) => item.score >= 2);
  const hasExplicitNameMatch = aboveThreshold.some((item) =>
    item.reasons.some((reason) => reason.startsWith("name:")),
  );
  const relevant = hasExplicitNameMatch
    ? aboveThreshold.filter((item) => item.reasons.some((reason) => reason.startsWith("name:")))
    : aboveThreshold;

  return relevant
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.observation.createdAt) - Date.parse(a.observation.createdAt);
    })
    .slice(0, Math.max(1, Math.min(maxItems, 10)));
}

export function buildWorldEventMemoryInstruction(items: RetrievedWorldEvent[]): string {
  if (!items.length) return "";
  const lines = items.map(({ observation }) => {
    const event = observation.event;
    const actor = event.actor?.name || "çözülmedi";
    const target = event.target?.name || "çözülmedi";
    const epistemic = observation.kind === "reported_claim"
      ? "KULLANICININ AKTARDIĞI İDDİA"
      : "DOĞRUDAN ETKİLEŞİM";
    const certainty = observation.status === "grounded" ? "grounded" : "ambiguous";
    return `- [${epistemic}; ${certainty}; güven=${Number(event.certainty ?? 0).toFixed(2)}] ${actor} -> ${target}: ${event.eventType}. Kanıt: ${event.raw}`;
  });

  return `WORLD MODEL HAFIZASI:\n${lines.join("\n")}\nKURAL: reported_claim kayıtlarını doğrulanmış dünya gerçeği gibi anlatma. ambiguous kayıtlarda kişi/olay ayrıntısı uydurma. direct_interaction ile kullanıcının aktardığı iddiayı birbirine karıştırma. Birbiriyle çelişen kayıtlar varsa tek bir gerçeğe zorla birleştirme; çelişkiyi açıkça koru.`;
}
