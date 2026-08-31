from pathlib import Path

path = Path('server.ts')
text = path.read_text(encoding='utf-8')
old = '''        const outcome = await claim.outcome;\n        if (outcome.ok) return res.json(outcome.payload);\n        throw new Error(outcome.errorMessage);\n'''
new = '''        const outcome = await claim.outcome;\n        if (outcome.ok === true) return res.json(outcome.payload);\n        throw new Error(outcome.errorMessage);\n'''
if old not in text:
    raise SystemExit('idempotency wait narrowing anchor not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
