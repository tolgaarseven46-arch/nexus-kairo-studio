import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { instancePolicy, resolveKairaInstanceContext } from "./kairaInstanceContext";
import {
  buildKairaRuntimeIdentityInstruction,
  projectKairaRuntimeIdentity,
} from "./kairaRuntimeIdentity";

describe("runtime identity projection contracts", () => {
  it("anchors persistent individual identity without inventing autobiography", () => {
    const instance = resolveKairaInstanceContext({ instanceId: "kaira_ali_01", instanceType: "individual" });
    const projection = projectKairaRuntimeIdentity(instance, instancePolicy(instance.instanceType), {
      name: "Kaira",
      roleTitle: "Sunucu Yöneticisi",
      raceName: "Sentetik Droit",
    });
    expect(projection).toEqual({
      instanceId: "kaira_ali_01",
      instanceType: "individual",
      continuity: "persistent",
      displayName: "Kaira",
      roleTitle: "Sunucu Yöneticisi",
      raceName: "Sentetik Droit",
    });
    const instruction = buildKairaRuntimeIdentityInstruction(instance, instancePolicy(instance.instanceType), {
      name: "Kaira",
    });
    expect(instruction).toContain("instance=kaira_ali_01");
    expect(instruction).toContain("anı, tercih, inanç, geçmiş olay, ilişki sonucu veya duygu üretmez");
  });

  it("keeps welcome identity explicitly ephemeral", () => {
    const instance = resolveKairaInstanceContext({ instanceId: "welcome_demo", instanceType: "welcome" });
    expect(projectKairaRuntimeIdentity(instance, instancePolicy(instance.instanceType), {}).continuity).toBe("ephemeral");
  });

  it("treats request character fields as config descriptors, not canonical autobiography", () => {
    const instance = resolveKairaInstanceContext({ instanceId: "kaira_ref", instanceType: "reference" });
    const instruction = buildKairaRuntimeIdentityInstruction(instance, instancePolicy(instance.instanceType), {
      name: "  Kaira   Test  ",
      roleTitle: "  Yönetici  ",
    });
    expect(instruction).toContain("ad=Kaira Test; rol=Yönetici");
    expect(instruction).toContain("canonical identity owner ayrı kalır");
  });

  it("wires the self-anchor into the AI runtime without importing fixture lore", () => {
    const server = readFileSync("server.ts", "utf8");
    expect(server).toContain('from "./src/services/kairaRuntimeIdentity"');
    expect(server).toContain("buildKairaRuntimeIdentityInstruction(kairaInstance, kairaPolicy, character)");
    expect(server).not.toContain("buildKairaIdentityTestFixture");
  });
});
