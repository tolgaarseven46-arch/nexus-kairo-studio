## Özet

<!-- Ne değişti, neden? -->

## Ajan

- [ ] `agent:claude` **veya** `agent:codex` etiketi eklendi
- [ ] Dal adı `claude/*` **veya** `codex/*`
- [ ] Commit mesajlarında `Agent: claude|codex` trailer'ı var

## Doküman katmanları

- [ ] Davranış/mimari değişti → `PROJECT_STATE.md`'ye yeni state eklendi **veya** yeni `docs/adr/NNNN-*.md`
- [ ] Public arayüz / tip / şema / sağlayıcı seam'i değişti → `AI_CHANGELOG.md`'ye en üstten satır eklendi
- [ ] Kabul edilmiş bir ADR ile çelişki yok (varsa: yeni ADR + eski ADR `Superseded by`)
- [ ] `PROJECT_STATE.md`'ye dokunulduysa UTF-8 + LF metin, binary değil

## Architecture review

- [ ] Riskli path'e dokunuldu mu? (`.github/architecture-risky-paths.txt`)
  - Evetse: `architecture-review-required` etiketi bekleniyor ve merge, güncel head
    SHA için `/arch-approve <sha>` insan onayı gerektirir.
  - Yeni commit push'ladıysam önceki architecture review **geçersiz** oldu; yeniden onay gerekir.

## Güvenlik

- [ ] `.env` içeriği / sır **değeri** hiçbir dosyaya, log'a, PR metnine yazılmadı (yalnız ad geçebilir)
- [ ] `firestore.rules` / `firestore.indexes.json` değiştiyse `docs/adr/0003` gözden geçirildi; insan onayı olmadan deploy yok

## Doğrulama

- [ ] `npm install --ignore-scripts`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
