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

## 8. Provider-free relationship acceptance — MERGED
- PR #199 merge: `0151e64503d1b2b75603d324159e06d7fa9bd15a`.
- Frozen C3 same-stimulus A/B proof gerçek canonical Phase-0 runtime üzerinde geçer.
- Yeni ve established/high-quality ilişki yalnız typed `DroitDynamicState.relationship` seed'iyle ayrılır.
- Her iki kol non-zero injury üretir; familiar/high-quality context harm'ı azaltır fakat sıfırlamaz.
- Aynı turn için canonical `SemanticInterpretation@2` ve `SemanticEvent` eşit kalır.
- Provider/API çağrısı ve yeni runtime parser eklenmedi.

## 9. Dismissive rhetorical semantic-floor coverage — ACTIVE
- Issue #200, PR #199 sonrası bağımsız language-floor gap olarak açıldı.
- Reproduced family: doğrudan ikinci kişiye yöneltilen, bilgi/yeterlilik sorgusu + bağımsız dismissive stance taşıyan retorik sorular deterministic floor'da sıfır harm bırakabiliyordu.
- PR #201 branch: `codex/issue-200-dismissive-rhetorical-floor`.
- Regression proof test-first RED SHA: `d0671ef98fb45155a835527e08384459425653a5`.
- Fix phrase exact-match kullanmaz; compositional evidence'i mevcut canonical `severity.disrespect`, `challenge`, target, valence ve uncertainty alanlarına map eder.
- Literal bilgi soruları counterexample olarak non-devaluing kalmalıdır.
- Joke frame severity/confidence'i modüle eder; explicit repair/apology semantiği korunur.
- Yeni semantic authority veya provider/API dependency eklenmez.
- Frozen 21/423 Phase-0 baseline ve PR #199 relationship A/B acceptance korunmalıdır.

## 10. Sıradaki doğrulanmış iş
- Önce PR #201 full CI + Architecture Review tamamen yeşil doğrulanacak ve Issue #200 kapanacak.
- Ardından provider-free uzun-horizon relationship progression/persistence hedefi gerçek runtime/persistence seam'leri üzerinden ölçülecek.
- Sonraki hedef memory + relationship combined behavior acceptance'tır.
- Her yeni behavior değişikliği repo'nun RED→GREEN neighbor-proof ve docs guard protokolüne uymalıdır.

## 11. Latest checkpoint
- Date: 2026-09-10
- Base main: `0151e64503d1b2b75603d324159e06d7fa9bd15a` (PR #199 merged).
- Active PR: #201 — dismissive rhetorical semantic-floor characterization/fix.
- Active issue: #200.
- External AI API in deterministic tests: NO.
- New downstream semantic authority: NO.
- Semantic LLM removal: NO.
- Next after #200: long-horizon relationship progression/persistence.
