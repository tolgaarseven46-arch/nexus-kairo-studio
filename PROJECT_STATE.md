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

## 8. Çalışma protokolü — FAST/FULL operating model
Yeni geliştirme turunda:
1. GitHub `main` SHA, açık PR/issue ve `PROJECT_STATE.md` doğrulanır.
2. Tek aktif capability / characterization seçilir.
3. `codex/**` branch üzerinde geliştirme yapılır; FAST lane canonical high-value testler + TypeScript çalıştırır ve tek artifact üretir.
4. FAST failure CI binary-isolation döngüsüyle değil artifact içindeki Vitest JSON/log/stack üzerinden çözülür.
5. PR yalnız branch merge-ready olduğunda açılır.
6. Existing FULL CI kapsamı küçültülmez; PR merge kapısında architecture contracts + autonomous + beta + Phase-0 + historical proof + full Vitest + TypeScript + build çalışır.
7. Full CI/guards/Architecture Review yeşil olmadan merge edilmez.
8. `PROJECT_STATE.md` mümkün olduğunda aynı feature PR içinde güncellenir; ayrı checkpoint PR churn'ü yaratılmaz.
9. Kapanmış seam yeni reproducible failure, invariant failure, authority contradiction veya production evidence olmadan yeniden açılmaz.

## 9. Shadow-authority kısa kontrolü — CLOSED (2026-09-09)
Claude ile belirlenen üç tarihsel bulgu current `main` üzerinde büyük audit açmadan yeniden kontrol edildi:
- `discourseSocialAct.ts`: user social-act classification shared canonical event'ten gelir; compatibility `_message` intentionally ignored. Kaira reply regex'i yalnız delivered-reply self-observation/repetition içindir.
- `droitBehaviorEngine.computeBehaviorProfile`: legacy raw-text distress fallback kodda kalır; canonical production KDM path `appraiseBehaviorSeriousContext(semanticInterpretation)` structured context'ini her çağrıda verir. Bu nedenle raw fallback canonical production semantic authority değildir.
- `relationshipBehaviorService.applyRelationshipContext`: dosya/fonksiyon hâlâ vardır ancak current-main code search caller bulmamıştır. Cleanup manifestinde dead/legacy candidate olarak doğrulanacaktır; evidence-before-deletion ilkesi nedeniyle şimdi silinmez.

Bu checkpoint product patch gerektirmedi.

## 10. Final-delivery live regression history — FIX MERGED / PROVIDER FOLLOW-UP DEFERRED
- PR #178 (`test/phase1-live-conversation-probe`) **closed, not merged**.
- PR #179 (`fix(delivery): recover rejected live replies from canonical social move`) **merged**.
- Main merge SHA: `7424f449af9896e31fa7762ccbfa0ec8620d8e0f`.
- Fix yalnız canonical `ResponsePlan.socialMove` fallback recovery seam'ini değiştirdi; yeni semantic/appraisal/relationship authority eklemedi.
- Provider follow-up current core-development gate değildir. Mevcut çalışma API/provider kullanmadan deterministic core tooling, characterization ve repo-operating-model üzerinde devam eder.

## 11. Testing v2 kararı
- Mevcut 21 senaryo / 423 tur **donmuş Regression baseline** olarak kalır.
- Yeni `Natural Characterization v2` ayrı 10 senaryolu corpus olacaktır; Regression / Characterization / Exploration rolleri karıştırılmaz.
- Her yeni senaryo `openQuestionId` taşır ve sonucu şu sınıflardan biri olur: `PASS`, `FAIL_PRODUCT`, `FAIL_TEST_OR_DETECTOR`, `OBSERVATION`, `CAPABILITY_GAP`.
- S7, D2 repair-provenance sorusunu doğal akışta kapsar; ayrı blocker oluşturulmaz.
- S9 aynı transcript'i farklı seeded relationship fixture'larıyla paired experiment olarak çalıştırır.
- Provider replay compatibility ileride korunabilir fakat core architecture proof API/provider'a bağlı değildir.

## 12. Next verified development mode
Sıra:
1. FAST/FULL validation operating modelini merge-ready hale getir ve full PR CI ile kapat.
2. 10-scenario Natural Characterization v2 transcript + fixture + `openQuestionId` tasarımını kur.
3. API-free çalıştır, turn-level compact artifact üret ve her sonucu sınıflandır.
4. Paralelde repo cleanup manifest çıkar: branch/script/root docs için KEEP/MOVE/ARCHIVE/DELETE evidence tablosu.
5. Yalnız `FAIL_PRODUCT` çıkan spesifik seam product patch açabilir.

## 13. Latest checkpoint
- Date: 2026-09-09
- Current verified main before FAST/FULL PR: `7424f449af9896e31fa7762ccbfa0ec8620d8e0f`
- Open PRs before FAST/FULL PR: **none**
- G4 production wiring: **CLOSED**
- Phase-0 A authority observability: **CLOSED**
- Natural-conversation deterministic characterization: **CLOSED**
- PR #178: **CLOSED / NOT MERGED**
- PR #179: **MERGED**
- Shadow-authority short check: **CLOSED; no production-active duplicate authority proven**
- Active work: **FAST branch validation + single failure artifact**
- Immediate next work after merge: **Natural Characterization v2 (10 scenarios, API-free)**
