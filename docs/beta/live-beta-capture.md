# Kaira Live Beta Evidence Capture

Bu araç live beta oturumunu runtime davranışına dokunmadan reproducible evidence paketine dönüştürür.

## Kullanım

Studio çalışırken ve bir beta session tamamlandıktan sonra:

```bash
node scripts/capture-live-beta-session.mjs --session=<sessionId> --tester=<alias> --state=fresh --instance=<kairaInstanceId> --out=beta-session.json
```

Hydrated oturum için `--state=hydrated`; oturum sırasında restart/reload olduysa `--restarted` ekle.

Varsayılan backend `http://localhost:3000` adresidir. Farklı adres için `--base=<url>` kullan.

## Paket içeriği

Araç aşağıdaki kaynakları tek JSON içinde birleştirir:

- gerçek `git rev-parse HEAD` commit SHA;
- `/api/runtime-info` provider/model/persistence bilgisi;
- `/api/test-sessions/:sessionId` gerçek persisted session ve per-turn evidence;
- tester alias;
- fresh/hydrated başlangıç durumu;
- restart/reload bilgisi;
- Kaira instance ID;
- session start/end ve turn count.

Eksik veri tahmin edilmez; `unknown` olarak korunur. Bu paket tek başına production bug ilan etmez. Failure promotion zinciri `live-beta-protocol.md` içindeki capture → ownership → deterministic RED/replay → fix kuralını izler.

## Örnek

```bash
node scripts/capture-live-beta-session.mjs \
  --session=session_test_user_x_kairo_123 \
  --tester=mert-beta-01 \
  --state=hydrated \
  --restarted \
  --instance=kairo \
  --out=beta-session-mert-01.json
```

Windows PowerShell'de aynı komut tek satır olarak çalıştırılabilir.
