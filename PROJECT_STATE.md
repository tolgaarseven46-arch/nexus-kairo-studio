# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI durumu ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz.
>
> Ayrıntılı geçmiş Git history, `AI_CHANGELOG.md`, `docs/adr/` ve `docs/audits/` altında korunur. Bu dosya yalnız aktif mimari gerçek + kapanmış fazlar + sıradaki ölçülebilir işi tutar.

## 1. Proje kimliği
- Proje: NEXUS / KAIRO Studio
- Repo: `tolgaarseven46-arch/nexus-kairo-studio`
- Amaç: kişiliği, dinamik durumu, ilişki geçmişi, hafızası, self/world modeli ve kendi yaşam akışı olan Sentetik Droit'ler üretmek; Kaira referans karakterdir.
- Geliştirme yöntemi: KTM/KDM — authority sınırları açık, deterministic evidence + regression odaklı geliştirme.

## 2. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir; downstream raw metni yeniden parse ederek ikinci semantic authority oluşturamaz.
- Social Appraisal canonical zinciri G1→G4'tür; neutral turdan injury/reward/repair üretilemez.
- `RelationshipReducer` relationship-state transition otoritesidir.
- `KairaResponsePlan` final WHAT/WHETHER davranış otoritesidir; speech/persona/style HOW-only'dir.
- Final delivery world truth → autobiography → epistemic truth → ResponsePlan → final conformance zincirinden geçer.
- Claim, WorldEvent, self_fact, autobiographical_memory, language_style, relationship_state ve discourse_state ayrı ownership sınırlarına sahiptir.
- Stable character config resting affect baseline'ı; runtime KDM situational affect transition/recovery'yi sahiplenir.
- Provider/API deterministic architecture proof yerine kullanılmaz.
- Yeni regex/classifier/phrase patch ancak canonical boundary'deki ölçülmüş failure ile gerekçelendirilir.

## 3. Kapanmış ana mimari fazlar
- Canonical-only rollout / legacy compatibility kaldırımı.
- Single semantic authority + dialogue-policy decoupling.
- World-memory typed retrieval / Claim-Event provenance / self-identity integrity.
- Affect baseline vs situational affect authority.
- Structured-memory ontology.
- Dialogue obligations / fulfillment authority.
- Final-delivery fail-closed zinciri.
- Autonomous Life ownership / planning / scheduler / replay-idempotency / health / production recovery.
- Phase-0 authority observability.
- Social Appraisal G1→G4 production wiring.
- Bounded autobiographical context modulation.
- Dyadic social norm runtime wiring.
- Natural conversation characterization acceptance.

Kapanmış seam yeni reproducible failure, invariant failure, authority contradiction veya production evidence olmadan yeniden açılmaz.

## 4. Social Appraisal G1→G4 — CLOSED
- G1: semantic effect yoksa exact-zero.
- G2: candidate readings + dyadic reweight; context yalnız ağırlığı değiştirir.
- G3: single resolved appraisal.
- G4: personality / relationship / dyadic norm / bounded autobiography yalnız mevcut etkinin magnitude/niteliğini modüle eder.
- Full autobiography G4'e verilmez; yalnız instance-owned bounded typed summary kullanılır.
- Production wiring PR #170 ile kapandı.

## 5. Canonical runtime özeti
1. language understanding → immutable `SemanticInterpretation@2`;
2. grounded entity/event projection;
3. typed instance/self/world/autobiographical authorities;
4. G1→G4 single Social Appraisal;
5. `RelationshipReducer` state transition;
6. BehaviorContract + DialogueDecision + HOW-only SpeechIdentity → `KairaResponsePlan`;
7. renderer/provider planı realize eder;
8. truth/plan/final-delivery gates cevabı doğrular;
9. accepted turn state/trace/memory/observability persist edilir.

Semantic interpretation, appraisal resolution, relationship transition ve final behavior permission ayrı fakat tekil authority'lerdir.

## 6. FAST/FULL operating model — ACTIVE
- `codex/**` branch push'larında FAST lane compact canonical tests + changed tests + gerektiğinde Natural Characterization v2 + TypeScript çalıştırır ve artifact üretir.
- PR/main gate'de FULL CI: architecture contracts + autonomous + beta + Phase-0 + historical proof + full Vitest + TypeScript + production build.
- Behavior-critical fix PR'ları reported + neighbor + counterexample regression evidence taşır.

## 7. Natural Characterization v2 — CLOSED AS PRODUCT-FAILURE PASS
- Frozen regression baseline korunur.
- Deterministic product-failure sonucu: `FAIL_PRODUCT=0`, `FAIL_TEST_OR_DETECTOR=0`.
- Provider/API deterministic proof için kullanılmaz.

## 8. Pre-Gemini Turkish language foundation — FOUNDATION MERGED
- PR #192 merge edildi.
- Merge SHA: `1605e239355b485164b72f3b70f9c8c8a2f42344`.
- Post-merge FULL CI PASS.
- Provider-neutral rich `TurkishMorphologyEvidence` L2 contract mevcut.
- Legacy morphology adapter mevcut; ambiguity ve explicit zero-parse korunur.
- Typed L6 adjudicator raw text okumadan morphology + typed L3/L5 evidence tüketir.
- `SemanticInterpretation@2` tek canonical semantic authority olarak kalır.
- Field-level semantic provenance sidecar contract mevcut.
- Provider winner bilinçli olarak seçilmedi; semantic LLM kaldırılmadı.

## 9. Local language runtime integration — ACTIVE
Branch: `codex/local-language-runtime-integration`.

Bu branch'te:
- `languageUnderstandingService` rich `MorphologyEvidenceProvider` seam'ini doğrudan kabul ediyor.
- Legacy `MorphologyProvider` sonucu provider-neutral rich evidence'a adapte edilerek aynı L6 hattına giriyor.
- Semantic provider input'u optional provider-neutral `morphologyEvidence` alabiliyor; provider-specific API L6 authority'ye taşınmıyor.
- Typed L2/L3/L5 evidence canonical `SemanticInterpretation@2` üzerinde yalnız L6 reconciliation yapıyor.
- Incoming client-shared semantic interpretation da aynı canonical L6 evidence gate'inden geçiyor; downstream raw-text parser eklenmedi.
- Zero-parse ve ambiguity abstention davranışı runtime gateway'de korunuyor.
- L7 `semanticFieldProvenance` runtime result sidecar olarak yalnız gerçekten morphology ile adjudicate edilen alanları kaydediyor.
- Yeni regression testi rich morphology → canonical L6 → provenance hattını, zero-parse abstention'ı ve semantic provider'a provider-neutral evidence taşınmasını doğruluyor.
- Production analyzer dependency henüz eklenmedi; bu commit integration seam'i kapatır, provider seçmez.

## 10. Sıradaki doğrulanmış iş
1. Branch FAST CI sonucunu doğrula; type/test failure varsa branch üzerinde düzelt.
2. FULL PR gate aç ve Architecture Review + CI sonucunu doğrula.
3. Green ise runtime integration PR'ını `main`e merge et.
4. Post-merge main FULL CI doğrula.
5. Ardından analyzer seçimini behavior authority'den bağımsız shadow benchmark işi olarak ele al: JS-native vs Zemberek sentence analysis; accuracy/coverage/latency/resource/deployment ölç.
6. Analyzer winner ancak ölçüm kanıtıyla seçilir; semantic LLM kaldırılmaz.
7. L3/L4 observation aileleri yalnız deterministic reproducible failure çıkarsa canonical typed evidence seam'lerinde açılır; phrase-patch yapılmaz.

## 11. Latest checkpoint
- Date: 2026-09-09
- Main before this branch: `1605e239355b485164b72f3b70f9c8c8a2f42344`
- Active branch: `codex/local-language-runtime-integration`
- Runtime typed morphology integration: IMPLEMENTED ON BRANCH
- L7 field provenance runtime sidecar: IMPLEMENTED ON BRANCH
- Zero-parse abstention: PRESERVED
- Ambiguity authority rule: PRESERVED
- New regex semantic parser: NO
- Provider dependency added: NO
- Semantic LLM removal: NO
- Active work: CI → PR → MERGE → analyzer shadow benchmark
