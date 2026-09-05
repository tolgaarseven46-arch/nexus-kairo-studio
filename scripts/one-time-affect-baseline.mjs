import fs from "node:fs";

const path = "src/services/relationshipReducer.ts";
let source = fs.readFileSync(path, "utf8");

const replaceOnce = (from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one marker, found ${count}`);
  source = source.replace(from, to);
};

replaceOnce(
  'import type { AffectiveReactionMode, ConversationRelationshipState } from "../types/nexus";\n',
  'import type { AffectiveReactionMode, ConversationRelationshipState } from "../types/nexus";\nimport { normalizeKairaAffectBaseline, type KairaAffectBaseline } from "./kairaAffectBaseline";\n',
  "affect baseline import",
);

replaceOnce(
  'export interface RelationshipReducerInput {\n  prev: RelationshipReducerPrev;\n  signal: RelationshipTurnSignal;\n  timing: RelationshipReducerTiming;\n  config?: RelationshipReducerConfig;\n}',
  'export interface RelationshipReducerInput {\n  prev: RelationshipReducerPrev;\n  signal: RelationshipTurnSignal;\n  timing: RelationshipReducerTiming;\n  config?: RelationshipReducerConfig;\n  affectBaseline?: Partial<KairaAffectBaseline> | null;\n}',
  "input seam",
);

replaceOnce(
  'const NEUTRAL_AFFECT_BASELINE: RelationshipAffect = { anger: 10, stress: 20, happiness: 70, calmness: 70 };\n\n',
  '',
  "legacy baseline constant",
);

replaceOnce(
  'export function reduceRelationshipTurn(input: RelationshipReducerInput): RelationshipReducerResult {\n  const config = input.config ?? DEFAULT_RELATIONSHIP_REDUCER_CONFIG;\n  const { prev, signal, timing } = input;',
  'export function reduceRelationshipTurn(input: RelationshipReducerInput): RelationshipReducerResult {\n  const config = input.config ?? DEFAULT_RELATIONSHIP_REDUCER_CONFIG;\n  const affectBaseline = normalizeKairaAffectBaseline(input.affectBaseline);\n  const { prev, signal, timing } = input;',
  "baseline normalization",
);

for (const key of ["anger", "stress", "happiness", "calmness"]) {
  replaceOnce(
    `NEUTRAL_AFFECT_BASELINE.${key}`,
    `affectBaseline.${key}`,
    `baseline ${key}`,
  );
}

fs.writeFileSync(path, source);
