const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }

// 1) Appraisal owns qualitative emotion-state deltas.
const appraisalPath = 'src/services/relationshipConditionedAppraisal.ts';
let appraisal = read(appraisalPath);
appraisal = appraisal.replace(
`    priorReactionMode?: AffectiveReactionMode;\n  };\n}`,
`    priorReactionMode?: AffectiveReactionMode;\n  };\n  modulation: {\n    repeatEscalation: number;\n    personalityImpact: number;\n    negativeSensitivity: number;\n    angerTrait: number;\n    toleranceMultiplier: number;\n    forgivenessFactor: number;\n  };\n}`,
);
appraisal = appraisal.replace(
`  reactionTendency: AffectiveReactionMode;\n  rationale: string[];`,
`  reactionTendency: AffectiveReactionMode;\n  emotionDelta: {\n    stress: number;\n    happiness: number;\n    calmness: number;\n    anger: number;\n  };\n  rationale: string[];`,
);
appraisal = appraisal.replace(
`const round3 = (v: number) => Math.round(v * 1000) / 1000;`,
`const round3 = (v: number) => Math.round(v * 1000) / 1000;\nconst towardBaseline = (value: number, baseline: number, maxStep = 1) =>\n  value === baseline ? 0 : value > baseline ? -Math.min(maxStep, value - baseline) : Math.min(maxStep, baseline - value);`,
);
const returnNeedle = `  return {\n    attachmentSalience,\n    accumulatedInjury,\n    arousalPressure,\n    repairReadiness,\n    establishedRelationship,\n    priorRelationshipDamaged,\n    reactionTendency,\n    rationale,\n  };`;
const returnReplacement = `  const m = input.modulation;\n  const neutral = {\n    stress: towardBaseline(i.stress, 20, 1),\n    happiness: 0,\n    calmness: towardBaseline(i.calmness, 70, 1),\n    anger: towardBaseline(i.anger, 10, 1),\n  };\n  const impact = Math.max(0.25, m.repeatEscalation * m.personalityImpact * m.toleranceMultiplier);\n  const angerImpact = Math.max(1, (2 + m.angerTrait / 50) * m.repeatEscalation * m.negativeSensitivity);\n\n  let emotionDelta = neutral;\n  if (reactionTendency === "irritated") {\n    emotionDelta = {\n      stress: Math.max(2, Math.round(3.5 * impact)),\n      happiness: Math.min(-1, Math.round(-2 * impact)),\n      calmness: Math.min(-2, Math.round(-2.5 * impact)),\n      anger: Math.max(2, Math.round(angerImpact)),\n    };\n  } else if (reactionTendency === "hurt") {\n    emotionDelta = {\n      stress: Math.max(2, Math.round(4.5 * impact)),\n      happiness: Math.min(-3, Math.round(-4 * impact)),\n      calmness: Math.min(-2, Math.round(-2 * impact)),\n      anger: Math.max(0, Math.round(angerImpact * 0.45)),\n    };\n  } else if (reactionTendency === "withdrawn") {\n    emotionDelta = {\n      stress: Math.max(2, Math.round(3.5 * impact)),\n      happiness: Math.min(-2, Math.round(-3 * impact)),\n      calmness: Math.min(-1, Math.round(-1.5 * impact)),\n      anger: Math.max(0, Math.round(angerImpact * 0.25)),\n    };\n  } else if (reactionTendency === "repairing") {\n    emotionDelta = {\n      stress: accumulatedInjury >= 0.18 ? -1 : towardBaseline(i.stress, 20, 1),\n      happiness: accumulatedInjury >= 0.18 ? 0 : 1,\n      calmness: 1,\n      anger: -Math.min(2, Math.max(0, i.anger - 10)),\n    };\n  } else if (input.event.kind === "positive") {\n    emotionDelta = { stress: -1, happiness: 2, calmness: 1, anger: towardBaseline(i.anger, 10, 1) };\n  }\n\n  return {\n    attachmentSalience,\n    accumulatedInjury,\n    arousalPressure,\n    repairReadiness,\n    establishedRelationship,\n    priorRelationshipDamaged,\n    reactionTendency,\n    emotionDelta,\n    rationale,\n  };`;
if (!appraisal.includes(returnNeedle)) throw new Error('Appraisal return block not found');
appraisal = appraisal.replace(returnNeedle, returnReplacement);
write(appraisalPath, appraisal);

// 2) KDM passes modulation into appraisal and consumes appraisal-owned deltas.
const kdmPath = 'src/services/kdmConsistencyEngine.ts';
let kdm = read(kdmPath);
kdm = kdm.replace(
`      priorReactionMode: state.reactionMode,\n    },\n  });`,
`      priorReactionMode: state.reactionMode,\n    },\n    modulation: {\n      repeatEscalation,\n      personalityImpact,\n      negativeSensitivity,\n      angerTrait,\n      toleranceMultiplier,\n      forgivenessFactor,\n    },\n  });`,
);
const deltaStart = `  const neutralStress = approachBaseline(state.stress ?? 20, DEFAULT_DYNAMIC_STATE.stress, 1);`;
const deltaEnd = `  const confidenceDelta = intent === "eylem_talebi" ? Math.max(1, Math.round(toleranceMultiplier)) : 0;`;
const startIndex = kdm.indexOf(deltaStart);
const endIndex = kdm.indexOf(deltaEnd);
if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) throw new Error('KDM emotion delta block not found');
kdm = kdm.slice(0, startIndex) + `  const {\n    stress: stressDelta,\n    happiness: happinessDelta,\n    calmness: calmnessDelta,\n    anger: angerDelta,\n  } = relationshipAppraisal.emotionDelta;\n\n` + kdm.slice(endIndex);
write(kdmPath, kdm);

// 3) Dedicated qualitative delta regressions.
write('src/services/relationshipConditionedEmotionDelta.test.ts', `import { describe, expect, it } from "vitest";\nimport { appraiseRelationshipConditionedEvent } from "./relationshipConditionedAppraisal";\n\nconst modulation = {\n  repeatEscalation: 1,\n  personalityImpact: 1,\n  negativeSensitivity: 1,\n  angerTrait: 50,\n  toleranceMultiplier: 1,\n  forgivenessFactor: 1,\n};\n\nfunction input(overrides: any = {}) {\n  return {\n    event: { kind: "negative", targetsKaira: true, redLine: false, repairSignal: false },\n    relationship: {\n      closeness: 30, familiarityDays: 1, interactionCount: 2, warmth: 50, trust: 50,\n      relationshipQuality: 50, conflict: 5, hurt: 5, repairProgress: 0,\n      priorConversationState: "active", conversationState: "active",\n    },\n    internalState: { anger: 10, stress: 20, calmness: 70 },\n    modulation,\n    ...overrides,\n  } as any;\n}\n\ndescribe("relationship-conditioned emotion delta authority", () => {\n  it("maps irritated toward anger-dominant activation", () => {\n    const result = appraiseRelationshipConditionedEvent(input());\n    expect(result.reactionTendency).toBe("irritated");\n    expect(result.emotionDelta.anger).toBeGreaterThan(result.emotionDelta.stress - 2);\n    expect(result.emotionDelta.anger).toBeGreaterThan(0);\n    expect(result.emotionDelta.calmness).toBeLessThan(0);\n  });\n\n  it("maps close-relationship hurt toward sadness/stress rather than anger", () => {\n    const result = appraiseRelationshipConditionedEvent(input({\n      relationship: { closeness: 80, familiarityDays: 30, interactionCount: 60, warmth: 80, trust: 80, relationshipQuality: 85, conflict: 5, hurt: 8, repairProgress: 0, priorConversationState: "active", conversationState: "active" },\n    }));\n    expect(result.reactionTendency).toBe("hurt");\n    expect(Math.abs(result.emotionDelta.happiness)).toBeGreaterThan(result.emotionDelta.anger);\n    expect(result.emotionDelta.stress).toBeGreaterThan(0);\n  });\n\n  it("maps damaged relationship withdrawal to low outward anger", () => {\n    const result = appraiseRelationshipConditionedEvent(input({\n      relationship: { closeness: 55, familiarityDays: 30, interactionCount: 60, warmth: 35, trust: 35, relationshipQuality: 35, conflict: 40, hurt: 45, repairProgress: 0, priorConversationState: "distancing", conversationState: "distancing" },\n    }));\n    expect(result.reactionTendency).toBe("withdrawn");\n    expect(result.emotionDelta.anger).toBeLessThan(result.emotionDelta.stress);\n  });\n\n  it("maps active repair toward de-escalation instead of fresh activation", () => {\n    const result = appraiseRelationshipConditionedEvent(input({\n      event: { kind: "neutral", targetsKaira: false, redLine: false, repairSignal: true },\n      relationship: { closeness: 70, familiarityDays: 30, interactionCount: 60, warmth: 60, trust: 60, relationshipQuality: 65, conflict: 25, hurt: 30, repairProgress: 25, priorConversationState: "repairing", conversationState: "repairing" },\n      internalState: { anger: 25, stress: 35, calmness: 55, priorReactionMode: "withdrawn" },\n    }));\n    expect(result.reactionTendency).toBe("repairing");\n    expect(result.emotionDelta.anger).toBeLessThanOrEqual(0);\n    expect(result.emotionDelta.stress).toBeLessThanOrEqual(0);\n    expect(result.emotionDelta.calmness).toBeGreaterThan(0);\n  });\n});\n`);

// 4) Architecture contract: KDM may consume but must not re-derive qualitative deltas.
write('src/services/kairaRelationshipEmotionDeltaAuthorityContracts.test.ts', `import { describe, expect, it } from "vitest";\nimport { readFileSync } from "node:fs";\n\ndescribe("relationship emotion delta authority contracts", () => {\n  it("keeps qualitative emotion deltas owned by relationship appraisal", () => {\n    const appraisal = readFileSync("src/services/relationshipConditionedAppraisal.ts", "utf8");\n    const kdm = readFileSync("src/services/kdmConsistencyEngine.ts", "utf8");\n    expect(appraisal).toContain("emotionDelta:");\n    expect(appraisal).toContain('reactionTendency === "irritated"');\n    expect(appraisal).toContain('reactionTendency === "hurt"');\n    expect(appraisal).toContain('reactionTendency === "withdrawn"');\n    expect(appraisal).toContain('reactionTendency === "repairing"');\n    expect(kdm).toContain("relationshipAppraisal.emotionDelta");\n    expect(kdm).not.toContain('if (kind === "negative" && targetsKaira) {\\n    stressDelta');\n  });\n});\n`);

// 5) Existing direct appraisal contracts now provide the typed modulation boundary explicitly.
const existingContractPath = 'src/services/kairaRelationshipConditionedAppraisalContracts.test.ts';
let existingContract = read(existingContractPath);
if (!existingContract.includes('const modulation = {')) {
  existingContract = existingContract.replace(
    'const internalState = { anger: 10, stress: 20, calmness: 70 };',
    'const internalState = { anger: 10, stress: 20, calmness: 70 };\nconst modulation = { repeatEscalation: 1, personalityImpact: 1, negativeSensitivity: 1, angerTrait: 50, toleranceMultiplier: 1, forgivenessFactor: 1 };',
  );
}
existingContract = existingContract.replace(/, internalState \}\);/g, ', internalState, modulation });');
existingContract = existingContract.replace(
  'internalState: { anger: 95, stress: 90, calmness: 10 } });',
  'internalState: { anger: 95, stress: 90, calmness: 10 }, modulation });',
);
write(existingContractPath, existingContract);
