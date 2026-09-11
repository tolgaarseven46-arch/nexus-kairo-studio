const EXPLICIT_ADVICE_RE =
  /\b(?:bence\s+)?(?:erken\s+yat|biraz\s+dinlen|dinlensen\s+\iyi\s+olur|uyusan\s+\iyi\s+olur|ÅŸunu\s+yap|bunu\s+yap|yapmalÄ±sÄ±n|yapmalisin|etmelisin|denemelisin|gitmelisin|kalmalÄ±sÄ±n|kalmalisin|iyi\s+gelir|faydalÄ±\s+olur|mantÄ±klÄ±\s+olur)\b/iu;
const AD_VICE_SUFFIX_RE = /\b[\p{L}]+(?:malÄ±sÄ±n|melisin|malisin)\b/iu;
const NECESSITY_ADVICE_RE =
  /\b(?:[\p{L}]+\s+){0,3}(?:geÃ§men|yapman|gitmen|kalman|yatman|uyuman|dinlenmen)\s+lazÄ±m\b/iu;
const IMPERATIVE_ADVICE_RE =
  /\b(?:biraz\s+|a{Ä±k\ÊÊÙ\™ZİÊÊOÊÎ™[›[Ÿ^]_X]
JÎ—ÊØ™[˜ÙJO×‹Ú]NÂ˜ÛÛœİ“ÓRSSV‘QĞ‘UT—ĞQ’PÑWÔ‘HBˆ×–×ÓWJÊÎ›X\ñ,_Y\ÚJWÊÙZWÊ×^ZWÊÛÛ\—‹Ú]NÂ˜ÛÛœİT‘PÕÔÑS—ĞĞT‘WĞQ’PÑWÔ‘HBˆ×ŠÎ˜Yğï—ÊÊOÊÎ˜š\˜^—
ÊOÚÙ[™[™WÊÊÎ™0í›ŸÙZÛ[ŠJÎ—ÊØš\˜^ŸÊØYğïŠO×‹Ú]NÂ‚‹ÊŠ‚ˆ
ˆİXİ\˜[[]™\™Y]^™XÛÙÛš^™\ˆÛ›Kˆ]Ù\È›İXÚYHÚ]\ˆYšXÙBˆ
ˆ\È\›ÜšX]NÈØZ\˜T™\ÜÛœÙT[ˆİÛœÈ]\›Z\ÜÚ[Û‹ˆ\È™XÛÙÛš^™\ˆÛ›Bˆ
ˆ]XİÈÛX\ˆYšXÙKÛİYÚİ\™˜XÙ\ÈÛÈš[˜[[]™\HØ[ˆ[™›Ü˜ÙHH[‹‚ˆ
‹Â™^Ü[˜İ[Ûˆ\Õ\šÚ\ÚYšXÙPXİ
^ˆİš[™ÊNˆ›ÛÛX[ˆÂˆÛÛœİ›Ü›X[^™YHİš[™Ê^ÏÈˆŠKš[J
NÂˆYˆ
[›Ü›X[^™Y
H™]\›ˆ˜[ÙNÂˆ™]\›ˆ
ˆVPÒUĞQ’PÑWÔ‘K\İ
›Ü›X[^™Y
HˆQ’PÑWÔÕQ‘’VÔ‘K\İ
›Ü›X[^™Y
Hˆ‘PÑTÔÒUWĞQ’PÑWÔ‘K\İ
›Ü›X[^™Y
HˆSTTUU‘WĞQ’PÑWÔ‘K\İ
›Ü›X[^™Y
Hˆ“ÓRSSV‘QĞ‘UT—ĞQ’PÑWÔ‘K\İ
›Ü›X[^™Y
HˆT‘PÕÔÑS—ĞĞT‘WĞQ’PÑWÔ‘K\İ
›Ü›X[^™Y
Bˆ
NÂŸ