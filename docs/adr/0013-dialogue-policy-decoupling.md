# ADR-0013: Dialogue repair policy requires typed repair evidence

- **Durum:** Accepted
- **Tarih:** 2026-09-03
- **Karar veren:** Tolga / ChatGPT
- **İlgili PR:** #36

## Bağlam

ADR-0012 ile bir user turn'ün canonical semantic truth'u `SemanticInterpretation@2` olarak tekilleştirildi. Ancak semantic authority'nin tek olması, semantic içerik etiketlerinin doğrudan davranış kararı vermesini engellemiyordu.

C2 incelemesinde `complaint/confusion` içeriğinin iki ayrı yoldan `repair_or_rephrase` politikasını zorlayabildiği bulundu:

1. `DiscourseState`, `complaint` sosyal-act sınıfını otomatik olarak önceki Kaira turuna bağlı `clarification` dependency'sine dönüştürüyordu.
2. `DialogueDecisionEngine`, `confusion_or_challenge` sınıfını yalnızca hemen önce Kaira konuşmuş olmasına bakarak doğrudan `repair_or_rephrase` hareketine dönüştürüyordu.

Bu yapı, "mesaj ne içeriyor?" sınıflandırması ile "Kaira şimdi ne yapmalı?" politika kararını birbirine bağlıyordu. Aynı içerik etiketi farklı konuşma bağlamlarında farklı davranış gerektirebileceği için bu coupling yapısal olarak yanlıştı.

## Karar

Dialogue repair policy yalnızca **explicit typed repair evidence** ile etkinleşir.

Canonical `repairSignal` şu anda repair politikasının typed evidence alanıdır. `repairSignal !== "none"` olmadığı sürece `complaint`, `confusion_or_challenge` veya benzeri content/classification etiketleri tek başına `repair_or_rephrase` kararı veremez.

### Kurallar

1. `complaint` bir içerik/social-act sınıfıdır; kendi başına previous-turn clarification dependency oluşturmaz.
2. `confusion_or_challenge` bir discourse content sınıfıdır; kendi başına repair policy oluşturmaz.
3. `DiscourseState` yalnız typed `repairSignal` veya bağımsız gerçek turn-taking kanıtlarından dependency üretir.
4. `responseKind === "clarification"` tek başına repair kararı için yeterli değildir; current canonical turn ayrıca non-`none` typed `repairSignal` taşımalıdır.
5. `DialogueDecisionEngine`, `repair_or_rephrase` hareketini yalnız non-`none` typed `repairSignal` ve gerçek immediate-Kaira context birlikte bulunduğunda seçer.
6. `clarification_request` ve `relevance_challenge` mevcut typed repair davranışlarını korur.
7. Content semantic alanları downstream policy için kanıt olabilir; karar otoritesi değildir.

## Negatif mimari kanıt

Contract/regression testleri şunları kilitler:

- adjacent Kaira turn + `complaint/confusion_or_challenge` + `repairSignal=none` → `repair_or_rephrase` **değil**;
- generic complaint content tek başına `previousTurnDependency=clarification` üretemez;
- typed `clarification_request` / `relevance_challenge` repair davranışını korur;
- aynı konuşma şekli content-only complaint ile explicit repair arasında farklı policy sonucu üretir.

## Etkilenen seam'ler

- `src/services/discourseStateReducer.ts`
- `src/services/kairoDialogueDecisionEngine.ts`
- `src/services/kairaDialoguePolicyDecouplingContracts.test.ts`
- `src/services/kairaDialoguePolicyDecouplingRegression.test.ts`

## Kapsam dışı

- repetition guard
- emotionalLoad policy / threshold calibration
- semantic producer veya `SemanticInterpretation@2` schema değişiklikleri
- relationship semantics

Bu konular ayrı causal change olarak ele alınmalıdır.
