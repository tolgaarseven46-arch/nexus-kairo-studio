import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const client = read("src/services/droitChatService.ts");
const server = read("server.ts");

const between = (text: string, start: string, end: string) => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  return from >= 0 && to > from ? text.slice(from, to) : "";
};

describe("base personality vs per-turn response overlay ownership", () => {
  it("sends immutable/base personality separately from the per-turn response personality", () => {
    expect(client).toContain("personality, responsePersonality: runtimePersonality");
    expect(client).not.toContain("personality: runtimePersonality");
  });

  it("uses base personality as the KDM relationship/emotion reducer input", () => {
    expect(server).toContain("basePersonality = personality as DroitPersonalityTraits");
    expect(server).toContain("responsePersonality = (incomingResponsePersonality || personality) as DroitPersonalityTraits");
    const kdmCall = between(server, "kdm = analyzeKdmInteraction(", "),\n      behaviorContract");
    expect(kdmCall).toContain("basePersonality");
    expect(kdmCall).not.toContain("responsePersonality");
  });

  it("uses per-turn overlay only after KDM for response HOW shaping", () => {
    const afterKdm = server.slice(server.indexOf("behaviorContract = buildBehaviorContract"));
    expect(afterKdm).toContain("computeKairoSpeechIdentity(\n        responsePersonality,");
    expect(afterKdm).toContain("tryLocalKairoReply(\n        userMessage,\n        responsePersonality,");
    expect(afterKdm).not.toContain("responseStylePersonality");
  });

  it("keeps explicit behavior policy as the only per-turn decision input entering KDM", () => {
    const kdmCall = between(server, "kdm = analyzeKdmInteraction(", "),\n      behaviorContract");
    expect(kdmCall).toContain("behaviorPolicy");
  });
});
