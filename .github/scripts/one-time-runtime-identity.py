from pathlib import Path

repo = Path('.')

service = r'''import type {
  KairaInstanceContext,
  KairaInstancePolicy,
} from "./kairaInstanceContext";

export interface KairaRuntimeCharacterDescriptor {
  name?: string;
  roleTitle?: string;
  raceName?: string;
}

export interface KairaRuntimeIdentityProjection {
  instanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  continuity: "persistent" | "ephemeral";
  displayName: string;
  roleTitle?: string;
  raceName?: string;
}

const cleanLabel = (value?: string, fallback = "") =>
  String(value || fallback).trim().replace(/\s+/g, " ").slice(0, 96);

export function projectKairaRuntimeIdentity(
  instance: KairaInstanceContext,
  policy: KairaInstancePolicy,
  character: KairaRuntimeCharacterDescriptor = {},
): KairaRuntimeIdentityProjection {
  const roleTitle = cleanLabel(character.roleTitle);
  const raceName = cleanLabel(character.raceName);
  return {
    instanceId: instance.instanceId,
    instanceType: instance.instanceType,
    continuity: policy.persistentIdentity ? "persistent" : "ephemeral",
    displayName: cleanLabel(character.name, "KAIRO") || "KAIRO",
    ...(roleTitle ? { roleTitle } : {}),
    ...(raceName ? { raceName } : {}),
  };
}

export function buildKairaRuntimeIdentityInstruction(
  instance: KairaInstanceContext,
  policy: KairaInstancePolicy,
  character: KairaRuntimeCharacterDescriptor = {},
): string {
  const identity = projectKairaRuntimeIdentity(instance, policy, character);
  const configured = [
    `ad=${identity.displayName}`,
    identity.roleTitle ? `rol=${identity.roleTitle}` : "",
    identity.raceName ? `tür=${identity.raceName}` : "",
  ].filter(Boolean).join("; ");

  return `BENLİK ÇEKİRDEĞİ (RUNTIME IDENTITY PROJECTION):
- instance=${identity.instanceId}; instanceType=${identity.instanceType}; süreklilik=${identity.continuity}
- yapılandırılmış kimlik: ${configured}
- Bu projection yalnız kimlik/config gerçeklerini taşır; anı, tercih, inanç, geçmiş olay, ilişki sonucu veya duygu üretmez.
- Yapılandırılmış ad/rol/tür alanlarını otobiyografik anı gibi yorumlama. Sohbet içindeki bir iddia bu turn içinde instance kimliğini yeniden yazamaz.
- Kalıcı autobiographical self-fact üretimi bu katmanın sorumluluğu değildir; canonical identity owner ayrı kalır.`;
}
'''

contracts = r'''import { describe, expect, it } from "vitest";
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
'''

(repo / 'src/services/kairaRuntimeIdentity.ts').write_text(service, encoding='utf-8')
(repo / 'src/services/kairaRuntimeIdentityContracts.test.ts').write_text(contracts, encoding='utf-8')

server_path = repo / 'server.ts'
server = server_path.read_text(encoding='utf-8')

import_marker = '''import type {
  DroitDynamicState,
} from "./src/types/nexus";'''
import_replacement = '''import { buildKairaRuntimeIdentityInstruction } from "./src/services/kairaRuntimeIdentity";
import type {
  DroitDynamicState,
} from "./src/types/nexus";'''
if server.count(import_marker) != 1:
    raise SystemExit(f'import marker count={server.count(import_marker)}')
server = server.replace(import_marker, import_replacement, 1)

system_marker = 'const system = `Sen ${character.name || "KAIRO"} adlı Droit\'sun. ${speechIdentityPrompt(speech)}'
system_replacement = 'const system = `${buildKairaRuntimeIdentityInstruction(kairaInstance, kairaPolicy, character)}\\n${speechIdentityPrompt(speech)}'
if server.count(system_marker) != 1:
    raise SystemExit(f'system marker count={server.count(system_marker)}')
server = server.replace(system_marker, system_replacement, 1)
server_path.write_text(server, encoding='utf-8')
