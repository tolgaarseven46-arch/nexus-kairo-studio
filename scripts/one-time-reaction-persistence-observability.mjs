import { readFileSync, writeFileSync } from 'node:fs';

// KDM: let qualitative reactions decay with real residual relationship injury instead of
// disappearing on the first neutral turn.
const kdmPath = 'src/services/kdmConsistencyEngine.ts';
let kdm = readFileSync(kdmPath, 'utf8');
const neutralNeedle = `  } else {\n    conflictAfter = clamp(conflictAfter - healingRate);\n    repairAfter = baseRepair;\n  }`;
const neutralReplacement = `  } else {\n    conflictAfter = clamp(conflictAfter - healingRate);\n    hurtAfter = clamp(hurtAfter - healingRate * 0.5);\n    repairAfter = baseRepair;\n  }`;
if (!kdm.includes('hurtAfter = clamp(hurtAfter - healingRate * 0.5)')) {
  if (!kdm.includes(neutralNeedle)) throw new Error('neutral healing block not found');
  kdm = kdm.replace(neutralNeedle, neutralReplacement);
}

const reactionNeedle = `        : unresolvedHurt\n          ? "hurt"\n          : "neutral";`;
const reactionReplacement = `        : kind === "neutral" && !repairSignal &&\n          (state.reactionMode === "hurt" || state.reactionMode === "irritated") &&\n          (hurtAfter >= 2 || conflictAfter >= 2)\n          ? state.reactionMode\n          : unresolvedHurt\n            ? "hurt"\n            : "neutral";`;
if (!kdm.includes('(state.reactionMode === "hurt" || state.reactionMode === "irritated")')) {
  if (!kdm.includes(reactionNeedle)) throw new Error('reaction persistence insertion point not found');
  kdm = kdm.replace(reactionNeedle, reactionReplacement);
}
writeFileSync(kdmPath, kdm);

// TestLab debug: expose the canonical qualitative reaction explicitly.
const uiPath = 'src/components/studio/tabs/TestLabTab.tsx';
let ui = readFileSync(uiPath, 'utf8');
ui = ui.replace(
  `  currentMood: {\n    moodText: string;\n    reasonText: string;\n  };`,
  `  currentMood: {\n    moodText: string;\n    reasonText: string;\n    reactionMode?: string;\n  };`,
);
ui = ui.replace(
  `      statusText: string;\n      reactionText: string;\n    };`,
  `      statusText: string;\n      reactionText: string;\n      reactionMode?: string;\n    };`,
);
ui = ui.replace(
  `        statusText: 'Sıcak ve destekleyici',\n        reactionText: 'Kullanıcının duygusal durumuna odaklanıldı.',`,
  `        statusText: 'Sıcak ve destekleyici',\n        reactionText: 'Kullanıcının duygusal durumuna odaklanıldı.',\n        reactionMode: 'neutral',`,
);
const snapshotNeedle = `        reactionText:\n          serverState.lastEvent?.reactionText ||\n          (canonicalEvent\n            ? \`Semantic: \${canonicalEvent.intent}, hedef=\${canonicalEvent.target}\`\n            : 'KDM yanıtı uygulandı.'),\n      };`;
const snapshotReplacement = `        reactionText:\n          serverState.lastEvent?.reactionText ||\n          (canonicalEvent\n            ? \`Semantic: \${canonicalEvent.intent}, hedef=\${canonicalEvent.target}\`\n            : 'KDM yanıtı uygulandı.'),\n        reactionMode: serverState.reactionMode || serverTrace?.currentMood?.reactionMode || 'neutral',\n      };`;
if (!ui.includes('reactionMode: serverState.reactionMode || serverTrace?.currentMood?.reactionMode')) {
  if (!ui.includes(snapshotNeedle)) throw new Error('TestLab emotion snapshot insertion point not found');
  ui = ui.replace(snapshotNeedle, snapshotReplacement);
}
const statusNeedle = `                      {lastAnalysis.emotionAfter.statusText}\n                    </span>\n                  </div>`;
const statusReplacement = `                      {lastAnalysis.emotionAfter.statusText}\n                    </span>\n                    {lastAnalysis.emotionAfter.reactionMode && (\n                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">\n                        Tepki: {lastAnalysis.emotionAfter.reactionMode}\n                      </span>\n                    )}\n                  </div>`;
if (!ui.includes('Tepki: {lastAnalysis.emotionAfter.reactionMode}')) {
  if (!ui.includes(statusNeedle)) throw new Error('TestLab current-state badge insertion point not found');
  ui = ui.replace(statusNeedle, statusReplacement);
}
writeFileSync(uiPath, ui);
