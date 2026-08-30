import type { SemanticEvent } from "./semanticEventEngine";
import type { EntityResolutionResult } from "./entityResolutionEngine";
import type { CanonicalWorldEvent } from "./worldEventEngine";
import type { RetrievedWorldEvent } from "./worldEventRetrieval";

export type KairaContractLayer =
  | "semantic"
  | "entity_resolution"
  | "world_event"
  | "retrieval"
  | "retrieval_to_response";

export interface KairaInvariantIssue {
  layer: KairaContractLayer;
  invariant: string;
  message: string;
}

export interface KairaContractReport {
  accepted: boolean;
  issues: KairaInvariantIssue[];
}

const between01 = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const normalizedName = (value?: string) =>
  String(value || "").toLocaleLowerCase("tr-TR").trim();

const RECALL_QUERY_RE = /[?？]\s*$|\b(?:ne demişti|ne dedi|ne olmuştu|ne oldu|hatırlıyor musun|hatırladın mı|hakkında ne biliyorsun)\b|\b(?:mi|mı|mu|mü)\b.*\b(?:demişti|dedi|söylemişti|söyledi)\b/iu;

export const KAIRA_ARCHITECTURE_CONTRACTS_V1 = {
  semantic: [
    "SemanticEvent yalnızca mesaj anlamını temsil eder; ilişki veya davranış state'i değiştirmez.",
    "Bütün yoğunluk/skor alanları 0..1 aralığındadır.",
    "insult=true ise intent=insult veya severity/disrespect pozitif olmalıdır.",
  ],
  entityResolution: [
    "Muhatap kimliği her zaman kaira'dır.",
    "namedPeople tekrarsızdır ve named_person referanslarıyla uyumludur.",
    "Belirsizlik çözülmüş gibi uydurulmaz; ambiguities alanında korunur.",
  ],
  worldEvent: [
    "CanonicalWorldEvent ham mesajı kaybetmez.",
    "certainty 0..1 aralığındadır.",
    "Participant objeleri undefined değer serialize etmez.",
    "Yeni canonical event V2 proposition/polarity/temporal alanlarını taşır.",
    "Proposition predicate eventType ile aynı semantic kimliği temsil eder.",
    "Recall/query mesajları kalıcı dünya olayı olarak değerlendirilmemelidir.",
  ],
  retrieval: [
    "Retrieval cevap üretmez; yalnızca kanıt kümesi döndürür.",
    "Açık isimli recall sorgusunda dönen kanıtlar sorgudaki isimlerden en az biriyle eşleşmelidir.",
    "Legacy recall soruları kanıt olarak geri getirilmemelidir.",
  ],
  retrievalToResponse: [
    "Grounded matching reported_claim varsa response generation bunu 'kayıt yok' sayamaz.",
    "reported_claim dünya gerçeği değil, kullanıcının aktardığı iddia olarak korunur.",
  ],
} as const;

export function validateSemanticContract(event: SemanticEvent): KairaContractReport {
  const issues: KairaInvariantIssue[] = [];
  const bounded: Array<[string, number]> = [
    ["relationalIntensity", event.relationalIntensity],
    ["severity", event.severity],
    ["disrespect", event.disrespect],
    ["coercion", event.coercion],
    ["manipulation", event.manipulation],
    ["privacyViolation", event.privacyViolation],
    ["frustration", event.frustration],
    ["emotionalLoad", event.emotionalLoad],
    ["affection", event.affection],
    ["support", event.support],
    ["compliment", event.compliment],
  ];

  for (const [name, value] of bounded) {
    if (!between01(value)) {
      issues.push({
        layer: "semantic",
        invariant: "semantic.score_range",
        message: `${name} 0..1 aralığında değil: ${value}`,
      });
    }
  }

  if (event.insult && event.intent !== "insult" && event.severity <= 0 && event.disrespect <= 0) {
    issues.push({
      layer: "semantic",
      invariant: "semantic.insult_consistency",
      message: "insult=true fakat intent/severity/disrespect hakaret sinyalini taşımıyor.",
    });
  }

  return { accepted: issues.length === 0, issues };
}

export function validateEntityResolutionContract(
  result: EntityResolutionResult,
): KairaContractReport {
  const issues: KairaInvariantIssue[] = [];

  if (result.addressee.id !== "kaira") {
    issues.push({
      layer: "entity_resolution",
      invariant: "entity.addressee_identity",
      message: "Entity resolver addressee kimliğini kaira dışında üretti.",
    });
  }

  const names = result.namedPeople.map(normalizedName).filter(Boolean);
  if (new Set(names).size !== names.length) {
    issues.push({
      layer: "entity_resolution",
      invariant: "entity.named_people_unique",
      message: "namedPeople içinde tekrar eden kişi var.",
    });
  }

  const refNames = new Set(
    result.references
      .filter((ref) => ref.role === "named_person")
      .map((ref) => normalizedName(ref.resolvedName || ref.surface))
      .filter(Boolean),
  );
  for (const name of names) {
    if (!refNames.has(name)) {
      issues.push({
        layer: "entity_resolution",
        invariant: "entity.named_people_backed_by_reference",
        message: `namedPeople kaydı named_person referansıyla desteklenmiyor: ${name}`,
      });
    }
  }

  if (!between01(result.confidence)) {
    issues.push({
      layer: "entity_resolution",
      invariant: "entity.confidence_range",
      message: `Entity confidence 0..1 aralığında değil: ${result.confidence}`,
    });
  }

  return { accepted: issues.length === 0, issues };
}

const participantHasUndefined = (participant?: Record<string, unknown>) =>
  Boolean(participant && Object.values(participant).some((value) => value === undefined));

export function validateWorldEventContract(
  message: string,
  event: CanonicalWorldEvent,
): KairaContractReport {
  const issues: KairaInvariantIssue[] = [];

  if (event.raw !== message) {
    issues.push({
      layer: "world_event",
      invariant: "world_event.raw_fidelity",
      message: "CanonicalWorldEvent.raw orijinal mesajla aynı değil.",
    });
  }

  if (!between01(event.certainty)) {
    issues.push({
      layer: "world_event",
      invariant: "world_event.certainty_range",
      message: `World event certainty 0..1 aralığında değil: ${event.certainty}`,
    });
  }

  if (participantHasUndefined(event.actor as unknown as Record<string, unknown>) || participantHasUndefined(event.target as unknown as Record<string, unknown>)) {
    issues.push({
      layer: "world_event",
      invariant: "world_event.firestore_safe_participants",
      message: "World event participant objesinde undefined alan var.",
    });
  }

  if (!event.proposition?.key || event.proposition.predicate !== event.eventType) {
    issues.push({
      layer: "world_event",
      invariant: "world_event.v2_proposition_identity",
      message: "Canonical World Event V2 proposition eksik veya predicate eventType ile uyumsuz.",
    });
  }

  if (!event.polarity || !["positive", "negative", "unknown"].includes(event.polarity)) {
    issues.push({
      layer: "world_event",
      invariant: "world_event.v2_polarity",
      message: "Canonical World Event V2 polarity eksik/geçersiz.",
    });
  }

  if (!event.temporal || !["past", "present", "future", "unspecified"].includes(event.temporal.relation)) {
    issues.push({
      layer: "world_event",
      invariant: "world_event.v2_temporal_reference",
      message: "Canonical World Event V2 temporal reference eksik/geçersiz.",
    });
  }

  return { accepted: issues.length === 0, issues };
}

export function isRecallQuery(message: string): boolean {
  return RECALL_QUERY_RE.test(message.toLocaleLowerCase("tr-TR"));
}

export function validateRetrievalContract(
  message: string,
  entityResolution: EntityResolutionResult,
  retrieved: RetrievedWorldEvent[],
): KairaContractReport {
  const issues: KairaInvariantIssue[] = [];

  if (!isRecallQuery(message)) return { accepted: true, issues };

  for (const item of retrieved) {
    if (isRecallQuery(item.observation.event.raw || "")) {
      issues.push({
        layer: "retrieval",
        invariant: "retrieval.no_query_pollution",
        message: `Recall sorgusu kanıt olarak geri getirildi: ${item.observation.event.raw}`,
      });
    }
  }

  const queryNames = new Set(entityResolution.namedPeople.map(normalizedName).filter(Boolean));
  if (queryNames.size && retrieved.length) {
    const matchedNames = new Set<string>();
    for (const item of retrieved) {
      const actor = normalizedName(item.observation.event.actor?.name);
      const target = normalizedName(item.observation.event.target?.name);
      for (const name of queryNames) {
        if (actor === name || target === name) matchedNames.add(name);
      }
    }

    if (queryNames.size > 1) {
      for (const name of queryNames) {
        if (!matchedNames.has(name)) {
          issues.push({
            layer: "retrieval",
            invariant: "retrieval.multi_name_coverage",
            message: `Karşılaştırmalı recall için kanıt kümesinde kişi eksik: ${name}`,
          });
        }
      }
    } else if (matchedNames.size === 0) {
      issues.push({
        layer: "retrieval",
        invariant: "retrieval.named_query_match",
        message: "Açık isimli recall sorgusunda isimle eşleşen kanıt yok.",
      });
    }
  }

  return { accepted: issues.length === 0, issues };
}

export function hasGroundedRecallEvidence(items: RetrievedWorldEvent[]): boolean {
  return items.some(
    (item) =>
      item.observation.status === "grounded" &&
      item.observation.kind === "reported_claim",
  );
}

export function validateKairaArchitectureContracts(input: {
  message: string;
  semantic: SemanticEvent;
  entities: EntityResolutionResult;
  worldEvent: CanonicalWorldEvent;
  retrieved?: RetrievedWorldEvent[];
}): KairaContractReport {
  const reports = [
    validateSemanticContract(input.semantic),
    validateEntityResolutionContract(input.entities),
    validateWorldEventContract(input.message, input.worldEvent),
    validateRetrievalContract(input.message, input.entities, input.retrieved || []),
  ];
  const issues = reports.flatMap((report) => report.issues);
  return { accepted: issues.length === 0, issues };
}
