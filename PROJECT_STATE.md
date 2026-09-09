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
- PR #180 merge edildi.
- `codex/**` branch push'larında FAST lane compact canonical tests + changed tests + gerektiğinde Natural Characterization v2 + TypeScript çalıştırır ve artifact üretir.
- PR/main gate'de FULL CI: architecture contracts + autonomous + beta + Phase-0 + historical proof + full Vitest + TypeScript + production build.
- Behavior-critical fix PR'ları reported + neighbor + counterexample regression evidence taşır.

## 7. Natural Characterization v2 — CLOSED AS PRODUCT-FAILURE PASS (2026-09-09)
- Tooling/corpus PR #181 merge edildi.
- Ayrı v2 corpus: 10 senaryo, 11 execution, 220 user turn.
- Frozen 21 senaryo / 423 tur regression baseline'a dokunulmadı.
- Per-turn artifact semantic/state/relationship/dialogue/ResponsePlan/invariant snapshot üretir.
- Provider/API proof için kullanılmadı.

### Final deterministic result
- `PASS=5`
- `FAIL_PRODUCT=0`
- `FAIL_TEST_OR_DETECTOR=0`
- `OBSERVATION=6`
- `CAPABILITY_GAP=0`

### Kapanan S5 — stop + generic negation
- PR #182 merge edildi.
- Merge SHA: `4870d5a2398082eefdc31a04c0078b9b91875b4f`.
- Canonical ingestion explicit Turkish stop paraphrase'lerini tanıyor.
- `özür dilemedim / dilemiyorum` apology değildir.
- `tavsiye/öneri istemiyorum` positive advice request değildir.
- Progressive Turkish negation `-mıyor/-miyor/-muyor/-müyor` scope'u kapsanır.
- Explicit resume, Kaira'nın bağımsız genuine `disengaged` relationship sınırını zorla kaldıramaz.
- G1→G4 / RelationshipReducer / ResponsePlan değiştirilmedi.

### Kapanan S8 — reported third-party target bleed
- PR #183 merge edildi.
- Main merge SHA: `86a8cbd4664d5d52ecad5a268d83138117410caf`.
- Narrated dative social-role recipientleri (`iş arkadaşına`, `arkadaşıma`, `kardeşime`, `patronuna`, `eşine`) canonical target resolution'da third-party olarak korunur.
- Explicit Kaira-directed counterexample (`sana ... dedim`) Kaira target olarak kalır.
- Third-party narrative dyadic warmth/trust/conflict/hurt'a sızmaz.
- FULL CI #2613 PASS; Architecture Review #755 PASS.

## 8. Shadow-authority kısa kontrolü — CLOSED
- `discourseSocialAct.ts` user classification shared canonical event'ten gelir.
- `droitBehaviorEngine.computeBehaviorProfile` legacy raw-text distress fallback kodda kalsa da canonical production path structured appraisal kullanır.
- `relationshipBehaviorService.applyRelationshipContext` caller bulunmayan cleanup candidate olarak evidence-before-deletion değerlendirilmelidir.

## 9. Repo cleanup — DEFERRED / EVIDENCE-FIRST
- Cleanup manifest: `docs/audits/2026-09-09-repo-cleanup-manifest.md`.
- Büyük branch/script temizliği product-language foundation işinden ayrıdır; ancestry/reference kanıtı olmadan silme yapılmaz.
- Workflow'lar ve aktif test/proof runner'ları yalnız isimlerine bakılarak kaldırılmaz.

## 10. Pre-Gemini Turkish language foundation — ACTIVE / PR #192
- Current main bu çalışma başlamadan önce audit implementasyonunu geri alan `c30c81e94a9d549896e40580d9c76047a9a9b99f` commit'indedir; production main davranışı korunmuştur.
- PR #192 branch: `codex/pre-gemini-language-foundation`.
- L2 provider-neutral `TurkishMorphologyEvidence` kontratı eklendi.
- Provider-specific morphology çıktısı L2 evidence adapter üzerinden normalize edilir; L6 provider API'sini bilmez.
- L6 typed-evidence adjudicator yalnız typed morphology evidence tüketir; raw text'i yeniden parse ederek ikinci semantic authority oluşturmaz.
- Ambiguous analysis ve zero-parse durumlarında semantic invention yapılmaz; adjudicator abstain eder.
- Field-level semantic provenance sidecar kontratı eklendi; `SemanticInterpretation@2` canonical authority olarak kalır.
- Morfoloji provider kararı bilinçli olarak ertelendi: mevcut Zemberek `/lemmas` compatibility path kalabilir; JS-native analyzer yalnız bounded shadow/characterization adayıdır; Zemberek sentence analysis daha güçlü reference adayıdır.
- Semantic LLM kaldırılmadı; local path acceptance kanıtı olmadan provider routing değişmez.
- Production ResponsePlan, G4, relationship, memory, YDK ve final-delivery authority değiştirilmedi.
- FULL validate job: PASS (architecture contracts, autonomous, beta, Phase-0, historical proof, full tests, TypeScript, production build).
- Behavior guard: PASS.
- Architecture Review: PASS.
- İlk PR CI başarısızlığının tek nedeni docs-guard idi; bu `PROJECT_STATE.md` checkpoint güncellemesi onu kapatmak içindir.

## 11. Sıradaki doğrulanmış iş
1. PR #192 yeni head üzerinde FULL CI + Architecture Review sonucunu doğrula.
2. Tüm required gates yeşilse PR #192'yi `main`e merge et.
3. Merge sonrası gerçek `main` SHA ve main CI sonucunu doğrula.
4. Frozen 21/423 deterministic baseline'ın unchanged/pass durumunu CI evidence üzerinden tekrar doğrula.
5. Yeni reproducible product failure yoksa G1→G4, RelationshipReducer veya ResponsePlan seam'lerini yeniden açma.
6. Ardından yalnız ölçülmüş OBSERVATION/capability gap'leri canonical L2/L3/L4/L6 seam'lerine sınıflandır; phrase-patch açma.
7. Repo cleanup'ı product behavior'dan ayrı evidence-first iş olarak sürdür.

## 12. Latest checkpoint
- Date: 2026-09-09
- Current main: `c30c81e94a9d549896e40580d9c76047a9a9b99f`
- Open PR: `#192 feat(language): pre-Gemini Turkish language foundation`
- PR #192 pre-checkpoint head: `871db32021fa7b5353fcd368a65341d0533fb589`
- FULL validate on that head: PASS
- Behavior guard: PASS
- Architecture Review: PASS
- Docs guard: FAILED only because checkpoint file had not yet changed; now addressed by this commit
- `SemanticInterpretation@2`: SINGLE CANONICAL SEMANTIC AUTHORITY
- L6 typed-evidence adjudicator: ACTIVE IN PR, ambiguity/zero-parse abstention preserved
- Frozen 21/423 baseline: UNCHANGED / validated in FULL lane
- Provider winner: DEFERRED
- Semantic LLM removal: NO
- Active work: GREEN PR #192 → MERGE → POST-MERGE MAIN CI VERIFY
