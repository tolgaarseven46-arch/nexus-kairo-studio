import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/services/kdmConsistencyEngine.ts';
let source = readFileSync(path, 'utf8');

const needle = `  if (kind === "negative") {\n    const severityBoost = semanticEvent.redLine ? 1.35 : semanticEvent.severity >= 0.8 ? 1.15 : 1;\n    conflictAfter = clamp(conflictAfter + 8 * repeatEscalation * personalityImpact * severityBoost);\n    hurtAfter = clamp(hurtAfter + 12 * repeatEscalation * personalityImpact * severityBoost);\n    repairAfter = clamp(repairAfter - 8 * repeatEscalation * personalityImpact * severityBoost);`;
const replacement = `  if (kind === "negative") {\n    const severityBoost = semanticEvent.redLine ? 1.35 : semanticEvent.severity >= 0.8 ? 1.15 : 1;\n    // Established, healthy relationships may absorb ordinary conflict better, but\n    // red-line violations remain strongly injurious regardless of familiarity.\n    const relationshipInjuryMultiplier = semanticEvent.redLine\n      ? Math.max(0.85, toleranceMultiplier)\n      : Math.max(0.5, toleranceMultiplier);\n    conflictAfter = clamp(conflictAfter + 8 * repeatEscalation * personalityImpact * severityBoost * relationshipInjuryMultiplier);\n    hurtAfter = clamp(hurtAfter + 12 * repeatEscalation * personalityImpact * severityBoost * relationshipInjuryMultiplier);\n    repairAfter = clamp(repairAfter - 8 * repeatEscalation * personalityImpact * severityBoost * relationshipInjuryMultiplier);`;

if (!source.includes('relationshipInjuryMultiplier')) {
  if (!source.includes(needle)) throw new Error('negative injury block not found');
  source = source.replace(needle, replacement);
}
writeFileSync(path, source);
