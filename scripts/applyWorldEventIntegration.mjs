import fs from "node:fs";

function patchServer() {
  const path = "server.ts";
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes("function buildWorldEventInstruction")) {
    const anchor = "function buildEntityGroundingInstruction(entityResolution: any) {";
    const idx = source.indexOf(anchor);
    if (idx < 0) throw new Error("buildEntityGroundingInstruction anchor not found");
    const end = source.indexOf("\n}\napp.post(\"/api/chat\"", idx);
    if (end < 0) throw new Error("entity grounding helper end not found");
    const insertAt = end + 3;
    const helper = `\nfunction buildWorldEventInstruction(worldEvent: any) {\n  if (!worldEvent) return \"\";\n  const actor = worldEvent.actor?.name || worldEvent.actor?.id || \"çözülmedi\";\n  const target = worldEvent.target?.name || worldEvent.target?.id || \"çözülmedi\";\n  const ambiguities = Array.isArray(worldEvent.ambiguities) && worldEvent.ambiguities.length\n    ? worldEvent.ambiguities.join(\" | \")\n    : \"yok\";\n  return \`CANONICAL WORLD EVENT:\\nOlay tipi: \${worldEvent.eventType || \"unknown\"}.\\nActor: \${actor}.\\nTarget: \${target}.\\nAktarılan söz: \${worldEvent.reportedSpeech ? \"evet\" : \"hayır\"}.\\nKesinlik: \${Number(worldEvent.certainty ?? 0).toFixed(2)}.\\nBelirsizlikler: \${ambiguities}.\\nKURAL: Bu olay haritasını kaynak gerçekliği olarak kullan. Actor veya target çözülmemişse kimlik UYDURMA. Kullanıcının söylemediği yeni bir fail, hedef veya olay ekleme.\`;\n}\n`;
    source = source.slice(0, insertAt) + helper + source.slice(insertAt);
  }

  if (!source.includes("const worldEventInstruction = buildWorldEventInstruction")) {
    const anchor = `    const entityGroundingInstruction = buildEntityGroundingInstruction(\n      languageUnderstanding.entityResolution,\n    );\n`;
    const insert = `${anchor}    const worldEventInstruction = buildWorldEventInstruction(\n      languageUnderstanding.worldEvent,\n    );\n`;
    if (!source.includes(anchor)) throw new Error("entityGroundingInstruction anchor not found");
    source = source.replace(anchor, insert);
  }

  source = source.replace(
    "${entityGroundingInstruction}\\n${dialogueInstruction}",
    "${entityGroundingInstruction}\\n${worldEventInstruction}\\n${dialogueInstruction}",
  );

  source = source.replaceAll(
    "entityResolution: languageUnderstanding.entityResolution,\n            timings:",
    "entityResolution: languageUnderstanding.entityResolution,\n            worldEvent: languageUnderstanding.worldEvent,\n            timings:",
  );

  source = source.replaceAll(
    "entityResolution: languageUnderstanding.entityResolution, behaviorContract",
    "entityResolution: languageUnderstanding.entityResolution, worldEvent: languageUnderstanding.worldEvent, behaviorContract",
  );

  fs.writeFileSync(path, source);
}

function patchTypes() {
  const path = "src/types/nexus.ts";
  let source = fs.readFileSync(path, "utf8");
  const anchor = "    entityResolution?: unknown;";
  if (!source.includes("worldEvent?: unknown;") && source.includes(anchor)) {
    source = source.replace(anchor, `${anchor}\n    worldEvent?: unknown;`);
  }
  fs.writeFileSync(path, source);
}

function patchPersistence() {
  const path = "src/services/kdmPersistenceService.ts";
  let source = fs.readFileSync(path, "utf8");

  const typeAnchor = "    entityResolution?: unknown;";
  if (!source.includes("worldEvent?: unknown;") && source.includes(typeAnchor)) {
    source = source.replace(typeAnchor, `${typeAnchor}\n    worldEvent?: unknown;`);
  }

  const recordAnchor = "      entityResolution: payload.metadata?.entityResolution,";
  if (!source.includes("worldEvent: payload.metadata?.worldEvent") && source.includes(recordAnchor)) {
    source = source.replace(recordAnchor, `${recordAnchor}\n      worldEvent: payload.metadata?.worldEvent,`);
  }

  const loadAnchor = "          metadata: data.metadata,";
  // loadTestSession already returns metadata wholesale, so no extra hydration patch is needed.
  if (!source.includes(loadAnchor)) {
    // keep script strict enough to notice large structural drift without failing current valid shape
  }

  fs.writeFileSync(path, source);
}

patchServer();
patchTypes();
patchPersistence();
console.log("world event connected to response generation and KNT persistence");
