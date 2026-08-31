import fs from 'node:fs';

const path = 'src/services/behaviorIntegrationEngine.ts';
const text = fs.readFileSync(path, 'utf8');
const old = `  const distance = disengage
    ? 1
    : repairingHold
      ? Math.max(0.68, clamp01(relationshipPressure * 0.55 + withdrawalPressure * 0.25 - b.repairOpenness * 0.1))
      : clamp01(boundaryPressure * 0.5 + relationshipPressure * 0.3 + withdrawalPressure * 0.2 - b.repairOpenness * 0.2);
  const warmth = disengage
    ? 0
    : repairingHold
      ? Math.min(0.24, clamp01(s.affiliationPressure * 0.18 + b.repairOpenness * 0.12))
      : clamp01(s.affiliationPressure * 0.32 + s.carePressure * 0.27 + approachPressure * 0.18 + s.disclosurePressure * 0.08 + b.repairOpenness * 0.15 - distance * 0.55);`;
const replacement = `  const relationshipDistanceFloor = priority === "relationship" ? clamp01(relationshipPressure * 0.48) : 0;
  const relationshipWarmthPenalty = priority === "relationship" ? relationshipPressure * 0.25 : 0;
  const distance = disengage
    ? 1
    : repairingHold
      ? Math.max(0.68, clamp01(relationshipPressure * 0.55 + withdrawalPressure * 0.25 - b.repairOpenness * 0.1))
      : Math.max(
          relationshipDistanceFloor,
          clamp01(boundaryPressure * 0.5 + relationshipPressure * 0.3 + withdrawalPressure * 0.2 - b.repairOpenness * 0.2),
        );
  const warmth = disengage
    ? 0
    : repairingHold
      ? Math.min(0.24, clamp01(s.affiliationPressure * 0.18 + b.repairOpenness * 0.12))
      : clamp01(s.affiliationPressure * 0.32 + s.carePressure * 0.27 + approachPressure * 0.18 + s.disclosurePressure * 0.08 + b.repairOpenness * 0.15 - distance * 0.55 - relationshipWarmthPenalty);`;

if (!text.includes(old)) throw new Error('relationship integration marker missing');
fs.writeFileSync(path, text.replace(old, replacement));
console.log('Applied relationship authority fix');
