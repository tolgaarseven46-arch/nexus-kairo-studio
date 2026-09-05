from pathlib import Path
import subprocess

path = 'src/services/kairoLocalLanguageEngine.ts'
main_text = subprocess.check_output(['git','show',f'origin/main:{path}'], text=True)
marker = '''  // The dialogue decision must have chosen a trivial move (or be absent for a\n  // direct/legacy call). The local engine never overrides a non-trivial move.\n'''
gate = '''  // Fast local rendering is only for semantically trivial routines. Surface\n  // interrogative form alone is not richness: "nasıl gidiyor" and\n  // "keyifler nasıl" are still local how-are-you routines. Typed knowledge,\n  // causal/relational content, or emotionally loaded third-party turns stay on\n  // the full generation path.\n  if (\n    event.intent === "information_request" ||\n    event.knowledgeQuery ||\n    event.relationalAct !== "none" ||\n    (event.target === "third_party" && event.emotionalLoad >= 0.35)\n  ) return null;\n\n'''
assert marker in main_text
Path(path).write_text(main_text.replace(marker, gate + marker, 1))
