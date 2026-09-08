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
- `RelationshipReducer` canonical relationship-state transition otoritesidir.
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
- Phase-0 A-cluster authority observability kapatıldı; unavailable authority varmış gibi gösterilmez.

## 4. Social Appraisal canonical architecture — G1 → G4 — CLOSED (2026-09-08)
- G1 exact-zero gate: semantik olarak anlamlı sosyal etki yoksa appraisal exact-zero kalır.
- G2 candidate readings + dyadic reweight: ilişki/norm bağlamı yalnız candidate ağırlığını değiştirir; yeni semantic fact icat etmez.
- G3 single resolution: tek resolved social appraisal üretilir; downstream ikinci appraisal üretmez.
- G4 bounded context modulation: personality, relationship state, dyadic norms ve bounded autobiographical context yalnız **zaten anlamlı olan** sosyal etkinin magnitude/nitelik yorumunu modüle eder.
- Neutral bir turdan injury/reward/repair yaratılamaz.
- Full/raw autobiography G4'e verilmez; yalnız instance-owned canonical autobiography'den aktif kullanıcı için türetilen bounded typed summary kullanılır.
- Production wiring PR #170 ile kapatıldı; main merge SHA `3511f62a9bb0af37c1551cc0cb1e10845057fd80`.
- Yeni ölçülmüş regression olmadan G1/G2/G3/G4, dyadic norm authority, participant identity veya bounded autobiographical-context sınırı yeniden açılmaz.

## 5. Phase-0 authority observability — CLOSED
- PR #174 merge edildi; main merge SHA `780a19193de861f6bbe6da5e01b985f20342a6a1`.
- Current-self/world, autobiography ve session provenance ayrı typed facet'lerdir.
- Authority yoksa Phase-0 açıkça `unavailable` kalır; raw-text parser veya fabricated snapshot ile coverage üretilmez.
- Persistent production memory hydration Phase-0 kapsamı değildir; persistent-memory davranışı gerçek production typed seam'inde ayrıca characterize edilir.

## 6. Natural-conversation characterization acceptance — CLOSED (2026-09-08)
- PR #176 `test(kaira): close natural conversation characterization acceptance` merge edildi.
- Final PR head: `e6ba9073c4cf9f5c31da82cebd22c9d3a420af76`.
- Main merge SHA: `ec7be842e433b8c84b2a47a42ed82a934847ccb9`.
- Final acceptance şunları doğruluyor:
  - maximally deep autobiography neutral bir turdan effect üretemiyor;
  - autobiographical context relational meaning'i değiştiremiyor;
  - explicit third-party scope deep active-user autobiography olsa bile relationship-neutral kalıyor;
  - aynı typed mild social injury fragile ve established relationship history arasında farklı magnitude üretiyor fakat insult immunity yaratmıyor;
  - gerçek çok-turlu Türkçe Phase-0 C3/C4/D1/D2 senaryoları canonical semantics → G4/KDM → relationship → BehaviorContract/DialogueDecision → canonical ResponsePlan hattında replay ediliyor ve plan/WHY-HOW tutarlılık invariants'ları korunuyor.
- Final acceptance testi C3/C4/D1/D2 replay'ini **aktif** tutar; diagnostic izolasyon sırasında yapılan geçici skip/daraltmalar final main'de yoktur.
- CI sırasında bulunan tek sorun production runtime bug'ı değil, acceptance ölçüm hatasıydı: `1.12` sınırı toplam `affectiveNegative` / `activation` context factor'üne değil, autobiographical katkının **incremental multiplier**'ına aittir. Test bu nedenle `withHistory / withoutHistory <= 1.12` oranını ölçer.
- Production behavior, semantic authority, appraisal authority veya memory authority değiştirilmedi; yeni heuristic/classifier eklenmedi.
- Final head için CI run #2597 ve Architecture Review #745 PASS oldu.

**Sonuç:** post-G4 natural-conversation characterization mevcut main üzerinde production regression göstermedi. Bu faz yeni patch üretmeden kapatılmıştır.

## 7. Şu anki canonical runtime özeti
1. canonical language understanding → immutable `SemanticInterpretation@2`;
2. grounded event/entity projection;
3. instance/self/world/autobiographical authorities gerektiği kadar typed evidence sağlar;
4. single Social Appraisal G1→G4 zinciri dyadic relationship effect'i çözer;
5. `RelationshipReducer` dynamic relationship/affect state'i günceller;
6. BehaviorContract + DialogueDecision + HOW-only SpeechIdentity → canonical `KairaResponsePlan`;
7. local renderer veya provider yalnız planı realize eder;
8. canonical truth/plan/final-delivery gates user-facing cevabı doğrular;
9. accepted turn state, trace, memory ve observability sınırlarına persist edilir.

Semantic interpretation, appraisal resolution, relationship transition ve final behavior permission ayrı fakat tekil authority'lerdir; aynı kavramın paralel consumer-local yorumu kabul edilmez.

## 8. Çalışma protokolü
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

## 9. Phase-1 live provider acceptance — OPEN (2026-09-09)
- Deterministic Phase-0 kapanışından sonra deployed `main` runtime üzerinde gerçek OpenRouter provider (`openai/gpt-5.1`) ile izole `welcome` instance canary başlatıldı.
- Canary kalıcı identity/autobiography/world/relationship/user-memory yazmıyor; yalnız request history + dynamicState'i turdan tura taşıyor.
- Ölçülmüş production regression #1: `aptalsın` sonrası `şaka yapmıyorum` turunda provider/repair çıktısı final ResponsePlan ile uyumsuz kaldığında API `HTTP 500 final_delivery_rejected: response_plan_humor_blocked` verdi.
- Ölçülmüş production regression #2: playful-hurt canary'nin ilk turunda final candidate soru yasağını ihlal etti ve API `HTTP 500 final_delivery_rejected: response_plan_question_blocked` verdi.
- Aynı canlı acceptance ayrıca established vs fragile dyad için internal state/ResponsePlan ayrışmasının güçlü olduğunu fakat bazı outward realizations'ın fazla benzer kaldığını gösterdi; bu ayrı bir quality characterization konusudur ve 500 availability regression'ıyla aynı patch'e karıştırılmayacaktır.
- İlk kırık authority boundary final-delivery recovery seam'idir: canonical ResponsePlan zaten `socialMove` çözmüşken constraint pass yalnız caller dialogue fallback'ini deneyip plan-owned fallback'i tüketmiyordu.
- PR #179 minimum fix: `runKairaResponseConstraintPass`, caller fallback başarısızsa yalnız `kairaSocialMoveFallback(input.plan)` ile zaten çözülmüş canonical social move'u ikinci aday olarak deneyebilir. Her aday aynı world → autobiography → epistemic → ResponsePlan → provenance/external guard zincirinden geçer.
- Yeni semantic parser, raw-text heuristic, appraisal authority, relationship authority veya memory authority eklenmedi.
- PR #179 merge edilmeden önce full CI + Architecture Review PASS olmalı; merge sonrası deployed runtime aynı Phase-1 live canary ile yeniden doğrulanmalıdır.

## 10. Next verified development mode
Aktif doğrulanmış production regression artık vardır: **live final-delivery recovery availability**.

Sıradaki sıra sabittir:
1. PR #179 deterministic regression + full CI/Architecture Review ile doğrulanır.
2. Patch merge edilirse Render `main` deploy tamamlanır.
3. Aynı Phase-1 provider canary production runtime üzerinde yeniden çalıştırılır; iki HTTP 500 tekrar etmemelidir.
4. Availability kapanırsa established-vs-fragile outward realization farkı ayrı characterization olarak ele alınır; iç state farkı tek başına user-facing başarı sayılmaz.
5. Yeni quality patch ancak yeniden üretilebilir outward failure ve ilk kırık canonical seam lokalize edilirse açılır.

## 11. Latest checkpoint
- Date: 2026-09-09
- G4 production wiring: **CLOSED**
- Phase-0 A authority observability: **CLOSED**
- Natural-conversation deterministic characterization: **CLOSED**
- Phase-1 live provider acceptance: **OPEN**
- Production regression: **2 reproducible final-delivery HTTP 500 failures**
- Live canary probe PR: **#178 OPEN (test-only)**
- Production fix PR: **#179 OPEN**
- PR #179 patch authority: canonical `ResponsePlan.socialMove` fallback only
- Immediate next mode: **finish #179 CI/architecture review, merge only if green, then rerun live production canary**
