import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import {
  buildCanonicalWorldEvent,
  buildWorldEventProposition,
  detectWorldEventContentKey,
} from "./worldEventEngine";

function canonical(message: string) {
  return buildCanonicalWorldEvent(
    message,
    interpretSemanticEvent(message),
    resolveMessageEntities(message, { userName: "Mert", characterName: "KAIRO" }),
  );
}

describe("Canonical World Event V3 contracts", () => {
  it("separates different bounded content under the same actor predicate and target", () => {
    const salak = canonical("Ayşe bana salak dedi");
    const aptal = canonical("Ayşe bana aptal dedi");

    expect(salak.proposition?.contentKey).toBe("salak");
    expect(aptal.proposition?.contentKey).toBe("aptal");
    expect(salak.proposition?.key).not.toBe(aptal.proposition?.key);
  });

  it("keeps polarity outside proposition identity for the same content", () => {
    const positive = canonical("Ayşe bana salak dedi");
    const negative = canonical("Ayşe bana salak demedi");

    expect(positive.proposition?.key).toBe(negative.proposition?.key);
    expect(positive.polarity).toBe("positive");
    expect(negative.polarity).toBe("negative");
  });

  it("builds a deterministic four-part proposition identity", () => {
    const proposition = buildWorldEventProposition(
      "insult",
      { name: "Ayşe", source: "explicit_name", confidence: 1 },
      { id: "current_user", source: "first_person", confidence: 1 },
      "SALAK",
    );

    expect(proposition.key).toBe("ayşe|insult|current_user|salak");
    expect(proposition.contentKey).toBe("salak");
  });

  it("does not invent content identity when no bounded cue exists", () => {
    expect(detectWorldEventContentKey("general", "Ayşe bana bir şey söyledi")).toBeUndefined();
    const event = canonical("Ayşe bana bir şey söyledi");
    expect(event.proposition?.contentKey).toBeUndefined();
    expect(event.proposition?.key.endsWith("|?")).toBe(true);
  });

  it("canonicalizes bounded general action and state concepts", () => {
    expect(detectWorldEventContentKey("general", "yarın istifa edeceğim")).toBe("resign");
    expect(detectWorldEventContentKey("general", "işten ayrılacağım")).toBe("leave_job");
    expect(detectWorldEventContentKey("general", "müdürle görüşeceğim")).toBe("manager_meeting");
    expect(detectWorldEventContentKey("general", "maaşıma zam gelecek")).toBe("salary_raise");
    expect(detectWorldEventContentKey("general", "ben öğrenciyim")).toBe("student_status");
    expect(detectWorldEventContentKey("general", "yarın işe gideceğim")).toBe("go_to_work");
  });

  it("keeps future negation outside proposition identity for bounded actions", () => {
    const positive = canonical("yarın istifa edeceğim");
    const negative = canonical("yarın istifa etmeyeceğim");

    expect(positive.proposition?.contentKey).toBe("resign");
    expect(negative.proposition?.contentKey).toBe("resign");
    expect(positive.proposition?.key).toBe(negative.proposition?.key);
    expect(positive.polarity).toBe("positive");
    expect(negative.polarity).toBe("negative");
  });

  it("does not collapse distinct general actions into the same proposition", () => {
    const resign = canonical("yarın istifa edeceğim");
    const meeting = canonical("yarın müdürle görüşeceğim");

    expect(resign.eventType).toBe("general");
    expect(meeting.eventType).toBe("general");
    expect(resign.proposition?.key).not.toBe(meeting.proposition?.key);
  });
});
