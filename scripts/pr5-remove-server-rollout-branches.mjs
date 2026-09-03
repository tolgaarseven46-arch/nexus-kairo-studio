import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

// One-shot migration helper for ADR-0006 PR5. Remove after the branch is rewritten.
const path = 'server.ts';
const source = readFileSync(path, 'utf8');
const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const FLAG_VARS = new Set(['canonicalPromptOn', 'unifiedGuardOn']);
const edits = [];
let conditionalCount = 0;

function visit(node) {
  if (
    ts.isConditionalExpression(node) &&
    ts.isIdentifier(node.condition) &&
    FLAG_VARS.has(node.condition.text)
  ) {
    edits.push({
      start: node.getStart(sf),
      end: node.getEnd(),
      text: node.whenTrue.getText(sf),
    });
    conditionalCount += 1;
    return;
  }
  ts.forEachChild(node, visit);
}
visit(sf);

if (conditionalCount < 4) {
  throw new Error(`Expected at least 4 rollout conditional expressions, found ${conditionalCount}`);
}

let next = source;
for (const edit of edits.sort((a, b) => b.start - a.start)) {
  next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
}

next = next.replace(
  /^import \{ isCanonicalBehaviorFlagEnabled \} from "\.\/src\/config\/canonicalBehaviorFlags";\r?\n/m,
  '',
);

const declarationPatterns = [
  /\s*canonicalPromptOn\s*=\s*isCanonicalBehaviorFlagEnabled\("CANONICAL_PROMPT_BUILDER"\),\s*/u,
  /\s*unifiedGuardOn\s*=\s*isCanonicalBehaviorFlagEnabled\("UNIFIED_GUARD_PASS"\),\s*/u,
];
for (const pattern of declarationPatterns) {
  if (!pattern.test(next)) throw new Error(`Expected rollout declaration not found: ${pattern}`);
  next = next.replace(pattern, '\n      ');
}

for (const forbidden of [
  'isCanonicalBehaviorFlagEnabled',
  'CANONICAL_PROMPT_BUILDER',
  'UNIFIED_GUARD_PASS',
  'canonicalPromptOn',
  'unifiedGuardOn',
]) {
  if (next.includes(forbidden)) throw new Error(`Server cleanup incomplete; still contains ${forbidden}`);
}

writeFileSync(path, next);
console.log(`PR5 server codemod complete; canonicalized ${conditionalCount} rollout branches.`);
