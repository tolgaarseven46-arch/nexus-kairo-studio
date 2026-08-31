import fs from 'node:fs';

const path = 'src/services/kairaExpressionPolicyHintsContracts.test.ts';
let source = fs.readFileSync(path, 'utf8');
source = source.replace("import { computeExpressionStyle, DEFAULT_EXPRESSION_STYLE_PROFILE } from './expressionStyleEngine';\n", "import type { ExpressionStyleResponse } from './expressionStyleEngine';\n");
source = source.replace("    const expression = computeExpressionStyle({ ...DEFAULT_EXPRESSION_STYLE_PROFILE, irony: 100, absurd: 0, sarcasm: 0, dark: 0, affiliative: 0, aggressive: 0, selfDirected: 0, wordplay: 0, informality: 90, emotionalDisplay: 80 }, 'şaka yapalım');\n", "    const expression = { humor: { enabled: true, dominantMode: 'irony', strength: 0.8 }, speech: { brevity: 0.4, informality: 0.9, emotionalDisplay: 0.8, questionDrive: 0.5 }, inhibition: 0.1, legacyTraits: {} } as ExpressionStyleResponse;\n");
if (!source.includes("dominantMode: 'irony'")) throw new Error('fixture patch failed');
fs.writeFileSync(path, source);
console.log('Corrected expression policy contract fixture to test transport boundary directly');
