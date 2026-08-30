import type { CanonicalWorldEvent } from "./worldEventEngine";

export type WorldEventModalityKind =
  | "intention"
  | "plan"
  | "commitment"
  | "possibility"
  | "desire"
  | "refusal"
  | "unspecified";

export interface WorldEventModality {
  kind: WorldEventModalityKind;
  strength: number;
  marker?: string;
}

export type ModalCanonicalWorldEvent = CanonicalWorldEvent & {
  modality?: WorldEventModality;
};

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const BOUNDED_MODALITY_RULES: Array<{
  kind: Exclude<WorldEventModalityKind, "unspecified">;
  strength: number;
  pattern: RegExp;
}> = [
  {
    kind: "refusal",
    strength: 0.92,
    pattern: /(?:istemiyorum|istemiyor(?:um|sun|uz|lar)?|istemedi|vazgeçtim|vazgeçti|[\p{L}]+(?:ma|me)(?:(?:yacak|yecek|yacağ|yeceğ)[\p{L}]*))/iu,
  },
  {
    kind: "possibility",
    strength: 0.35,
    pattern: /(?:^|\s)(belki|muhtemelen|ihtimal(?:le)?|olabilir|olası)(?=\s|$)/iu,
  },
  {
    kind: "plan",
    strength: 0.72,
    pattern: /(?:planlıyorum|planlıyor|planladım|planladı|planım|planı\s+(?:var|şu)|programım|programladı)/iu,
  },
  {
    kind: "intention",
    strength: 0.58,
    pattern: /(?:düşünüyorum|düşünüyor|düşünüyordu|niyetliyim|niyetli|niyetim|aklımda)/iu,
  },
  {
    kind: "desire",
    strength: 0.48,
    pattern: /(?:istiyorum|istiyor|isterim|isterdi|istemek\s+ist)/iu,
  },
  {
    kind: "commitment",
    strength: 0.9,
    pattern: /(?:karar\s+verdim|karar\s+verdi|kesin(?:likle)?|mutlaka|[\p{L}]+(?:acak|ecek|acağ|eceğ)[\p{L}]*)/iu,
  },
];

export function detectWorldEventModality(message: string): WorldEventModality {
  const text = normalize(message);
  for (const rule of BOUNDED_MODALITY_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      return {
        kind: rule.kind,
        strength: rule.strength,
        marker: match[0],
      };
    }
  }
  return { kind: "unspecified", strength: 0 };
}

export function enrichWorldEventModality(event: CanonicalWorldEvent): ModalCanonicalWorldEvent {
  return {
    ...event,
    modality: detectWorldEventModality(event.raw),
  };
}

export function modalityExecutionWeight(event: ModalCanonicalWorldEvent): number {
  if (event.polarity === "negative" || event.modality?.kind === "refusal") return -1;
  switch (event.modality?.kind) {
    case "commitment": return 4;
    case "plan": return 3;
    case "intention": return 2;
    case "desire": return 1;
    case "possibility": return 0.5;
    default: return 0;
  }
}
