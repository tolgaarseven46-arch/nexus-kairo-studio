# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI durumu ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology L2 typed evidence'tır; semantic truth yalnız L6'da oluşur.
- Downstream raw text reparse / ikinci semantic authority yok.
- Social Appraisal G1→G4, `RelationshipReducer` ve `KairaResponsePlan` ownership sınırları korunur.
- Provider/API deterministic architecture proof yerine kullanılmaz.
- Yeni regex/classifier/phrase patch ancak canonical boundary'deki ölçülmüş failure ile gerekçelendirilir.

## 2. Pre-Gemini language foundation — MERGED
- PR #192 merge: `1605e239355b485164b72f3b70f9c8c8a2f42344`.
- Rich provider-neutral `TurkishMorphologyEvidence` contract, ambiguity/zero-parse preservation, typed L6 adjudicator ve L7 provenance sidecar contract mevcut.

## 3. Local language runtime integration — MERGED
- PR #193 merge: `cb5a1207d8bfba80865fae2bfeb6ae31675912ff`.
- Rich morphology evidence production language-understanding gateway'e bağlandı.
- Legacy morphology aynı rich contract'a adapte edilir.
- Incoming/shared ve semantic-provider interpretation aynı canonical L6 evidence gate'inden geçer.
- Post-merge FULL CI #2638 PASS.

## 4. Morphology analyzer shadow benchmark — MERGED
- PR #194 merge: `ac9bfa9cc3998167f67bc5ecc17e3b122d6254bb`.
- Provider-neutral deterministic benchmark parse rate / zero-parse / ambiguity / expected-feature recall ölçer.
- JS-native frozen proof: yararlı morphology + `kimlerle` zero-parse; production dependency seçilmedi.
- Legacy Zemberek `/lemmas`: `compatibility_only`.
- Rich Zemberek sentence analysis: ölçülmemiş `reference_candidate`.
- Analyzer winner: intentionally NOT SELECTED.
- Post-merge main FULL CI #2640 PASS.

## 5. Bounded local semantic runtime acceptance — MERGED
- PR #195 merge: `4af0b4841db70c7595c816d157ba7fb7235d9e4b`.
- Typed greeting / how_are_you / what_doing routine evidence canonical L6'da kabul edilir.
- Unanimous NEG yalnız existing positive semantic candidate'i block eder; semantic invention yapmaz.
- QUES morphology yalnız typed `polarQuestionClause` scope ile information request'e promote edilir.
- Ambiguous QUES promotion yapılmaz; uncertainty yükselir.
- Zero-parse tamamen abstain eder.
- Post-merge main FULL CI #2642 PASS.

## 6. L7 provenance source-kind audit — ACTIVE
Branch: `codex/l7-provenance-and-language-characterization`.

Implemented:
- typed social-routine provenance artık `discourse` olarak kaydedilir; morphology diye yanlış etiketlenmez;
- unanimous NEG provenance `morphology` olarak kalır;
- typed polar-question promotion field provenance'da ortak `morphology + syntax` evidence olarak kaydedilir;
- yalnız gerçekten adjudicate edilen canonical semantic field'lara sidecar provenance yazılır;
- focused provenance-kind regressions eklendi.

## 7. Remaining deterministic language families — CHARACTERIZED
Current canonical runtime üzerinde yeniden doğrulanan aileler:
- contextual `yeter`: sufficiency/predicate kullanım stop değildir; standalone `yeter` stop request'tir;
- preference-vs-directed `seviyorum`: `kahveyi seviyorum` neutral preference, `seni seviyorum` Kaira-directed positive social act olarak ayrılır;
- inflected interrogatives: `ne yaptın`, `neredeydin`, `kimlerle konuştun`, `neredesin`, `ne yapacaksın` information_request olarak kalır;
- target grounding: narrated dative third-party harm active Kaira-user dyadına sızmaz; explicit second-person harm Kaira target olarak kalır;
- nearby non-question counterexamples korunur.

Bu characterization yeni parser/phrase patch eklemedi; mevcut canonical behavior üzerinde regression proof'tur.

## 8. Validation
- PR #195 Architecture Review: PASS.
- PR #195 FULL CI #2641: PASS.
- PR #195 post-merge main FULL CI #2642: PASS.
- `codex/l7-provenance-and-language-characterization` FAST CI #129: PASS.
- External AI/API deterministic proof içinde kullanılmadı.

## 9. Sıradaki doğrulanmış iş
1. L7 provenance + remaining-family characterization branch için PR aç.
2. FULL CI + Architecture Review green ise merge et.
3. Post-merge main FULL CI doğrula.
4. Yeni reproducible semantic failure yoksa bu pre-Gemini bounded language foundation fazını kapat; analyzer winner seçmeden ve semantic LLM rolünü azaltmadan sonraki ürün hedefine geç.

## 10. Latest checkpoint
- Date: 2026-09-09
- Current main: `4af0b4841db70c7595c816d157ba7fb7235d9e4b`
- Main FULL CI #2642: PASS
- Active branch: `codex/l7-provenance-and-language-characterization`
- Branch FAST CI #129: PASS
- Analyzer winner: NOT SELECTED
- External AI API in deterministic tests: NO
- New regex semantic parser: NO
- Semantic LLM removal: NO
- Active work: PR → FULL/Architecture Review → merge → post-merge main CI
