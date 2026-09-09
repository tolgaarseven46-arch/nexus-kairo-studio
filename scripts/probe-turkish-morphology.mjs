import { FsmMorphologicalAnalyzer } from "nlptoolkit-morphologicalanalysis";

const analyzer = new FsmMorphologicalAnalyzer();

const frozenSurfaces = [
  "dilemiyorum",
  "arkadaşına",
  "senle",
  "seninle",
  "sende",
  "mi",
  "mı",
  "mu",
  "mü",
  "neredeydin",
  "kimlerle",
  "yaptın",
  "yapacaksın",
];

function analysesFor(surface) {
  const parses = analyzer.morphologicalAnalysis(surface);
  const analyses = [];
  for (let i = 0; i < parses.size(); i += 1) {
    const parse = parses.getFsmParse(i);
    analyses.push(parse.getTransitionList());
  }
  return analyses;
}

const results = frozenSurfaces.map((surface) => ({
  surface,
  analyses: analysesFor(surface),
}));

console.log("KAIRA_MORPHOLOGY_PROOF_BEGIN");
console.log(JSON.stringify({
  package: "nlptoolkit-morphologicalanalysis@1.0.20",
  surfaces: results,
}, null, 2));
console.log("KAIRA_MORPHOLOGY_PROOF_END");
