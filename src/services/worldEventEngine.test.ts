import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent } from "./worldEventEngine";

describe("buildCanonicalWorldEvent", () => {
  it("resolves reported third-party insult actor and first-person target", () => {
    const message = "Ayşe bana salak dedi";
    const semantic = interpretSemanticEvent(message);
    const entities = resolveMessageEntities(message, {
      userName: "Mert",
      characterName: "Kaira",
    });

    const event = buildCanonicalWorldEvent(message, semantic, entities);

    expect(event.reportedSpeech).toBe(true);
    expect(event.eventType).toBe("insult");
    expect(event.actor).toEqual(
      expect.objectContaining({ name: "Ayşe", source: "explicit_name" }),
    );
    expect(event.target).toEqual(
      expect.objectContaining({ id: "current_user", name: "Mert" }),
    );
    expect(event.actor).not.toHaveProperty("id");
    expect(JSON.stringify(event)).not.toContain("undefined");
  });

  it("keeps actor unresolved when the current speaker names themselves beside first person", () => {
    const message = "Mert bana salak dedi";
    const semantic = interpretSemanticEvent(message);
    const entities = resolveMessageEntities(message, {
      userName: "Mert",
      characterName: "Kaira",
    });

    const event = buildCanonicalWorldEvent(message, semantic, entities);

    expect(event.reportedSpeech).toBe(true);
    expect(event.actor).toBeUndefined();
    expect(event.target).toEqual(
      expect.objectContaining({ id: "current_user", name: "Mert" }),
    );
    expect(event.ambiguities.length).toBeGreaterThan(0);
    expect(event.certainty).toBeLessThan(0.8);
  });

  it("classifies a named third-party action reported by the user as a reported claim", () => {
    const message = "Ayşe bana özür diledi";
    const semantic = interpretSemanticEvent(message);
    const entities = resolveMessageEntities(message, {
      userName: "Mert",
      characterName: "Kaira",
    });

    const event = buildCanonicalWorldEvent(message, semantic, entities);

    // Semantic revision: reportedSpeech now means the user is reporting a
    // third-party event, not only literal speech verbs. This keeps epistemic
    // provenance correct in the world model.
    expect(event.reportedSpeech).toBe(true);
    expect(event.eventType).toBe("apology");
    expect(event.actor).toEqual(
      expect.objectContaining({ name: "Ayşe", source: "explicit_name" }),
    );
    expect(event.target).toEqual(
      expect.objectContaining({ id: "current_user", name: "Mert" }),
    );
  });
});
