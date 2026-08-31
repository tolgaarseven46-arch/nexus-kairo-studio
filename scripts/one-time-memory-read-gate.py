from pathlib import Path

path = Path('server.ts')
text = path.read_text()
replacements = [
    (
        'languageStyleMemory = languageStyleMemorySignal(stateUserId),',
        'languageStyleMemory = languageStyleMemorySignal(stateUserId, kairaPolicy.persistentUserMemory),',
    ),
    (
        '        responsePlan,\n        languageUnderstanding.event,\n      ),',
        '        responsePlan,\n        languageUnderstanding.event,\n        kairaPolicy.persistentUserMemory,\n      ),',
    ),
    (
        '${languageStyleMemoryInstruction(stateUserId)}',
        '${languageStyleMemoryInstruction(stateUserId, kairaPolicy.persistentUserMemory)}',
    ),
]
for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'expected exactly one match for {old!r}, got {count}')
    text = text.replace(old, new, 1)
path.write_text(text)
