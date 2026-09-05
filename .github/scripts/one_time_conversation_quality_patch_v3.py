from pathlib import Path

source = Path('src/services/kairoDialogueDecisionEngine.ts')
text = source.read_text()
old = '  type SemanticRepairSignal,\n  type SemanticSocialRoutine,\n} from "./semanticEventEngine";'
new = '  type SemanticSocialRoutine,\n  type SemanticRepairSignal,\n} from "./semanticEventEngine";'
assert old in text
source.write_text(text.replace(old, new, 1))

runner = Path('.github/scripts/one_time_conversation_quality_patch.py')
code = runner.read_text()
exec(compile(code, str(runner), 'exec'), {'__name__': '__main__'})
Path('.github/scripts/one_time_conversation_quality_patch_v2.py').unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
