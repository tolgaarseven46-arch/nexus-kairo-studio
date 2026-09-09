# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI durumu ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz.
>
> Ayrıntılı geçmiş Git history, `AI_CHANGELOG.md`, `docs/adr/` ve `docs/audits/` altında korunur. Bu dosya yalnız aktif mimari gerçek + kapanmış fazlar + sıradaki ölçülebilir işi tutar.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology L2 typed evidence'tır; semantic truth yalnız L6'da oluşur.
- Downstream raw text reparse / ikinci semantic authority yok.
- Social Appraisal G1→G4, `RelationshipReducer` ve `KairaResponsePlan` ownership sınırları korunur.
- Provider/API deterministic architecture proof yerine kullanılmaz.
- Yeni regex/classifier/phrase patch ancak canonical boundary'deki ölçülmüş failure ile gerekçelendirilir.

## 2. Kapanmış temel fazlar
- Single semantic authority / canonical-only rollout.
- World-memory / self / autobiography ownership sınırları.
- Dialogue obligations ve final-delivery fail-closed zinciri.
- Autonomous Life production recovery.
- Social Appraisal G1→G4 production wiring.
- Natural Characterization v2 deterministic product-failure pass.

## 3. Pre-Gemini Turkish language foundation — MERGED
- PR #192 merge SHA: `1605e239355b485164b72f3b70f9c8c8a2f42344`.
- Rich provider-neutral `TurkishMorphologyEvidence` L2 contract mevcut.
- Ambiguity + explicit zero-parse korunur.
- Typed L6 adjudicator raw text okumadan typed evidence tüketir.
- Field-level semantic provenance sidecar contract mevcut.
- Production analyzer seçilmedi; semantic LLM kaldırılmadı.

## 4. Local language runtime integration — MERGED
- PR #193 merge SHA: `cb5a1207d8bfba80865fae2bfeb6ae31675912ff`.
- Rich `MorphologyEvidenceProvider` production language-understanding gateway'e bağlandı.
- Legacy morphology aynı rich evidence contract'a adapte edilerek L6'ya girer.
- Incoming/client-shared ve semantic-provider interpretation aynı canonical L6 evidence gate'inden geçer.
- Runtime `semanticFieldProvenance` yalnız morphology ile adjudicate edilen alanları sidecar olarak kaydeder.
- Zero-parse ve ambiguity abstention runtime'da korunur.
- Post-merge main FULL CI #2638: PASS (architecture/autonomous/beta/Phase-0/historical/full tests/TypeScript/build).

## 5. Morphology analyzer shadow benchmark — ACTIVE
Branch: `codex/morphology-shadow-benchmark`.

Eklenen provider-neutral benchmark:
- parse rate;
- zero-parse rate;
- ambiguity rate;
- frozen expected-feature recall;
- operational profile: process boundary, token-vs-sentence granularity, competing analyses, sentence disambiguation, production dependency acceptance.

Frozen deterministic evidence:
- JS-native `nlptoolkit-morphologicalanalysis@1.0.20` proof: NEG/DAT/INS/LOC/QUES/PAST/FUT/A2SG gibi yararlı typed evidence üretmişti; `kimlerle` explicit zero-parse kaldı.
- Bu sonuç package'ı production dependency yapmak için yeterli kabul edilmedi; candidate `shadow_candidate` olarak kalır.
- Mevcut legacy Zemberek `/lemmas` wrapper per-token service boundary + lemma-only olduğu için `compatibility_only` sınıfındadır.
- Zemberek rich sentence analysis competing analyses + sentence disambiguation sunabildiği için ölçülmemiş `reference_candidate` olarak kalır; live benchmark sonucu yokmuş gibi davranılmaz.
- Benchmark semantic authority vermez; yalnız provider seçimi için evidence üretir.

## 6. Sıradaki doğrulanmış iş
1. Shadow benchmark branch FAST CI'ı doğrula ve hataları düzelt.
2. PR gate aç; FULL CI + Architecture Review yeşilse merge et.
3. Post-merge main FULL CI doğrula.
4. Ardından bounded local semantic coverage'ı deterministic characterization ile ölç: greeting/how_are_you/what_doing, simple negation, polar question.
5. Eksik L7 field provenance coverage'ı ölç ve yalnız gerçekten adjudicate edilen semantic alanlarda genişlet.
6. L3/L4 observation aileleri (`yeter`, preference-vs-compliment, inflected interrogatives, target grounding) yalnız reproducible failure çıkarsa typed evidence seam'inde ele alınır.
7. Local coverage acceptance eşiği kanıtlanmadan semantic LLM rolü azaltılmaz.

## 7. Latest checkpoint
- Date: 2026-09-09
- Current main: `cb5a1207d8bfba80865fae2bfeb6ae31675912ff`
- Main FULL CI #2638: PASS
- Active branch: `codex/morphology-shadow-benchmark`
- Analyzer winner: NOT SELECTED
- External AI API in deterministic tests: NO
- New regex semantic parser: NO
- Semantic LLM removal: NO
- Active work: benchmark CI → PR → merge → bounded local semantic characterization
