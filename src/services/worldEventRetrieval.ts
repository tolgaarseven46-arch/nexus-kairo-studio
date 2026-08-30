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

function observationSignature(item: RetrievedWorldEvent): string {
  const event = item.observation.event;
  return [
    normalize(event.raw || ""),
    normalize(event.actor?.name || event.actor?.id || ""),
    normalize(event.target?.name || event.target?.id || ""),
    item.observation.kind,
    item.observation.status,
  ].join("|");
}

export function rankWorldEventObservations(
  message: string,
  observations: WorldEventObservation[],
  maxItems = 5,
): RetrievedWorldEvent[] {
  const normalizedMessage = normalize(message);
  const queryTokens = new Set(tokens(message));
  const asksReportedSpeech = REPORTED_SPEECH_RE.test(normalizedMessage);
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
  const matchedQueryNames = new Set<string>();
  for (const item of aboveThreshold) {
    for (const reason of item.reasons) {
      if (reason.startsWith("name:")) matchedQueryNames.add(reason.slice(5));
    }
  }

  const relevant = matchedQueryNames.size
    ? aboveThreshold.filter((item) => item.reasons.some((reason) => reason.startsWith("name:")))
    : aboveThreshold;

  const sorted = relevant.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Date.parse(b.observation.createdAt) - Date.parse(a.observation.createdAt);
  });

  // Old test sessions can leave semantically identical observations behind.
  // Keep only the best/newest copy so duplicate rows cannot crowd out another
  // explicitly named person in a comparison query.
  const deduped: RetrievedWorldEvent[] = [];
  const seen = new Set<string>();
  for (const item of sorted) {
    const signature = observationSignature(item);
    if (seen.has(signature)) continue;
    seen.add(signature);
    deduped.push(item);
  }

  const limit = Math.max(1, Math.min(maxItems, 10));
  if (matchedQueryNames.size <= 1) return deduped.slice(0, limit);

  // Contrastive recall ("Ayşe mi Merve mi ...?") must preserve evidence for
  // every explicitly matched name instead of letting one person's duplicate
  // high-scoring rows consume the whole result window.
  const namesInQueryOrder = [...matchedQueryNames].sort((a, b) => {
    const ai = normalizedMessage.indexOf(a);
    const bi = normalizedMessage.indexOf(b);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  const selected: RetrievedWorldEvent[] = [];
  for (const name of namesInQueryOrder) {
    const match = deduped.find((item) => item.reasons.includes(`name:${name}`));
    if (match && !selected.includes(match)) selected.push(match);
  }
  for (const item of deduped) {
    if (selected.length >= limit) break;
    if (!selected.includes(item)) selected.push(item);
  }
  return selected.slice(0, limit);
}

export function buildWorldEventMemoryInstruction(items: RetrievedWorldEvent[]): string {
  if (!items.length) return "";
  const lines = items.map(({ observation }, index) => {
    const event = observation.event;
    const actor = event.actor?.name || "çözülmedi";
    const target = event.target?.name || "çözülmedi";
    const epistemic = observation.kind === "reported_claim"
      ? "KULLANICININ AKTARDIĞI İDDİA"
      : "DOĞRUDAN ETKİLEŞİM";
    const certainty = observation.status === "grounded" ? "grounded" : "ambiguous";
    return `- #${index + 1} [${epistemic}; ${certainty}; güven=${Number(event.certainty ?? 0).toFixed(2)}] ${actor} -> ${target}: ${event.eventType}. Kanıt: ${event.raw}`;
  });

  return `WORLD MODEL HAFIZASI (retrieval sırasına göre):\n${lines.join("\n")}\nKURALLAR:\n- Kullanıcı geçmişte kimin ne dediğini soruyorsa ve burada matching grounded reported_claim varsa, bu kayıt kullanıcının daha önce aktardığı şeyi hatırlamak için YETERLİ KANITTIR. Böyle bir kayıt varken \"kaydım yok\" veya \"emin değilim\" deme. Cevabı epistemik olarak doğru kur: \"bana daha önce X'in Y dediğini söylemiştin\" gibi.\n- \"En son\" sorularında aynı kişiyle eşleşen retrieval sırasındaki ilk kayıt en güncel kanıttır.\n- Birden fazla açık isimli karşılaştırmalı soruda her isim için getirilen kanıtı ayrı değerlendir; bir kişinin kaydı diğer kişinin yerine geçmez.\n- reported_claim kayıtlarını doğrulanmış dünya gerçeği gibi anlatma. ambiguous kayıtlarda kişi/olay ayrıntısı uydurma. direct_interaction ile kullanıcının aktardığı iddiayı birbirine karıştırma. Birbiriyle çelişen kayıtlar varsa tek bir gerçeğe zorla birleştirme; çelişkiyi açıkça koru.`;
}
