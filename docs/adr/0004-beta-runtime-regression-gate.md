# ADR 0004 — Beta runtime regression gate kapsamı

- Durum: Accepted
- Tarih: 2026-09-02

## Bağlam

`test:beta` CI içinde tam test paketinden önce çalışan hızlı regression kapısıdır. Mevcut kapı idempotency, uzun oturum, konuşma kalitesi, dil hafızası ve response-plan otoritesini kapsıyordu; ancak beta davranışının artık temel parçası olan epistemic runtime, controlled spontaneity, autonomous-state chat wiring ve beta conversation continuity yalnız tam test paketine bırakılmıştı.

## Karar

Bu dört ileri runtime seam'i `test:beta` komutuna ve `kairaBetaRuntimeGateContracts.test.ts` sözleşmesine ekliyoruz:

- `kairaEpistemicRuntimeContracts.test.ts`
- `kairaControlledSpontaneityIntegrationContracts.test.ts`
- `kairaAutonomousStateChatWiringContracts.test.ts`
- `kairaBetaConversationContinuityRegression.test.ts`

CI sıralaması değişmez: contracts → autonomous runtime → beta gate → full tests → TypeScript → build.

## Sonuçlar

- Kritik ileri davranış regressions tam test paketinden önce görünür.
- Yeni bir beta özelliği bu seam'lerden birini yanlışlıkla `test:beta` dışına çıkarırsa contract testi kırılır.
- Production davranış kodu veya public API değişmez; yalnız doğrulama kapsamı sıkılaşır.
