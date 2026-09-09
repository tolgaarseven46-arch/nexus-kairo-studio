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

## 9. Repo cleanup — ACTIVE, EVIDENCE-FIRST
- Cleanup manifest: `docs/audits/2026-09-09-repo-cleanup-manifest.md`.
- Inventory anında açık PR: `0`.
- Tespit edilen `codex/*` branch sayısı: `72`.
- Dört workflow da aktif ve KEEP: `ci.yml`, `architecture-review.yml`, `fast-ci.yml`, `kaira-autonomous-life.yml`.
- Doğrudan merge-proof branch delete candidates:
  - `codex/natural-characterization-v2` — PR #181 merged;
  - `codex/semantic-negation-stop-paraphrase` — PR #182 merged;
  - `codex/third-party-reported-target-resolution` — PR #183 merged.
- Diğer 69 branch ancestry/merged-PR kanıtı olmadan silinmez.
- Eski `apply*/fix*/debug*` scriptleri yalnız isimlerine bakılarak silinmez; reference/history evidence gerekir.
- `run-behavior-red-green-proof.mjs`, Phase-0/beta runners, FAST/Natural-v2 runners aktif CI/tooling kanıtıdır ve KEEP'tir.

## 10. Sıradaki doğrulanmış iş
1. Cleanup manifest PR'ını merge gate'den geçir.
2. Remaining 69 `codex/*` branch'i batch merge/ancestry evidence ile sınıflandır.
3. Merge-proof branch ref'lerini repository hygiene olarak kaldır.
4. `REVIEW_SCRIPT` listesindeki one-shot yardımcıları repo reference/history evidence ile ayır.
5. Yalnız kanıtlı dead script/doc kalıntılarını ayrı cleanup PR'da kaldır; product behavior değiştirme.
6. Cleanup sonrası branch/script sayısını yeniden kaydet.
7. Sonra Natural Characterization v2 OBSERVATION senaryolarını **bug varsaymadan** sırayla analiz et; yalnız yeni `FAIL_PRODUCT` kanıtı çıkan yerde product patch aç.

## 11. Latest checkpoint
- Date: 2026-09-09
- Current main: `86a8cbd4664d5d52ecad5a268d83138117410caf`
- Open PRs before cleanup-manifest PR: `0`
- FAST/FULL model: ACTIVE
- Natural Characterization v2: `FAIL_PRODUCT=0`, `FAIL_TEST_OR_DETECTOR=0`
- S5: CLOSED / MERGED
- S8: CLOSED / MERGED
- Frozen 21/423 baseline: UNCHANGED
- Provider/API used in current proof: NO
- Active work: EVIDENCE-FIRST REPO CLEANUP MANIFEST + CLASSIFICATION
