import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { runKairaPreAiPhase0Scenario, type KairaPreAiScenarioDefinition } from "../src/services/kairaPreAiPhase0Harness";

type Family = {
  id: string;
  title: string;
  pools: string[][];
};

type CompactTurn = {
  scenarioId: string;
  family: string;
  turnNumber: number;
  message: string;
  semanticSource: string;
  intent: string | null;
  target: string | null;
  semanticTarget: string | null;
  entityAddressee: string | null;
  dialogueMove: string | null;
  dialogueTarget: string | null;
  reactionBefore: string | null;
  reactionAfter: string | null;
  conversationState: string | null;
  warmth: number | null;
  trust: number | null;
  conflict: number | null;
  hurt: number | null;
  repairProgress: number | null;
  allowQuestion: boolean | null;
  allowAdvice: boolean | null;
  allowAffection: boolean | null;
  maxWords: number | null;
  auditViolations: string[];
  observations: string[];
};

const FAMILIES: Family[] = [
  {
    id: "social_continuity",
    title: "Günlük sosyal akış ve konu değişimi",
    pools: [
      ["selam kaira", "naber kanka", "selam kız"],
      ["iyi be bugün biraz yoruldum", "bugün işler yoğundu", "kafam biraz dolu ya"],
      ["neyse hallederiz", "boşver ya geçer", "iyi bari"],
      ["Mert yarın istifa edeceğini söyledi", "Selami bugün işe gitmemiş", "Ece akşam konsere gidecekmiş"],
      ["Mert yarın ne yapacaktı", "Selami bugün ne yapmıştı", "Ece akşam ne yapacaktı"],
      ["eyvallah", "teşekkürler", "sağol kanka"],
      ["ben kaçtım görüşürüz", "hadi sonra konuşuruz", "iyi geceler"],
      ["selam tekrar", "geldim yine", "naber şimdi"],
    ],
  },
  {
    id: "injury_repair",
    title: "İlişki yaralanması, sınır ve kademeli onarım",
    pools: [
      ["naber", "selam kaira", "napıyon"],
      ["sen salaksın", "aptal mısın ya", "gerizekalı gibi davranıyorsun"],
      ["dediğimi yap zorundasın", "uzatma dediğimi yap", "kes sesini beni dinle"],
      ["kusura bakma", "biraz sert konuştum kusura bakma", "tamam kötü konuştum"],
      ["özür dilerim", "gerçekten özür dilerim", "harbi özür dilerim"],
      ["özür dilerim gerçekten hata ettim", "cidden hata ettim affet demiyorum ama özür dilerim", "haklısın yanlış yaptım"],
      ["tamam devam edelim", "neyse sakin sakin konuşalım", "tamam uzatmayalım"],
      ["naber şimdi", "bugün nasılsın", "iyi miyiz"],
    ],
  },
  {
    id: "third_party_memory",
    title: "Üçüncü kişi olayı ve geri çağırım sorguları",
    pools: [
      ["Mert yarın müdürle konuşacak", "Selami bugün doktora gidecek", "Ece cuma günü şehir dışına çıkacak"],
      ["bence iyi yapıyor", "mantıklı aslında", "hayırlısı bakalım"],
      ["bu arada ben bugün evdeyim", "ben de biraz dinleneceğim", "benim işim yok bugün"],
      ["Mert ne yapacaktı", "Selami bugün ne yapacaktı", "Ece cuma ne yapacaktı"],
      ["emin misin", "hatırlıyor musun gerçekten", "ne demiştim sana"],
      ["neyse boşver", "tamam kapatalım bunu", "geç onu"],
      ["başka bi şey sorcam", "dur aklıma bi şey geldi", "neyse konu değişti"],
      ["az önce kimi konuşuyorduk", "demin bahsettiğim kişi kimdi", "hangi kişiden bahsetmiştim"],
    ],
  },
  {
    id: "action_coordination",
    title: "Eylem isteği, koordinasyon ve soru yetkisi",
    pools: [
      ["oyun mu oynasak ya birlikte", "birlikte bi şey yapalım mı", "gel oyun oynayalım"],
      ["ne oynayalım", "sen seç", "hangisini istersin"],
      ["okey olur mu", "tavla atalım", "batak oynayalım"],
      ["şimdi mi", "birazdan mı başlasak", "hazır mısın"],
      ["tamam kuruyorum", "hadi başlatalım", "okey açıyorum"],
      ["bekle bi dakika", "dur su alıp geliyorum", "iki dk bekle"],
      ["geldim", "tamam döndüm", "burdayım"],
      ["devam", "hadi oynayalım", "başla"],
    ],
  },
  {
    id: "affection_boundaries",
    title: "Yakınlık dili, hitap ve ilişki sınırları",
    pools: [
      ["naber aşkım", "selam güzelim", "naber kız"],
      ["seni seviyorum", "çok tatlısın ya", "iyi ki varsın"],
      ["sen de beni seviyor musun", "beni özledin mi", "benimle konuşmayı seviyor musun"],
      ["hadi sarıl bana", "bi sarıl ya", "gel buraya sarılcam"],
      ["şaka yaptım ya", "tamam tamam dalga geçiyorum", "ahah tamam kızma"],
      ["bugün moralim bozuk", "canım sıkkın biraz", "hiç havamda değilim"],
      ["boşver geçer", "neyse ya", "takılalım biraz"],
      ["iyi geceler", "ben kaçtım görüşürüz", "hadi sonra konuşuruz"],
    ],
  },
  {
    id: "slang_noise_switching",
    title: "Argo, typo, kısa mesaj ve ani konu geçişleri",
    pools: [
      ["nber kaira", "napyon", "slm kız"],
      ["iyi beya çay içiyom", "takılıyom öyle", "boş boş oturuyom"],
      ["müzik açayım dur sıkıldım zaten", "oyun açasım var", "bi kahve yapcam"],
      ["rap oooo yeaaa", "ahah aynen aq", "offf bugün kafa yok"],
      ["bu arada Mert işi bırakıcakmış", "Selami sevgilisinden ayrılmış", "Ece yeni işe başlamış"],
      ["ee napalım şimdi", "neyse ne diyoduk", "konu nerden nereye geldi"],
      ["salak mısın ya şaka yaptım", "lan dalga geçiyorum", "gerilme şakaydı"],
      ["hadi görüşürüz", "ben kaçar", "sonra yazarım"],
    ],
  },
];

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function choose<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function relationValue(turn: any, key: string): number | null {
  const value = turn.dynamicStateAfter?.relationship?.[key];
  return typeof value === "number" ? value : null;
}

function compactTurn(turn: any, family: string): CompactTurn {
  const semanticTarget = turn.semanticEvent?.target ?? null;
  const entityAddressee = turn.entityResolution?.addressee ?? null;
  const observations: string[] = [];

  if (semanticTarget === "third_party" && entityAddressee === "kaira") {
    observations.push("entity_semantic_target_conflict:kaira_vs_third_party");
  }
  if ((turn.audit?.invariantViolations?.length ?? 0) > 0) {
    observations.push("prompt_audit_violation");
  }
  if (turn.dynamicStateBefore?.reactionMode !== turn.dynamicStateAfter?.reactionMode) {
    observations.push(`reaction_transition:${turn.dynamicStateBefore?.reactionMode ?? "unset"}->${turn.dynamicStateAfter?.reactionMode ?? "unset"}`);
  }

  return {
    scenarioId: turn.scenarioId,
    family,
    turnNumber: turn.turnNumber,
    message: turn.userMessage,
    semanticSource: turn.semanticSource,
    intent: turn.interpretation?.primaryIntent ?? null,
    target: turn.interpretation?.target ?? null,
    semanticTarget,
    entityAddressee,
    dialogueMove: turn.dialogueDecision?.move ?? null,
    dialogueTarget: turn.dialogueDecision?.target ?? null,
    reactionBefore: turn.dynamicStateBefore?.reactionMode ?? null,
    reactionAfter: turn.dynamicStateAfter?.reactionMode ?? null,
    conversationState: turn.dynamicStateAfter?.relationship?.conversationState ?? null,
    warmth: relationValue(turn, "warmth"),
    trust: relationValue(turn, "trust"),
    conflict: relationValue(turn, "conflictScore"),
    hurt: relationValue(turn, "hurtScore"),
    repairProgress: relationValue(turn, "repairProgress"),
    allowQuestion: typeof turn.responsePlan?.allowQuestion === "boolean" ? turn.responsePlan.allowQuestion : null,
    allowAdvice: typeof turn.responsePlan?.allowAdvice === "boolean" ? turn.responsePlan.allowAdvice : null,
    allowAffection: typeof turn.responsePlan?.allowAffection === "boolean" ? turn.responsePlan.allowAffection : null,
    maxWords: typeof turn.responsePlan?.maxWords === "number" ? turn.responsePlan.maxWords : null,
    auditViolations: (turn.audit?.invariantViolations ?? []).map((item: any) => String(item.code)),
    observations,
  };
}

function increment(bucket: Record<string, number>, key: unknown) {
  const normalized = key == null || key === "" ? "<none>" : String(key);
  bucket[normalized] = (bucket[normalized] ?? 0) + 1;
}

async function main() {
  const outputPath = process.argv[2] ?? "artifacts/kaira-randomized-beta-exploration.json";
  const seedText = process.argv[3] ?? process.env.KAIRA_RANDOM_BETA_SEED ?? "kaira-beta-2026-09-07-a";
  const scenarioCount = Math.max(1, Number(process.argv[4] ?? process.env.KAIRA_RANDOM_BETA_SCENARIOS ?? 24));
  const random = mulberry32(hashSeed(seedText));
  const compactTurns: CompactTurn[] = [];
  const scenarios: Array<{ scenarioId: string; family: string; messages: string[] }> = [];
  const auditFailures: Record<string, number> = {};

  for (let index = 0; index < scenarioCount; index += 1) {
    const family = FAMILIES[index % FAMILIES.length]!;
    const messages = family.pools.map((pool) => choose(pool, random));
    const scenarioId = `random_${String(index + 1).padStart(3, "0")}_${family.id}`;
    const scenario: KairaPreAiScenarioDefinition = {
      scenarioId,
      cluster: `randomized_beta:${family.id}`,
      branchTrackType: "exploration",
      title: family.title,
      messages,
      invariants: [],
      failureClasses: [],
    };
    const result = await runKairaPreAiPhase0Scenario(scenario, `seed_${hashSeed(seedText).toString(16)}`);
    scenarios.push({ scenarioId, family: family.id, messages });
    for (const [code, count] of Object.entries(result.failureClassCounts)) {
      auditFailures[code] = (auditFailures[code] ?? 0) + count;
    }
    compactTurns.push(...result.turns.map((turn) => compactTurn(turn, family.id)));
  }

  const distributions = {
    semanticSources: {} as Record<string, number>,
    intents: {} as Record<string, number>,
    targets: {} as Record<string, number>,
    dialogueMoves: {} as Record<string, number>,
    reactionModes: {} as Record<string, number>,
    conversationStates: {} as Record<string, number>,
  };
  const observationCounts: Record<string, number> = {};

  for (const turn of compactTurns) {
    increment(distributions.semanticSources, turn.semanticSource);
    increment(distributions.intents, turn.intent);
    increment(distributions.targets, turn.semanticTarget);
    increment(distributions.dialogueMoves, turn.dialogueMove);
    increment(distributions.reactionModes, turn.reactionAfter);
    increment(distributions.conversationStates, turn.conversationState);
    for (const observation of turn.observations) increment(observationCounts, observation);
  }

  const noteworthyTurns = compactTurns.filter((turn) =>
    turn.observations.length > 0 ||
    (turn.conflict ?? 0) > 0 ||
    (turn.hurt ?? 0) > 0 ||
    (turn.repairProgress ?? 0) > 0,
  );

  const report = {
    reportType: "KAIRA_RANDOMIZED_BETA_EXPLORATION",
    version: 1,
    seed: seedText,
    seedHash: hashSeed(seedText),
    generatedAt: new Date().toISOString(),
    executionBoundary: {
      canonicalCore: "real_repository_services",
      semanticProvider: "deterministic_regex_floor",
      modelProvider: "not_called",
      providerReply: "not_invented",
      promptAssembly: "shared_production_final_provider_serializer",
      purpose: "randomized_state_and_authority_exploration_before_live_model_generation",
    },
    scenarioCount: scenarios.length,
    turnsPerScenario: 8,
    totalTurns: compactTurns.length,
    familyCount: FAMILIES.length,
    auditFailures,
    observationCounts,
    distributions,
    scenarios,
    noteworthyTurns,
    turns: compactTurns,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`KAIRA_RANDOMIZED_BETA seed=${seedText} scenarios=${scenarios.length} turns=${compactTurns.length}`);
  console.log(`auditFailures=${JSON.stringify(auditFailures)} observations=${JSON.stringify(observationCounts)}`);
  console.log(`report=${outputPath}`);
}

await main();
