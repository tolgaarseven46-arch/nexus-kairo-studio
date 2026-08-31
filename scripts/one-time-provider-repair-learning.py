from pathlib import Path
path = Path('server.ts')
text = path.read_text(encoding='utf-8')
old = '''        if (repairedIssues.length < groundingIssues.length) {
          reply = repairedReply;
          groundingIssues = repairedIssues;
          activeAiProviderUsed = repairedGeneration.providerUsed;
        }
'''
new = '''        if (repairedIssues.length < groundingIssues.length) {
          reply = repairedReply;
          groundingIssues = repairedIssues;
          activeAiProviderUsed = repairedGeneration.providerUsed;
          providerFailureFallbackUsed = false;
        }
'''
if old not in text:
    raise SystemExit('repair acceptance seam not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
