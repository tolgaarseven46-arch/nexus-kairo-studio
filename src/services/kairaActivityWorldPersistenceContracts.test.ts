import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { kairaActivityObservationDocumentId } from "./worldModelEventStore";

describe("Kaira activity world persistence contracts", () => {
  it("derives one deterministic document id from canonical activity identity and lifecycle status", () => {
    expect(kairaActivityObservationDocumentId("Theatre 01", "completed"))
      .toBe("kaira_activity__theatre_01__completed");
    expect(kairaActivityObservationDocumentId(" theatre_01 ", "completed"))
      .toBe("kaira_activity__theatre_01__completed");
    expect(kairaActivityObservationDocumentId("theatre_01", "active"))
      .toBe("kaira_activity__theatre_01__active");
  });

  it("rejects empty activity identity instead of collapsing unrelated activities", () => {
    expect(() => kairaActivityObservationDocumentId("   ", "completed"))
      .toThrow("Invalid Kaira activity id");
  });

  it("uses transactional create-or-return semantics rather than addDoc for activity truth", () => {
    const source = readFileSync("src/services/worldModelEventStore.ts", "utf8");
    const start = source.indexOf("export async function saveKairaActivityWorldObservation");
    const end = source.indexOf("export async function loadRecentWorldEventObservations", start);
    const activityPersistence = source.slice(start, end);
    expect(activityPersistence).toContain("runTransaction(db");
    expect(activityPersistence).toContain("transaction.get(observationRef)");
    expect(activityPersistence).toContain("transaction.set(observationRef, persisted)");
    expect(activityPersistence).toContain("Kaira activity idempotency conflict");
    expect(activityPersistence).not.toContain("addDoc(");
  });

  it("returns the existing observation on a compatible retry before any transaction set", () => {
    const source = readFileSync("src/services/worldModelEventStore.ts", "utf8");
    const start = source.indexOf("return runTransaction(db");
    const end = source.indexOf("export async function loadRecentWorldEventObservations", start);
    const transaction = source.slice(start, end);
    expect(transaction.indexOf("if (existingSnapshot.exists())")).toBeGreaterThan(-1);
    expect(transaction.indexOf("return existing;")).toBeLessThan(transaction.indexOf("transaction.set(observationRef, persisted)"));
  });
});
