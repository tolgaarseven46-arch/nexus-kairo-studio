import fs from "node:fs";

function patch(path, edits) {
  let source = fs.readFileSync(path, "utf8");
  for (const [from, to, label] of edits) {
    if (!source.includes(from)) throw new Error(`${path}: missing marker ${label}`);
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
}

const projectionPath = "src/services/semanticInterpretationLegacyProjection.ts";
const projection = fs.readFileSync(projectionPath, "utf8");
if (!projection.includes('from "./emotionalLoadPolicy"')) {
  patch(projectionPath, [
    [
      'import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";',
      'import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";\nimport { calibrateProjectedEmotionalLoad } from "./emotionalLoadPolicy";',
      "projection policy import",
    ],
    [
      '    emotionalLoad: Math.max(floor.emotionalLoad, interp.emotionalLoad),',
      '    emotionalLoad: calibrateProjectedEmotionalLoad(interp, floor.emotionalLoad),',
      "projection emotional load gate",
    ],
  ]);
}

const kdmPath = "src/services/kdmConsistencyEngine.ts";
const kdm = fs.readFileSync(kdmPath, "utf8");
if (!kdm.includes('isKdmSalientEmotionalLoad')) {
  patch(kdmPath, [
    [
      'import { analyzeKdmInteractionCanonical } from "./kdmRelationshipReducerBridge";',
      'import { analyzeKdmInteractionCanonical } from "./kdmRelationshipReducerBridge";\nimport { isKdmSalientEmotionalLoad } from "./emotionalLoadPolicy";',
      "kdm policy import",
    ],
    [
      '  if (event.emotionalLoad > 0) return "duygusal_yük";',
      '  if (isKdmSalientEmotionalLoad(event.emotionalLoad)) return "duygusal_yük";',
      "kdm salient threshold",
    ],
  ]);
}

console.log("emotional load calibration applied");
