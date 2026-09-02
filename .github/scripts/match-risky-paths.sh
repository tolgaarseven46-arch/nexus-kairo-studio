#!/usr/bin/env bash
#
# Riskli path eşleştirici — tek kaynak.
# ci.yml (docs-guard) ve architecture-review.yml (classifier) bunu kullanır.
#
# Kullanım:
#   git diff --name-only BASE...HEAD | .github/scripts/match-risky-paths.sh [patterns-file]
#
# Değişen dosyalar stdin'den (satır başına bir yol) okunur.
# Eşleşen varsa: eşleşmeler stdout'a yazılır, çıkış kodu 0.
# Eşleşen yoksa: çıkış kodu 1.
#
# Desen kuralları (basit; minimatch değil):
#   dir/**      -> "dir/" ile başlayan her yol
#   *.ext       -> ".ext" ile biten her yol
#   tam/yol.js  -> birebir eşleşme
set -euo pipefail

PATTERNS_FILE="${1:-.github/architecture-risky-paths.txt}"

if [ ! -f "$PATTERNS_FILE" ]; then
  echo "match-risky-paths: patterns file not found: $PATTERNS_FILE" >&2
  exit 2
fi

# Değişen dosyaları oku (stdin).
CHANGED=()
while IFS= read -r f || [ -n "$f" ]; do
  f="${f%$'\r'}"
  [ -n "$f" ] && CHANGED+=("$f")
done

matched=()
while IFS= read -r raw || [ -n "$raw" ]; do
  line="${raw%%#*}"
  # tüm boşlukları kırp
  line="$(printf '%s' "$line" | tr -d '[:space:]\r')"
  [ -z "$line" ] && continue
  for file in "${CHANGED[@]:-}"; do
    [ -z "$file" ] && continue
    case "$line" in
      */\*\*)
        prefix="${line%\*\*}"
        case "$file" in
          "$prefix"*) matched+=("$file  <=  $line") ;;
        esac
        ;;
      \*.*)
        suffix="${line#\*}"
        case "$file" in
          *"$suffix") matched+=("$file  <=  $line") ;;
        esac
        ;;
      *)
        [ "$file" = "$line" ] && matched+=("$file  <=  $line")
        ;;
    esac
  done
done < "$PATTERNS_FILE"

if [ "${#matched[@]}" -gt 0 ]; then
  printf '%s\n' "${matched[@]}" | sort -u
  exit 0
fi
exit 1
