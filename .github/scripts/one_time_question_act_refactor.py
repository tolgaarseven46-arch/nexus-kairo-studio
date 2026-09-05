from pathlib import Path

p = Path('src/services/kairaResponsePlan.ts')
s = p.read_text()

import_anchor = 'import { resolveKairaResponsePlan } from "./kairaPlanResolver";\n'
assert import_anchor in s
s = s.replace(import_anchor, import_anchor + 'import { isTurkishQuestionAct } from "./kairaQuestionActRecognizer";\n', 1)

start = s.index('const QUESTION_PUNCTUATION_RE =')
end = s.index('\nconst HUMOR_RE =', start)
replacement = '''export function looksLikeKairaQuestionAct(text: string): boolean {\n  return isTurkishQuestionAct(text);\n}\n'''
s = s[:start] + replacement + s[end:]
p.write_text(s)
