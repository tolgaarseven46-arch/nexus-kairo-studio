# `main` Branch Protection — kurulum (tek seferlik, insan yapar)

Bu ayarlar dosyayla kodlanamaz; repo yöneticisi GitHub arayüzünden (Settings →
Branches → Add rule, branch pattern: `main`) veya API ile bir kez uygular.
Governance paketi bu ayarlar açılmadan tam çalışmaz.

## Zorunlu ayarlar

- [ ] **Require a pull request before merging** — açık
  - [ ] Required approvals: **1** (insan)
  - [ ] **Dismiss stale pull request approvals when new commits are pushed** — açık
        (architecture-review mekanizma 3'ün GitHub-review yedeği)
  - [ ] **Require review from Code Owners** — açık (`.github/CODEOWNERS`)
- [ ] **Require status checks to pass before merging** — açık
  - [ ] `validate` (CI workflow — mevcut test/lint/build kapısı)
  - [ ] `docs-guard` (CI workflow — riskli değişiklikte PROJECT_STATE/ADR şartı)
  - [ ] `architecture-review` (Architecture Review workflow — commit status context)
  - [ ] **Require branches to be up to date before merging** — açık
- [ ] **Do not allow bypassing the above settings** — açık (admin dahil)
- [ ] **Restrict who can push to matching branches** — doğrudan push kapalı
- [ ] **Allow force pushes** — kapalı
- [ ] **Allow deletions** — kapalı

## Repo genel ayarları

- [ ] `architecture-review-required` adlı **label** oluşturulmuş olmalı
      (workflow etiketi ekler; label yoksa `addLabels` hata verir).
- [ ] Actions → General → Workflow permissions: iş bazlı `permissions:` yeterli;
      gerekirse **Read and write**.
- [ ] Ajan hesapları repoya **write** collaborator olarak eklenmeli ki
      `claude/*` / `codex/*` dalları aynı repoda açılabilsin (fork değil).
- [ ] `/arch-approve` yalnız `OWNER` / `MEMBER` / `COLLABORATOR` ilişkisinden kabul edilir.

## Notlar

- `issue_comment` olayları **her zaman `main`'deki** workflow dosyasıyla çalışır;
  bu yüzden `/arch-approve` akışı ancak governance PR'ı `main`'e girince aktif olur.
- `pull_request` (fork için `pull_request_target` değil) kullanıldı: PR dalından
  gelen kodun yazma yetkili token ile çalışmasını önler.
- Mevcut `.github/workflows/kaira-autonomous-life.yml` bu paket tarafından değiştirilmedi.
