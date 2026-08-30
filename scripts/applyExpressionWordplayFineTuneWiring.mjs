import fs from 'node:fs';

const path = 'src/services/expressionStyleEngine.ts';
let source = fs.readFileSync(path, 'utf8');
source = source.replace('  selfDirected: number;\n  contextInhibition: number;', '  selfDirected: number;\n  wordplay: number;\n  contextInhibition: number;');
source = source.replace('    dominantMode: "absurd" | "irony" | "sarcasm" | "dark" | "affiliative" | "aggressive" | "selfDirected" | null;', '    dominantMode: "absurd" | "irony" | "sarcasm" | "dark" | "affiliative" | "aggressive" | "selfDirected" | "wordplay" | null;');
source = source.replace('    selfDirected: read("expression.humor.selfDirected"),\n    contextInhibition:', '    selfDirected: read("expression.humor.selfDirected"),\n    wordplay: read("expression.humor.wordplay"),\n    contextInhibition:');
source = source.replace('  const playfulContext = /(şaka|komik|gül|haha|hahaha|lol|dalga|eğlen)/.test(text) ? 1 : 0.25;', '  const playfulContext = /(şaka|komik|gül|haha|hahaha|lol|dalga|eğlen|kelime oyunu|laf oyunu|sözcük oyunu)/.test(text) ? 1 : 0.25;');
source = source.replace('    selfDirected: n(profile.selfDirected) * playfulContext * contextGate,\n  };', '    selfDirected: n(profile.selfDirected) * playfulContext * contextGate,\n    wordplay: n(profile.wordplay) * playfulContext * contextGate,\n  };');
if (!source.includes('wordplay: read("expression.humor.wordplay")')) throw new Error('wordplay fine-tune read missing');
if (!source.includes('wordplay: n(profile.wordplay) * playfulContext * contextGate')) throw new Error('wordplay candidate missing');
fs.writeFileSync(path, source);

const testPath = 'src/services/kairaExpressionWordplayFineTuneContracts.test.ts';
const test = `import { describe, expect, it } from 'vitest';\nimport { computeExpressionStyle, expressionStyleFromFineTune } from './expressionStyleEngine';\n\ndescribe('expression wordplay fine-tune wiring', () => {\n  it('reads the CharacterTab wordplay key into the runtime profile', () => {\n    expect(expressionStyleFromFineTune({ 'expression.humor.wordplay': 92 }).wordplay).toBe(92);\n  });\n\n  it('allows wordplay to become the dominant humor mode', () => {\n    const profile = expressionStyleFromFineTune({\n      'expression.humor.absurd': 0,\n      'expression.humor.irony': 0,\n      'expression.humor.sarcasm': 0,\n      'expression.humor.dark': 0,\n      'expression.humor.affiliative': 0,\n      'expression.humor.aggressive': 0,\n      'expression.humor.selfDirected': 0,\n      'expression.humor.wordplay': 100,\n      'expression.humor.contextInhibition': 0,\n    });\n    const response = computeExpressionStyle(profile, 'bir kelime oyunu yap');\n    expect(response.humor.enabled).toBe(true);\n    expect(response.humor.dominantMode).toBe('wordplay');\n    expect(response.humor.strength).toBeGreaterThan(0.5);\n  });\n});\n`;
fs.writeFileSync(testPath, test);
console.log('Wired expression.humor.wordplay into runtime expression style');
