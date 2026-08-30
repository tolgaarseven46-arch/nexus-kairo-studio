import { describe, expect, it } from "vitest";
import { resolveMessageEntities } from "./entityResolutionEngine";

describe("resolveMessageEntities", () => {
  it("resolves second-person references to Kaira", () => {
    const result = resolveMessageEntities("Sen malsın", {
      userName: "Mert",
      characterName: "Kaira",
    });

    expect(result.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "Sen",
          role: "second_person",
          resolvedId: "kaira",
          resolvedName: "Kaira",
        }),
      ]),
    );
    expect(result.ambiguities).toHaveLength(0);
  });

  it("resolves first-person references to the current speaker", () => {
    const result = resolveMessageEntities("Ayşe bana salak dedi", {
      userName: "Mert",
      characterName: "Kaira",
    });

    expect(result.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "bana",
          role: "first_person",
          resolvedId: "current_user",
          resolvedName: "Mert",
        }),
        expect.objectContaining({
          surface: "Ayşe",
          role: "named_person",
          resolvedName: "Ayşe",
        }),
      ]),
    );
  });

  it("captures both names in a contrastive recall question", () => {
    const result = resolveMessageEntities("Ayşe mi Merve mi bana salak demişti?", {
      userName: "Mert",
      characterName: "Kaira",
    });

    expect(result.namedPeople).toEqual(expect.arrayContaining(["Ayşe", "Merve"]));
    expect(result.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ surface: "Ayşe", role: "named_person" }),
        expect.objectContaining({ surface: "Merve", role: "named_person" }),
        expect.objectContaining({
          surface: "bana",
          role: "first_person",
          resolvedId: "current_user",
        }),
      ]),
    );
  });

  it("surfaces ambiguity when the current speaker names themselves beside first person", () => {
    const result = resolveMessageEntities("Mert bana salak dedi", {
      userName: "Mert",
      characterName: "Kaira",
    });

    expect(result.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "Mert",
          resolvedId: "current_user",
        }),
        expect.objectContaining({
          surface: "bana",
          resolvedId: "current_user",
        }),
      ]),
    );
    expect(result.ambiguities).toHaveLength(1);
    expect(result.confidence).toBeLessThan(0.96);
  });

  it("does not confuse commodity 'mal' with a person", () => {
    const result = resolveMessageEntities("Mal aldım", {
      userName: "Mert",
      characterName: "Kaira",
    });

    expect(result.namedPeople).toHaveLength(0);
    expect(result.references).toHaveLength(0);
  });
});
