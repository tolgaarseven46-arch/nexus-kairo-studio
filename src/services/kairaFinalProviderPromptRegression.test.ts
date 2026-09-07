import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildKairaFinalProviderSystemPrompt } from "./kairaFinalProviderPrompt";

const serverPath = path.resolve(process.cwd(), "server.ts");

function serverSource() {
  return fs.readFileSync(serverPath, "utf8");
}

describe("final-provider prompt production/harness regression", () => {
  it("keeps production routed through the shared serializer", () => {
    const source = serverSource();

    expect(source).toContain(
      'import { buildKairaFinalProviderSystemPrompt } from "./src/services/kairaFinalProviderPrompt";',
    );
    expect(source).toContain("const system = buildKairaFinalProviderSystemPrompt({");
    expect(source).not.toContain(
      "const system = `${buildKairaRuntimeIdentityInstruction(kairaInstance, kairaPolicy, character)}\\n",
    );
  });

  it("keeps the shared serializer byte-stable for equivalent production parts", () => {
    const parts = {
      runtimeIdentityInstruction: "IDENTITY",
      speechIdentityInstruction: "SPEECH",
      languageStyleMemoryInstruction: "LANGSTYLE",
      dyadicLanguageAlignmentInstruction: "DYADIC",
      socialStyle: "SOCIAL",
      groundingInstruction: "GROUND",
      activeParticipantInstruction: "PARTICIPANT",
      entityGroundingInstruction: "ENTITY",
      worldEventInstruction: "WORLD_EVENT",
      worldEventMemoryInstruction: "WORLD_MEMORY",
      worldStateAppraisalInstruction: "WORLD_APPRAISAL",
      worldReasoningPolicyInstruction: "WORLD_POLICY",
      epistemicInstruction: "EPISTEMIC",
      selfMemoryInstruction: "SELF_MEMORY",
      dialogueInstruction: "DIALOGUE",
      discourseInstruction: "DISCOURSE",
      dialogueDecisionInstruction: "DIALOGUE_DECISION",
      responsePlanInstruction: "RESPONSE_PLAN",
      canonicalObservationalContext: "OBSERVATIONAL",
      sessionWorkingMemory: "SESSION_MEMORY",
      memoryContext: "PERSISTENT_MEMORY",
      tone: "warm",
    };

    expect(buildKairaFinalProviderSystemPrompt(parts)).toBe(
      "IDENTITY\n" +
        "SPEECH\n" +
        "LANGSTYLEDYADIC\n" +
        "SOCIAL\n" +
        "GROUND\n" +
        "PARTICIPANT\n" +
        "ENTITY\n" +
        "WORLD_EVENT\n" +
        "WORLD_MEMORY\n" +
        "WORLD_APPRAISAL\n" +
        "WORLD_POLICY\n" +
        "EPISTEMIC\n" +
        "SELF_MEMORY\n" +
        "DIALOGUE\n" +
        "DISCOURSE\n" +
        "DIALOGUE_DECISION\n" +
        "RESPONSE_PLAN\n" +
        "OBSERVATIONAL\n" +
        "AYNI OTURUM ÇALIŞMA HAFIZASI (yüksek güven):\nSESSION_MEMORY\n" +
        "DOĞRULANMIŞ GEÇMİŞ HAFIZA:\nPERSISTENT_MEMORY\n" +
        "Ton:warm. Yalnızca Kaira'nın göndereceği doğal Türkçe mesajı üret; açıklama veya analiz ekleme.",
    );
  });
});
