import { describe, expect, it } from "vitest";
import { resolveServerLanguageUnderstanding } from "./serverLanguageUnderstanding";
import { deriveDiscourseState } from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { projectSemanticEventToDialogueAnalysis } from "./kairaDialogueTurnProjection";

describe("first-encounter continuity + latency v2", () => {
  it("canonicalizes 'iyilik' as a contextual well-being reply without provider", async () => {
    let providerCalls = 0;
    const result = await resolveServerLanguageUnderstanding({
      message: "iyilik",
      context: {
        userName: "Sen",
        characterName: "Kaira",
        recentMessages: [
          { role: "assistant", content: "gayet iyiyim, sen nasılsın?" },
        ],
      },
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      generateText: async () => {
        providerCalls += 1;
        throw new Error("provider must not be called");
      },
    });

    expect(providerCalls).toBe(0);
    expect(result.event.socialRoutine).toBe("well_being_reply");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe(
      "well_being_reply",
    );
    expect(
      result.interpretation.evidence.some((evidence) =>
        evidence.cues.includes("first_encounter_well_being_reply"),
      ),
    ).toBe(true);
  });

  it("keeps contextual well-being reply under canonical social-routine decision authority", async () => {
    const history = [{ sender: "droit", text: "gayet iyiyim, sen nasılsın?" }];
    const result = await resolveServerLanguageUnderstanding({
      message: "iyilik",
      context: {
        userName: "Sen",
        characterName: "Kaira",
        recentMessages: [{ role: "assistant", content: history[0].text }],
      },
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      generateText: async () => { throw new Error("provider must not be called"); },
    });
    const analysis = projectSemanticEventToDialogueAnalysis(result.event);
    const discourse = deriveDiscourseState(history, {
      message: "iyilik",
      event: result.event,
    });
    const decision = planDialogueResponse(
      history,
      "iyilik",
      "Sen",
      result.event,
      analysis,
      discourse,
    );

    expect(discourse.previousTurnDependency).toBeTruthy();
    expect(result.event.socialRoutine).toBe("well_being_reply");
    expect(decision.move).toBe("complete_social_routine");
    expect(decision.socialRoutine).toBe("well_being_reply");
  });

  it("keeps causal continuity lease-held after response and telemetry non-blocking", async () => {
    const fs = await import("node:fs/promises");
    const server = await fs.readFile(new URL("../../server.ts", import.meta.url), "utf8");
    const persistence = await fs.readFile(
      new URL("./kdmPersistenceService.ts", import.meta.url),
      "utf8",
    );

    expect(server).toContain("strictPersistence: firstEncounterFastPersistence");
    expect(server).toContain('status: "not_applicable" as const');
    expect(server).toContain("criticalPersistenceMs");

    const localStart = server.indexOf("const firstEncounterFastPersistence");
    const send = server.indexOf("sendFirstEncounterFastPayload(responsePayload)", localStart);
    const persist = server.indexOf("await persistFirstEncounterContinuity()", send);
    const complete = server.indexOf("await completeCoordinatedKairaChatRequest(coordinationKey, responsePayload)", persist);
    const background = server.indexOf('console.log("[First Encounter Deferred Continuity]"', complete);
    expect(localStart).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(localStart);
    expect(persist).toBeGreaterThan(send);
    expect(complete).toBeGreaterThan(persist);
    expect(background).toBeGreaterThan(complete);

    expect(persistence).toContain("writeBatch");
    expect(persistence).toContain("batch.set(turnDocRef");
    expect(persistence).toContain("batch.set(sessionRef");
    expect(persistence).toContain("batch.set(stateRef");
    expect(persistence).toContain("batch.set(traceDocRef");
  });
});
