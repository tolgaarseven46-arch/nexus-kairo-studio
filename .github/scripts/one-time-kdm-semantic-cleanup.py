from pathlib import Path
import re

path = Path('src/services/kdmConsistencyEngine.ts')
text = path.read_text()

for line in [
    'import { normalizeKairoLanguageInput } from "./kairoLanguageNormalizer";\n',
    'import { hasLocalLowMoodExpression } from "./kairoEmotionalLanguage";\n',
    'import { isConfusionOrChallenge } from "./kairoDialogueChaosEngine";\n',
]:
    if line not in text:
        raise SystemExit(f'missing expected legacy import: {line.strip()}')
    text = text.replace(line, '', 1)

pattern = re.compile(
    r'\nfunction analysisText\(message: string\) \{.*?\nfunction semanticIntentToKdm\(event: SemanticEvent\): string \{',
    re.S,
)
replacement = '\nfunction semanticIntentToKdm(event: SemanticEvent): string {'
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'expected one legacy classifier block, replaced {count}')

if 'function classifyIntent(' in text or 'function classifySentiment(' in text:
    raise SystemExit('legacy classifiers remain')

path.write_text(text)
