# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI durumu ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology L2 typed evidence'tır; semantic truth yalnız L6'da oluşur.
- Downstream raw text reparse / ikinci semantic authority yok.
- Social Appraisal G1→G4, `RelationshipReducer` ve `KairaResponsePlan` ownership sınırları korunur.
- Provider/API deterministic architecture proof yerine kullanılmaz.
- Yeni regex/classifier/phrase patch ancak canonical boundary'deki ölçülmüş failure ile gerekçelendirilir.

## 2. Pre-Gemini Turkish language foundation — CLOSED
- PR #192 merge: `1605e239355b485164b72f3b70f9c8c8a2f42344`.
- Rich provider-neutral `TurkishMorphologyEvidence` contract mevcut.
- Ambiguity ve explicit zero-parse korunur.
- Typed L6 adjudicator raw text okumadan typed L2/L3/L5 evidence tüketir.
- L7 field-level semantic provenance sidecar contract mevcut.
- Bu foundation semantic provider/LLM'i kaldırmaz; canonical semantic authority `SemanticInterpretation@2` olarak kalır.

## 3. Local language runtime integration — MERGED
- PR #193 merge: `cb5a1207d8bfba80865fae2bfeb6ae31675912ff`.
- Rich morphology evidence production language-understanding gateway'e bağlandı.
- Legacy morphology aynı rich contract'a adapte edilerek L6'ya girer.
- Incoming/shared ve semantic-provider interpretation aynı canonical L6 evidence gate'inden geçer.
- Zero-parse ve ambiguity abstention runtime'da korunur.
- Post-merge main FULL CI #2638 PASS.

## 4. Morphology analyzer shadow benchmark — MERGED
- PR #194 merge: `ac9bfa9cc3998167f67bc5ecc17e3b122d6254bb`.
- Provider-neutral deterministic benchmark parse rate / zero-parse / ambiguity / expected-feature recall ölçer.
- JS-native frozen proof yararlı morphology evidence üretir fakat production dependency seçmek için yeterli kanıt değildir.
- Legacy Zemberek `/lemmas`: `compatibility_only`.
- Rich Zemberek sentence analysis: ölçülmemiş `reference_candidate`.
- Analyzer winner bilinçli olarak **NOT SELECTED**; gerçek karşılaştırılabilir runtime evidence olmadan seçim yapılmaz.
- Post-merge main FULL CI #2640 PASS.

## 5. Bounded local semantic runtime acceptance — MERGED
- PR #195 merge: `4af0b4841db70c7595c816d157ba7fb7235d9e4b`.
- Typed greeting / how_are_you / what_doing routine evidence canonical L6'da kabul edilir.
- Unanimous NEG yalnız existing positive semantic candidate'i block eder; kendi başına semantic invention yapmaz.
- QUES morphology yalnız typed `polarQuestionClause` scope ile information request'e promote edilir.
- Ambiguous QUES promotion yapılmaz; uncertainty yükselir.
- Zero-parse tamamen abstain eder.
- PR #195 Architecture Review #769 PASS.
- PR #195 FULL CI #2641 PASS.
- Post-merge main FULL CI #2642 PASS.

## 6. L7 provenance source-kind audit — MERGED
- PR #196 merge: `cbd4c8bf93c87c97deb30c378631b5f24a3fa732`.
- Typed social-routine provenance `discourse` olarak kaydedilir; morphology diye yanlış etiketlenmez.
- Unanimous NEG provenance `morphology` olarak kalır.
- Typed polar-question promotion field provenance'da ortak `morphology + syntax` evidence olarak kaydedilir.
- Yalnız gerçekten adjudicate edilen canonical semantic field'lara sidecar provenance yazılır.
- Focused provenance-kind regressions eklendi.
- PR #196 Architecture Review #770 PASS.
- PR #196 FULL CI #2643 PASS.
- Post-merge main FULL CI #2644 PASS.

## 7. Remaining deterministic language families — CHARACTERIZED / PASS
Current canonical runtime üzerinde yeniden doğrulanan aileler:
- contextual `yeter`: sufficiency/predicate kullanım stop değildir; standalone `yeter` stop request'tir;
- preference-vs-directed `seviyorum`: `kahveyi seviyorum` neutral preference, `seni seviyorum` Kaira-directed positive social act olarak ayrılır;
- inflected interrogatives: `ne yaptın`, `neredeydin`, `kimlerle konuştun`, `neredesin`, `ne yapacaksın` information_request olarak kalır;
- target grounding: narrated dative third-party harm active Kaira-user dyadına sızmaz; explicit second-person harm Kaira target olarak kalır;
- nearby non-question counterexamples korunur.

Bu characterization mevcut canonical behavior'ı regression proof ile kilitler; yeni semantic regex/parser/phrase patch eklemez.

## 8. Phase closeout
- Pre-Gemini bounded Turkish language foundation: **CLOSED**.
- Açık reproducible deterministic semantic failure: **NONE** (bu fazın ölçülmüş kapsamı içinde).
- Analyzer winner: **NOT SELECTED BY DESIGN**.
- Semantic LLM/provider rolü: **UNCHANGED**.
- External AI/API deterministic proof içinde: **NO**.
- Yeni downstream semantic authority: **NO**.
- Yeni raw-text semantic parser: **NO**.

## 9. Sıradaki doğrulanmış iş
- Bu language foundation fazını yeniden açma; yalnız yeni reproducible failure, invariant break veya gerçek production evidence çıkarsa dön.
- Sonraki geliştirme yeni bir ölçülmüş product/runtime hedefinden başlamalı.
- Analyzer/provider seçimi ancak gerçek, karşılaştırılabilir accuracy/coverage/latency/resource/deployment ölçümü elde edildiğinde yapılmalı; kanıtsız winner seçilmemeli.
- Local coverage acceptance kanıtı olmadan semantic LLM rolü azaltılmamalı.

## 10. Latest checkpoint
- Date: 2026-09-09
- Language closeout PR #197 merged as `224c62d62319be8434ab5ab4c0233128c7e8525a`.
- Verified post-closeout main CI #2646: PASS.
- Open PRs at checkpoint verification: NONE.
- Pre-Gemini bounded language phase: CLOSED.
- Analyzer winner: NOT SELECTED.
- External AI API in deterministic tests: NO.
- New regex semantic parser: NO.
- Semantic LLM removal: NO.
- Active language cleanup work: NONE.
- Next work must start from a newly measured product/runtime target; do not reopen this phase without new evidence.
