from pathlib import Path

p = Path('src/services/languageUnderstandingService.ts')
s = p.read_text()
old = '''  const reconciledInterpretation = reconcileSemanticTargetWithEntityResolution(interpretation, entityResolution);\n  const projected = projectSemanticEvent(reconciledInterpretation);\n  const grounded = groundSemanticEventForAppraisal(message, projected, entityResolution);\n  return {\n    interpretation: reconciledInterpretation,\n'''
new = '''  interpretation = reconcileSemanticTargetWithEntityResolution(interpretation, entityResolution);\n  const projected = projectSemanticEvent(interpretation);\n  const grounded = groundSemanticEventForAppraisal(message, projected, entityResolution);\n  return {\n    interpretation,\n'''
assert old in s
p.write_text(s.replace(old, new, 1))
