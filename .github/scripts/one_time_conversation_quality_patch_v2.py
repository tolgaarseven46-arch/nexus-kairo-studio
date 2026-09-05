from pathlib import Path

runner = Path('.github/scripts/one_time_conversation_quality_patch.py')
text = runner.read_text()
old = '  type SemanticRepairSignal,\n} from "./semanticEventEngine";'
new = '  type SemanticRepairSignal,\n  type SemanticSocialRoutine,\n} from "./semanticEventEngine";'
assert old in text
text = text.replace(old, new, 1)
old = "s=rep(s, '  type SemanticRepairSignal,\\n  type SemanticSocialRoutine,\\n} from \"./semanticEventEngine\";', '  type SemanticRepairSignal,\\n  type RelationalAct,\\n} from \"./semanticEventEngine\";')"
new = "s=rep(s, '  type SemanticRepairSignal,\\n  type SemanticSocialRoutine,\\n} from \"./semanticEventEngine\";', '  type SemanticRepairSignal,\\n  type SemanticSocialRoutine,\\n  type RelationalAct,\\n} from \"./semanticEventEngine\";')"
assert old in text
text = text.replace(old, new, 1)
runner.write_text(text)
exec(compile(text, str(runner), 'exec'), {'__name__': '__main__'})
Path(__file__).unlink(missing_ok=True)
