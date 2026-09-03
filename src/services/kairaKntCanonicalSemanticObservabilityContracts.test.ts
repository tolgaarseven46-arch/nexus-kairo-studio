import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const persistence = read("src/services/kdmPersistenceService.ts");
const server = read("server.ts");
const panel = read("src/components/common/KntTurnDebugPanel.tsx");

describe("KNT canonical semantic observability contracts", () => {
  it("persists semantic interpretation, projection and source on the KNT trace schema", () => {
    expect(persistence).toContain("semanticInterpretation?: SemanticInterpretation");
    expect(persistence).toContain("semanticEvent?: unknown");
    expect(persistence).toContain("semanticSource?: string");
  });

  it("writes the exact canonical semantic snapshot on both local and AI KNT delivery paths", () => {
    const kntCalls = server.split("saveKntTrace({").slice(1);
    expect(kntCalls).toHaveLength(2);
    for (const call of kntCalls) {
      const head = call.slice(0, 1500);
      expect(head).toContain("semanticInterpretation: canonicalSemantic.interpretation");
      expect(head).toContain("semanticEvent: canonicalSemantic.event");
      expect(head).toContain("semanticSource: canonicalSemantic.source");
    }
  });

  it("shows semantic source and canonical field summary in one-turn/all-turn copy output", () => {
    expect(panel).toContain("SemanticSource: ${trace?.semanticSource ?? '-'}");
    expect(panel).toContain("Canonical: ${semanticLine(trace)}");
    expect(panel).toContain("intent=${semantic.primaryIntent ?? '-'}");
    expect(panel).toContain("target=${semantic.target ?? '-'}");
    expect(panel).toContain("repair=${facets.repairSignal ?? '-'}");
    expect(panel).toContain("advice=${facets.adviceRequested ?? '-'}");
    expect(panel).toContain("stopQ=${facets.stopQuestions ?? '-'}");
    expect(panel).toContain("stopTalk=${facets.stopTalking ?? '-'}");
    expect(panel).toContain("uncertainty=${typeof uncertainty.overall");
  });

  it("keeps the full canonical semantic payload available under technical details", () => {
    expect(panel).toContain("semanticSource: current?.semanticSource");
    expect(panel).toContain("semanticInterpretation: current?.semanticInterpretation");
    expect(panel).toContain("semanticEvent: current?.semanticEvent");
  });
});
