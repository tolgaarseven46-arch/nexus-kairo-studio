import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import {
  buildDiscourseObservationalInstruction,
  reduceDiscourseState,
} from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import type { SemanticEvent } from "./semanticEventEngine";

interface RealUserTurnFixture {
  turnNumber: number;
  userMessage: string;
  assistantReply: string;
  semanticEvent: SemanticEvent;
}

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/kaira27TurnRealUserSession.fixture.json", import.meta.url),
    "utf8",
  ),
) as RealUserTurnFixture[];

function turn(number: number): RealUserTurnFixture {
  const found = fixture.find((item) => item.turnNumber === number);
  if (!found) throw new Error(`missing real-user fixture turn ${number}`);
  return found;
}

describe("Kaira 27-turn real-user Active Discourse GoldenSession", () => {
  it("preserves the exact 27-turn source ordering", () => {
    expect(fixture).toHaveLength(27);
    expect(fixture.map((item) => item.turnNumber)).toEqual(
      Array.from({ length: 27 }, (_, index) => index + 1),
    );
  });

  it("Turn 3 treats a grounded current-user event as complete same-turn context", () => {
    const item = turn(3);
    const plan = planDialogueResponse(
      [],
      item.userMessage,
      "Tolga",
      item.semanticEvent,
    );

    expect(item.userMessage).toBe(
      "sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor",
    );
    expect(item.semanticEvent.target).toBe("event");
    expect(item.semanticEvent.worldMemory?.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectId: "current_user",
          attributeKey: "back_sunburned",
        }),
      ]),
    );
    expect(plan.move).toBe("natural_reaction");
    expect(plan.allowFollowUpQuestion).toBe(false);
  });

  it("Turn 13 keeps a state-only emotional opening on bounded curiosity", () => {
    const item = turn(13);
    const plan = planDialogueResponse(
      [],
      item.userMessage,
      "Tolga",
      item.semanticEvent,
    );

    expect(item.userMessage).toBe("off sıkıldım");
    expect(item.semanticEvent.target).toBe("unknown");
    expect(item.semanticEvent.worldMemory?.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectId: "current_user",
          attributeKey: "bored",
        }),
      ]),
    );
    expect(plan.move).toBe("invite_emotional_context");
    expect(plan.allowFollowUpQuestion).toBe(true);
  });

  it("Turn 24 still sees the retained Turn 3 event evidence after the exact intervening session", () => {
    let discourse = EMPTY_DISCOURSE_STATE;
    let turn24Instruction = "";

    for (const item of fixture.filter((entry) => entry.turnNumber <= 24)) {
      discourse = reduceDiscourseState(discourse, {
        actor: "user",
        message: item.userMessage,
        event: item.semanticEvent,
      });

      if (item.turnNumber === 24) {
        turn24Instruction = buildDiscourseObservationalInstruction(discourse);
        break;
      }

      discourse = reduceDiscourseState(discourse, {
        actor: "kaira",
        reply: item.assistantReply,
      });
    }

    expect(turn(24).userMessage).toBe("off sırtım çok pis hala");
    expect(turn(24).semanticEvent.target).toBe("unknown");
    expect(turn24Instruction).toContain(turn(3).userMessage);
    expect(turn24Instruction).toContain("önceki açık kullanıcı-olay kanıtı");
  });

  it("keeps the original Turn 25 fabrication case frozen as the provenance-gate acceptance fixture", () => {
    const item = turn(25);

    expect(item.userMessage).toBe("yandık ya la");
    expect(item.semanticEvent.target).toBe("event");
    expect(item.semanticEvent.worldMemory?.claims).toEqual([]);
    expect(item.assistantReply).toBe(
      "sen bi şeyler çevirdin ama itiraf etmiyorsun bak 😏",
    );
  });
});
