import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("function buildEntityGroundingInstruction")) {
  const anchor = `function runtimeFlag(personality: DroitPersonalityTraits, key: string, fallback = true) {\n  const value = personality?.[key];\n  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;\n  return value >= 50;\n}\n`;
  const helper = `${anchor}function buildEntityGroundingInstruction(entityResolution: any) {\n  if (!entityResolution) return \"\";\n  const refs = Array.isArray(entityResolution.references)\n    ? entityResolution.references\n        .map((ref: any) => {\n          const resolved = ref.resolvedName || ref.resolvedId || \"çözülmedi\";\n          return \`\${ref.surface} => \${resolved} (rol=\${ref.role}, güven=\${Number(ref.confidence ?? 0).toFixed(2)})\`;\n        })\n        .join(\"; \")\n    : \"yok\";\n  const ambiguities = Array.isArray(entityResolution.ambiguities) && entityResolution.ambiguities.length\n    ? entityResolution.ambiguities.join(\" | \")\n    : \"yok\";\n  return \`ENTITY / WORLD GROUNDING:\\nKonuşan kişi: \${entityResolution.speaker?.name || \"bilinmiyor\"}.\\nMuhatap: \${entityResolution.addressee?.name || \"Kaira\"}.\\nReferanslar: \${refs}.\\nBelirsizlikler: \${ambiguities}.\\nKURALLAR: Birinci şahıs (ben/bana/beni) konuşan kişiye, ikinci şahıs (sen/sana/seni) Kaira'ya aittir. Açık isim çözümü mevcut konuşanla aynı kişiye çıkıyorsa bunu otomatik olarak ayrı bir üçüncü şahıs yapma. Belirsizlik varsa kişi/olay ataması UYDURMA; cevabı belirsizliği koruyacak şekilde yaz. Kullanıcının söylemediği \"bunu ben söyledim\", \"şu kişi yaptı\" gibi yeni bir kaynak/aktör icat etme.\`;\n}\n`;
  if (!source.includes(anchor)) throw new Error("runtimeFlag anchor not found");
  source = source.replace(anchor, helper);
}

if (!source.includes("const entityGroundingInstruction = buildEntityGroundingInstruction")) {
  const anchor = `    const activeParticipantInstruction = buildActiveParticipantInstruction(\n      userName,\n      userId,\n    );\n`;
  const insert = `${anchor}    const entityGroundingInstruction = buildEntityGroundingInstruction(\n      languageUnderstanding.entityResolution,\n    );\n`;
  if (!source.includes(anchor)) throw new Error("active participant anchor not found");
  source = source.replace(anchor, insert);
}

const entityAlreadyInPrompt =
  source.includes("${entityGroundingInstruction}\\n${dialogueInstruction}") ||
  source.includes("${entityGroundingInstruction}\\n${worldEventInstruction}");

if (!entityAlreadyInPrompt) {
  const before = "${activeParticipantInstruction}\\n${dialogueInstruction}";
  const after = "${activeParticipantInstruction}\\n${entityGroundingInstruction}\\n${dialogueInstruction}";
  if (!source.includes(before)) throw new Error("system prompt anchor not found");
  source = source.replace(before, after);
}

if (!source.includes("entityResolution: languageUnderstanding.entityResolution")) {
  source = source.replace(
    "semanticSource: canonicalSemantic.source, behaviorContract",
    "semanticSource: canonicalSemantic.source, entityResolution: languageUnderstanding.entityResolution, behaviorContract",
  );
}

fs.writeFileSync(path, source);
console.log("entity grounding connected to response generation");
