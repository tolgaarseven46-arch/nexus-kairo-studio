import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";
import { isTurkishQuestionAct } from "./kairaQuestionActRecognizer";
import { removeForbiddenQuestionUnits } from "./kairaDeliveredQuestionConstraint";
import { resolveKairaFinalDelivery } from "./kairaFinalDeliveryGate";
import type { SemanticEvent } from "./semanticEventEngine";

type CapturedTurn = {
  turnNumber: number;
  userMessage: string;
  assistantReply: string;
  speaker: string;
  consistency: { accepted: boolean; score: number; issues: string[]; warnings: string[] };
  metadata: {
    semanticEvent: SemanticEvent;
    retrievedWorldEvents?: Array<Record<string, any>>;
    responsePlan?: Record<string, any>;
    worldMemoryGuard?: { reply?: string };
  };
};

type CapturedKntExport = {
  reportType: string;
  session: { turns: CapturedTurn[] };
};

function loadCapturedFixture(fileNames: string[], expectedSha256: string): CapturedKntExport {
  const encoded = fileNames
    .map((fileName) =>
      readFileSync(path.resolve(process.cwd(), "test/fixtures/knt", fileName), "utf8").trim(),
    )
    .join("");
  const raw = gunzipSync(Buffer.from(encoded, "base64"));
  const sha = createHash("sha256").update(raw).digest("hex");
  expect(sha).toBe(expectedSha256);
  return JSON.parse(raw.toString("utf8")) as CapturedKntExport;
}

function turn(session: CapturedKntExport, turnNumber: number): CapturedTurn {
  const value = session.session.turns.find((item) => item.turnNumber === turnNumber);
  if (!value) throw new Error(`missing captured turn ${turnNumber}`);
  return value;
}

const testA = loadCapturedFixture(
  [
    "test-a-13-turn.raw.json.gz.b64.part01",
    "test-a-13-turn.raw.json.gz.b64.part02",
    "test-a-13-turn.raw.json.gz.b64.part03",
    "test-a-13-turn.raw.json.gz.b64.part04",
    "test-a-13-turn.raw.json.gz.b64.part05",
    "test-a-13-turn.raw.json.gz.b64.part06",
  ],
  "298a5677d26d61213d6e996fec29318d8053b483b357cf4127a19195faf40106",
);
const testB = loadCapturedFixture(
  ["test-b-6-turn.raw.json.gz.b64"],
  "11bf07cd30011b4deb500450a18692b04880757ede542864b877736a89362627",
);

function responsePlanForActionRequest(event: SemanticEvent, raw: string, speaker: string) {
  const dialogue = planDialogueResponse([], raw, speaker, event);
  const responsePlan = resolveKairaResponsePlan({
    dialogue,
    hard: {
      hardDisengage: false,
      mustAcknowledgeBoundary: false,
      questionAllowed: true,
      humorAllowed: true,
      adviceAllowed: false,
      flirtingAllowed: false,
      counterFlirtAllowed: false,
      intimacyCeiling: 0.25,
      affectionAllowed: false,
      forgivenessAllowed: true,
      reopeningClosenessAllowed: true,
      maxSentences: 2,
      maxWords: 24,
      emojiBudget: 1,
      reasons: [],
    } as any,
    soft: {
      questionDrive: 0,
      warmthTendency: 0.65,
      guardedness: 0.2,
      intimacyInclination: 0.25,
      opennessTendency: 0.8,
      verbosityTendency: 0.5,
      rationale: [],
    } as any,
    speech: { register: "casual", relationshipLevel: "new" } as any,
    contract: { stance: "open", repairStatus: "none", semanticUncertainty: 0.2 } as any,
  });
  return { dialogue, responsePlan };
}

describe("captured KNT deterministic replay — Test A + Test B", () => {
  it("proves the fixtures are the exact 13-turn and 6-turn captured exports", () => {
    expect(testA.reportType).toBe("KAIRA_KNT_FULL_SESSION");
    expect(testB.reportType).toBe("KAIRA_KNT_FULL_SESSION");
    expect(testA.session.turns).toHaveLength(13);
    expect(testB.session.turns).toHaveLength(6);
    expect(turn(testA, 10).userMessage).toBe("ee selami napıyor");
    expect(turn(testA, 11).userMessage).toBe("eceyle hala sevgilimi");
    expect(turn(testA, 12).userMessage).toBe("neyse aşkım oyun mu oynasak ya birlikte");
    expect(turn(testB, 2).userMessage).toBe("iyi beya çay içiyom");
    expect(turn(testB, 5).userMessage).toBe("müzik açayım dur sıkıldım zaten");
    expect(turn(testB, 6).userMessage).toBe("rap oooo yeaaa");
  });

  it("replays Test A turn 10 through the current canonical projection instead of preserving the stale reciprocal routine", () => {
    const captured = turn(testA, 10).metadata.semanticEvent;
    const base = interpretationFromRegexFloor(captured.raw);
    const interpretation = {
      ...base,
      target: captured.target,
      discourseFacets: {
        ...base.discourseFacets,
        socialRoutine: captured.socialRoutine,
      },
      worldMemory: captured.worldMemory,
    } as any;

    const projected = projectSemanticEvent(interpretation);
    expect(captured.target).toBe("third_party");
    expect(captured.socialRoutine).toBe("what_doing");
    expect(projected.socialRoutine).toBe("none");
  });

  it("replays Test A turn 11 and refuses to broaden its low-confidence typed Ece query into captured unrelated evidence", () => {
    const captured = turn(testA, 11);
    const query = captured.metadata.semanticEvent.worldMemory.query;
    const observations = (captured.metadata.retrievedWorldEvents ?? []).map((item) => ({
      id: item.id,
      userId: "captured-test-user",
      sessionId: "captured-test-a",
      kairaInstanceId: "kaira_reference_001",
      kind: item.kind,
      status: item.status,
      createdAt: "2026-09-07T07:33:52.000Z",
      event: item.event,
    }));

    expect(query?.confidence).toBe(0.7);
    expect(observations.length).toBeGreaterThan(0);
    expect(
      rankWorldEventObservations(
        captured.userMessage,
        observations as any,
        5,
        "2026-09-07T07:33:52.000Z",
        query,
      ),
    ).toEqual([]);
  });

  it("replays Test A turn 12 and proves the action obligation can authorize one coordination question", () => {
    const captured = turn(testA, 12);
    const { dialogue, responsePlan } = responsePlanForActionRequest(
      captured.metadata.semanticEvent,
      captured.userMessage,
      captured.speaker,
    );

    expect(dialogue.move).toBe("respond_to_action_request");
    expect(dialogue.obligation?.satisfactionCriteria.allowedResolutions).toContain("clarify");
    expect(responsePlan.allowQuestion).toBe(true);
    expect(responsePlan.resolverRationale).toContain(
      "action_request:clarification-question-authorized-by-obligation",
    );
  });

  it("replays Test B turn 2 and suppresses a stale unknown-target reciprocal routine when first-party state evidence is present", () => {
    const captured = turn(testB, 2).metadata.semanticEvent;
    const base = interpretationFromRegexFloor(captured.raw);
    const interpretation = {
      ...base,
      target: captured.target,
      discourseFacets: {
        ...base.discourseFacets,
        socialRoutine: captured.socialRoutine,
      },
      worldMemory: captured.worldMemory,
    } as any;

    expect(captured.target).toBe("unknown");
    expect(captured.socialRoutine).toBe("what_doing");
    expect(captured.worldMemory.claims.some((claim) => claim.subjectId === "current_user")).toBe(true);
    expect(projectSemanticEvent(interpretation).socialRoutine).toBe("none");
  });

  it("replays Test B turn 5 and recognizes the exact delivered bare-ne second-person question that previously escaped validation", () => {
    const captured = turn(testB, 5);
    expect(captured.metadata.responsePlan?.allowQuestion).toBe(false);
    expect(captured.assistantReply).toContain("ne tarz açıyosun şimdi");
    expect(isTurkishQuestionAct(captured.assistantReply)).toBe(true);
  });

  it("replays Test B turn 6 and preserves the valid reaction while rejecting only the forbidden question unit", () => {
    const captured = turn(testB, 6);
    const candidate = captured.metadata.worldMemoryGuard?.reply ?? "";
    expect(captured.consistency.accepted).toBe(false);
    expect(captured.metadata.responsePlan?.allowQuestion).toBe(false);
    expect(isTurkishQuestionAct(candidate)).toBe(true);

    const safe = removeForbiddenQuestionUnits(candidate, false);
    expect(safe.trim().length).toBeGreaterThan(0);
    expect(isTurkishQuestionAct(safe)).toBe(false);

    const delivery = resolveKairaFinalDelivery(candidate, captured.consistency);
    expect(delivery.accepted).toBe(false);
    expect(delivery.persistedReply.trim().length).toBeGreaterThan(0);
  });
});
