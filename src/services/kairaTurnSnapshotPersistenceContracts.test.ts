import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const persistence = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"),
  "utf8",
);

describe("KAIRA per-turn persistence/hydration contracts", () => {
  it("persists the actual before/after state for each runtime turn", () => {
    const beforeMatches = server.match(/dynamicStateBefore:\s*requestState/g) ?? [];
    const afterMatches = server.match(/dynamicStateAfter:\s*kdm\.nextDynamicState/g) ?? [];

    // Both local-language and AI paths must persist the same turn-local state boundary.
    expect(beforeMatches.length).toBeGreaterThanOrEqual(2);
    expect(afterMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("builds each stored turn from that turn payload instead of session summary state", () => {
    expect(persistence).toContain("dynamicStateBefore: payload.dynamicStateBefore");
    expect(persistence).toContain("dynamicStateAfter: payload.dynamicStateAfter");
    expect(persistence).toContain(
      "relationshipState: payload.relationshipState || payload.dynamicStateAfter?.relationship",
    );

    const turnRecordStart = persistence.indexOf("const turnRecord: TestSessionTurnRecord = {");
    const turnRecordEnd = persistence.indexOf("try {", turnRecordStart);
    const turnRecordBlock = persistence.slice(turnRecordStart, turnRecordEnd);

    expect(turnRecordBlock).not.toContain("sessionData.dynamicState");
    expect(turnRecordBlock).not.toContain("lastTurn?.dynamicStateAfter");
  });

  it("hydrates before/after state from each individual turn document", () => {
    expect(persistence).toContain(
      "dynamicStateBefore: normalizeDynamicState(data.dynamicStateBefore) || undefined",
    );
    expect(persistence).toContain(
      "dynamicStateAfter: normalizeDynamicState(data.dynamicStateAfter) || undefined",
    );

    // Session summary may expose only the latest state, but must not overwrite turn records.
    expect(persistence).toContain(
      "lastDynamicState: lastTurn?.dynamicStateAfter || sessionSummary.dynamicState",
    );
  });

  it("sorts restored turns chronologically before deriving the latest snapshot", () => {
    const sortIndex = persistence.indexOf("turns.sort(");
    const lastTurnIndex = persistence.indexOf("const lastTurn = turns[turns.length - 1]");

    expect(sortIndex).toBeGreaterThan(0);
    expect(lastTurnIndex).toBeGreaterThan(sortIndex);
    expect(persistence).toContain("(a.turnNumber || 0) - (b.turnNumber || 0)");
  });

  it("keeps activation values tied to the same turn's after-state", () => {
    expect(persistence).toContain("calmness: payload.dynamicStateAfter.calmness");
    expect(persistence).toContain("anger: payload.dynamicStateAfter.anger");
    expect(persistence).toContain("stress: payload.dynamicStateAfter.stress");
    expect(persistence).toContain("happiness: payload.dynamicStateAfter.happiness");
    expect(persistence).toContain("confidence: payload.dynamicStateAfter.confidence");
    expect(persistence).toContain("surprise: payload.dynamicStateAfter.surprise");
  });
});
