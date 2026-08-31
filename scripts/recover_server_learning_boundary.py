from pathlib import Path
import subprocess

restored = subprocess.check_output(
    ['git', 'show', '90141777d685890fa1f3ea53484639901db79085:server.ts'],
    text=True,
)
old = '''        consistency = {
          ...localBaseConsistency,
          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0,
          score: Math.max(0, localBaseConsistency.score - localPlanIssues.length * 15),
          issues: [...localBaseConsistency.issues, ...localPlanIssues],
        },
        if (kairaPolicy.persistentUserMemory && consistency.accepted) {
          learnLanguageReply(stateUserId, reply);
        }
        postStart = now();'''
new = '''        consistency = {
          ...localBaseConsistency,
          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0,
          score: Math.max(0, localBaseConsistency.score - localPlanIssues.length * 15),
          issues: [...localBaseConsistency.issues, ...localPlanIssues],
        };
      if (kairaPolicy.persistentUserMemory && consistency.accepted) {
        learnLanguageReply(stateUserId, reply);
      }
      const postStart = now();'''
if old not in restored:
    raise SystemExit('expected broken local learning block not found in intact source')
Path('server.ts').write_text(restored.replace(old, new, 1), encoding='utf-8')
