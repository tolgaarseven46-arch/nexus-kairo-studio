import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import {
  interpretSemanticEvent,
  type SemanticEvent,
} from "./semanticEventEngine";

interface RealUserTurnFixture {
  turnNumber: number;
  userMessage: string;
  semanticEvent: SemanticEvent;
}

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/kaira27TurnRealUserSession.fixture.json", import.meta.url),
    "utf8",
  ),
) as RealUserTurnFixture[];

function turn14(): RealUserTurnFixture {
  const found = fixture.find((item) => item.turnNumber === 14);
  if (!found) throw new Error("missing Turn 14 fixture");
  return found;
}

function relationalCommand(): SemanticEvent {
  return {
    ...interpretSemanticEvent("seni seviyorum"),
    raw: "sarıl bana",
    normalized: "sarıl bana",
    intent: "command",
    target: "kaira",
    relationalAct: "closeness_bid",
    relationalIntensity: 0.8,
    affection: 0.8,
    worldMemory: { claims: [], query: null },
  };
}

describe("Kaira Turn 14 action-request composition", () => {
  it("keeps the exact benign command as a primary action request instead of collapsing into a relational bid", () => {
    const item = turn14();
    const plan = planDialogueResponse(
      [],
      item.userMessage,
      "Tolga",
      item.semanticEvent,
    );

    expect(item.userMessage).toBe("bana şiir oku");
    expect(item.semanticEvent.intent).toBe("command");
    expect(item.semanticEvent.relationalAct).toBe("closeness_bid");
    expect(plan.move).toBe("respond_to_action_request");
    expect(plan.obligation?.type).toBe("action_request");
  });

  it("preserves relational context when the requested action itself is relational", () => {
    const event = relationalCommand();
    const plan = planDialogueResponse([], event.raw, "Tolga", event);

    expect(plan.move).toBe("respond_to_action_request");
    expect(plan.relationalAct).toBe("closeness_bid");
    expect(plan.obligation?.type).toBe("action_request");
  });
});
