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

## 5. Bounded local semantic runtime acceptance — ACTIVE
Branch: `codex/local-semantic-bounded-acceptance`.

Deterministic runtime acceptance artık şu üç bounded aileyi canonical L6 üzerinde doğruluyor:
- typed greeting / how_are_you / what_doing routine evidence;
- simple unanimous NEG evidence yalnız aday positive semantic'i block eder, kendi başına yeni semantic invention yapmaz;
- QUES morphology yalnız typed `polarQuestionClause` scope ile information request'e promote edilir.

Counterexamples:
- ambiguous QUES + clause scope yok → promote edilmez, uncertainty artar;
- zero-parse → tamamen abstain eder.

Bu acceptance testleri raw Turkish text parser yazmaz; test mesajı deliberately opaque tutulur ve karar yalnız typed evidence ile kanıtlanır.

## 6. Sıradaki doğrulanmış iş
1. Bounded acceptance FAST/FULL CI ve Architecture Review'u yeşile getirip merge et.
2. L7 provenance audit: typed social routine'ın `lexical/discourse`, NEG'in `morphology`, polar QUES'in `morphology + syntax` kaynağını field-level doğru ayır; yalnız adjudicate edilen field'lara provenance yaz.
3. Sonra L3/L4 observation ailelerini deterministic characterization ile ölç: contextual `yeter`, preference-vs-compliment, inflected interrogatives, target grounding.
4. Yalnız reproducible failure çıkan ailede canonical typed evidence seam aç; phrase-patch/raw parser ekleme.
5. Local coverage acceptance eşiği kanıtlanmadan semantic LLM rolünü azaltma.

## 7. Latest checkpoint
- Date: 2026-09-09
- Current main: `ac9bfa9cc3998167f67bc5ecc17e3b122d6254bb`
- Main FULL CI #2640: PASS
- Active branch: `codex/local-semantic-bounded-acceptance`
- External AI API in deterministic tests: NO
- New regex semantic parser: NO
- Semantic LLM removal: NO
- Active work: bounded acceptance CI → merge → L7 provenance audit
