# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI durumu ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz.
>
> Ayrıntılı eski çalışma kronolojisi Git history ve `docs/adr/` altında korunur. Bu dosya bilinçli olarak **aktif mimari gerçek + kapanmış fazlar + sıradaki ölçülebilir iş** için kompakt tutulur.

## 1. Proje kimliği
- Proje: NEXUS / KAIRO Studio
- Repo: `tolgaarseven46-arch/nexus-kairo-studio`
- Ana amaç: kişiliği, dinamik durumu, ilişki geçmişi, hafızası, dünya/self modeli ve kendi yaşam akışı olan Sentetik Droit'ler üretmek; Kaira bu mimarinin referans karakteridir.
- Temel geliştirme yöntemi: KTM/KDM — katmanlı, authority sınırları açık, deterministic evidence + regression odaklı geliştirme.

## 2. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir. Downstream katmanlar raw kullanıcı metnini tekrar parse ederek ikinci semantic authority oluşturamaz.
- `RelationshipReducer` canonical ilişki-state transition otoritesidir.
- `KairaResponsePlan` final WHAT/WHETHER davranış otoritesidir; speech/persona/style katmanları HOW-only'dir ve kapalı bir izni yeniden açamaz.
- Final delivery world truth → autobiographical truth → epistemic truth → ResponsePlan enforcement → final conformance sırasındaki canonical constraint zincirinden geçer.
- Claim, WorldEvent, self_fact, autobiographical_memory, language_style, relationship_state ve discourse_state ayrı ownership sınırlarına sahiptir; birbirine sessizce factual truth olarak promote edilemez.
- Stable character/fine-tune config resting affect baseline'ı; server KDM ise situational dynamic affect transition/recovery'yi sahiplenir.
- Provider/API geliştirme/audit/CI kanıtının yerine kullanılmaz. Yeni product patch önce deterministic characterization ile kanıtlanır; canlı provider yalnız gerçek-user acceptance gerektiğinde kullanılır.
- Yeni regex/classifier, phrase patch veya ikinci memory/appraisal authority ancak mevcut canonical boundary'nin yetersizliği ölçülerek kanıtlanırsa düşünülebilir.

## 3. Kapanmış büyük fazlar
- Canonical-only rollout ve legacy compatibility kaldırımı tamamlandı.
- Single semantic authority, dialogue-policy decoupling, repetition, emotional-load calibration ve canonical mixed-session acceptance tamamlandı.
- World-memory semantic retrieval authority, Claim/Event provenance ve self/identity integrity fazları tamamlandı.
- Affect baseline vs situational affect authority ayrımı tamamlandı.
- Structured-memory ontology tamamlandı.
- Natural conversation / final-delivery / question-act / transcript leakage / relationship persistence ana blocker zincirleri deterministic ve gerekli yerlerde production acceptance ile kapatıldı.
- Autonomous Life: instance ownership, planning, scheduler, replay/idempotency, health ve production recovery fazı kapalıdır; yeni production evidence olmadan yeniden açılmaz.
- Dialogue obligations / fulfillment authority ve final-delivery fail-closed zinciri kapatıldı.
- Privacy/coercion ontology ile current-self vs autobiographical-self routing sınırları typed semantics üzerinden daraltıldı; downstream raw-text patch eklenmedi.
- First-party ongoing event continuity typed claims + discourse working set üzerinden kuruldu; raw topic regex'i eklenmedi.

## 4. Social Appraisal canonical architecture — G1 → G4 — CLOSED (2026-09-08)
Bu fazın amacı aynı sosyal olayı kişilik, ilişki, dyadic norm ve autobiographical bağlama göre farklı değerlendirebilen; fakat neutral bir olaydan kendi başına ilişki anlamı icat etmeyen tek canonical appraisal zinciri kurmaktı.

### G1 — exact-zero / meaningful-social-effect gate
- Semantik olarak anlamlı sosyal etki yoksa appraisal etkisi exact-zero kalır.
- Neutral/event/third-party bağlamı sırf downstream heuristic yüzünden dyadic injury/reward üretemez.

### G2 — candidate readings + dyadic reweight
- Aynı typed sosyal olay için alternatif candidate readings üretilebilir.
- Dyadic relationship/norm bağlamı bu adayların ağırlığını değiştirebilir; yeni semantic fact icat edemez.
- Dyadic norm tek authority olarak canonical runtime'a bağlanmıştır.

### G3 — single resolution
- Candidate readings tek resolved social appraisal'a indirgenir.
- Downstream relationship projection ikinci kez bağımsız appraisal üretmez.

### G4 — bounded context modulation
- Personality, relationship state, dyadic norms ve bounded autobiographical context yalnız **zaten anlamlı olan** sosyal etkinin nitelik/magnitude yorumunu modüle eder.
- Context modulation neutral bir turdan injury/reward/repair yaratamaz.
- Repair magnitude tek appraisal authority'den gelir; eski paralel magnitude yolları authority değildir.

### Identity + memory prerequisites
- Autobiographical participant identity stable ve injective hale getirildi; farklı katılımcılar aynı memory identity'ye çökemez.
- World-observation user identity de injective hale getirildi.
- G4'e full/raw autobiography verilmez. Yalnız instance-owned canonical autobiography'den aktif kullanıcıya göre türetilmiş, bounded ve typed appraisal context verilir.
- Autobiographical kayıtlar semantic truth veya ikinci appraisal engine değildir; sadece mevcut canonical appraisal için bağlamsal evidence'tır.

### Production-path wiring — PR #170
- PR #170 `feat(appraisal): wire canonical autobiography into production G4` 2026-09-08'de merge edildi.
- PR final head: `95a9ea6a22fa62bf386bbb40dd176a18f7fa2ed2`.
- Main merge commit: `3511f62a9bb0af37c1551cc0cb1e10845057fd80`.
- `server.ts` artık instance-owned canonical autobiography'yı production chat path'inde yükler, yalnız aktif kullanıcıya ait bounded social-appraisal summary üretir ve bunu KDM'ye explicit typed seam üzerinden verir.
- Canonical KDM çağrı sırası korunur: semantic interpretation → grounded event → behavior policy → affect baseline → bounded social-appraisal memory.
- `analyzeKdmInteractionCanonicalTurn(...)` memory context'i `kdmRelationshipReducerBridge` üzerinden mevcut tek G4 resolution/modulation zincirine taşır; ikinci appraisal çağrısı eklenmez.
- ADR: `docs/adr/0088-production-g4-autobiographical-runtime-wiring.md`.
- Permanent neighbor regression: `src/services/socialAppraisalAutobiographicalRuntimeWiringNeighborProofRegression.test.ts`.

### G4 doğrulama sonucu
PR #170 final head için aşağıdaki kapılar PASS oldu:
- Architecture contracts
- Autonomous runtime contracts
- Beta runtime regression
- Pre-AI Phase0 harness/report
- Beta conversation acceptance
- Behavior proof manifest
- Historical RED→GREEN proof
- Full tests
- TypeScript
- Production build
- docs-guard
- behavior-guard
- Architecture Review

**Sonuç:** G1→G4 social-appraisal authority ve production runtime wiring fazı kapalıdır. Yeni ölçülmüş bir regression olmadan G1/G2/G3/G4, dyadic norm authority, participant identity veya bounded autobiographical-context sınırı yeniden açılmaz.

## 5. Repo temizliği — 2026-09-08
- PR #170 merge edildi.
- Eski PR #139 `fix(kaira): generalize composition invariants and non-silent delivery` current main tarafından supersede edildiği ve artık non-mergeable/stale olduğu için kapatıldı; branch wholesale revive edilmez.
- Eski PR #147 `test(beta): add seedable randomized beta exploration` current main'den 120 commit geride kaldığı ve G4/bugünkü canonical-core öncesi varsayımlar taşıdığı için kapatıldı. Randomized exploration fikri gerekirse **current main'den yeniden** tasarlanır; eski branch merge edilmez.
- 2026-09-08 kapanış audit'inde açık PR bulunmuyor.

## 6. Şu anki canonical runtime özeti
Canlı kodun kavramsal akışı:
1. canonical language understanding → immutable `SemanticInterpretation@2`;
2. grounded event/entity projection;
3. instance/self/world/autobiographical authorities gerektiği kadar typed evidence sağlar;
4. single Social Appraisal G1→G4 zinciri dyadic relationship effect'i çözer;
5. RelationshipReducer dynamic relationship/affect state'i günceller;
6. BehaviorContract + DialogueDecision + HOW-only SpeechIdentity → canonical `KairaResponsePlan`;
7. local renderer veya provider yalnız planı realize eder;
8. canonical truth/plan/final-delivery gates user-facing cevabı doğrular;
9. accepted turn state, trace, memory ve observability sınırlarına persist edilir.

Bu zincirde semantic interpretation, appraisal resolution, relationship transition ve final behavior permission ayrı fakat tekil authority'lerdir; aynı kavramın paralel consumer-local yorumu kabul edilmez.

## 7. Çalışma protokolü
Yeni sohbet veya yeni geliştirme turunda:
1. GitHub `main` SHA doğrulanır.
2. Açık PR, issue ve CI gerçekliği kontrol edilir.
3. `PROJECT_STATE.md` okunur.
4. Önce ölçülebilir product failure / characterization bulunur.
5. Root cause ilk kırık authority boundary'sinde lokalize edilir.
6. Minimum architecture-correct patch + neighbor regression yapılır.
7. Full CI/guards yeşil olmadan merge edilmez.
8. Merge sonrası checkpoint güncellenir.

Eski tamamlanmış işlere dönülmez; "daha iyi olabilir" tek başına patch sebebi değildir.

## 8. Next verified development question
G4 wiring sonrasında sıradaki iş **yeni mimari katman eklemek değil**, current `main` üzerinde evidence-driven end-to-end natural conversation characterization'dır.

Özellikle ölçülecek yeni hedef:
- bounded autobiographical context gerçek çok-turlu ilişkide continuity'yi doğru yönde etkiliyor mu;
- eski/stale autobiographical evidence güncel neutral veya düşük-anlamlı sosyal turları aşırı amplify ediyor mu;
- aynı typed sosyal olay farklı kişi/ilişki geçmişinde beklenen nitel farkı üretirken exact-zero ve third-party neutrality korunuyor mu;
- final delivered reply, resolved appraisal + relationship state + ResponsePlan ile doğal ve tutarlı kalıyor mu.

Yeni patch yalnız bu characterization'da reproducible bir failure bulunursa açılacak. Failure yoksa G4 üzerine ek heuristic/classifier/memory katmanı eklenmeyecek.

## 9. Latest checkpoint
- Date: 2026-09-08
- G4 production wiring: **CLOSED**
- PR #170: **MERGED**
- Feature merge SHA: `3511f62a9bb0af37c1551cc0cb1e10845057fd80`
- Stale PR #139: **CLOSED / superseded**
- Stale PR #147: **CLOSED / rebuild-from-main if ever needed**
- Open PR count at closure audit: **0**
- Immediate next mode: **measured natural-conversation characterization on current main**
