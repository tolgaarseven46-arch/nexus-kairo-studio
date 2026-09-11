import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

const importAnchor = 'import { registerKairaActivityProvisioningRoute } from "./src/services/kairaActivityProvisioningRoute";\n';
const transportImport = 'import { KAIRA_PROVIDER_DEADLINE_MS, kairaProviderFailureMessage } from "./src/services/kairaProviderTransportPolicy";\n';
if (!source.includes(transportImport)) {
  if (!source.includes(importAnchor)) throw new Error("provider import anchor not found");
  source = source.replace(importAnchor, importAnchor + transportImport);
}

const callStart = source.indexOf("async function callOpenRouter(messages: any[], temperature: number) {");
const callEnd = source.indexOf("type AiProviderUsed =", callStart);
if (callStart < 0 || callEnd < 0) throw new Error("callOpenRouter block not found");
const callReplacement = `async function callOpenRouter(messages: any[], temperature: number) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY bulunamadı.");
  const model = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  const configuredMaxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || 220);
  const maxTokens = Number.isFinite(configuredMaxTokens)
    ? Math.max(32, Math.min(512, Math.round(configuredMaxTokens)))
    : 220;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), KAIRA_PROVIDER_DEADLINE_MS);
  try {
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: \`Bearer \${key.trim()}\`,
          "Content-Type": "application/json",
          "X-Title": "NEXUS Kairo Studio",
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw new Error(kairaProviderFailureMessage("timeout"));
      }
      throw new Error(kairaProviderFailureMessage("transport_error", error?.message));
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(kairaProviderFailureMessage("http_error", data?.error?.message || \`OpenRouter hatası: HTTP \${response.status}\`));
    }
    const text = extractOpenRouterText(data);
    if (!text) throw new Error(kairaProviderFailureMessage("empty_response"));
    return text;
  } finally {
    clearTimeout(deadline);
  }
}
`;
source = source.slice(0, callStart) + callReplacement + source.slice(callEnd);

const oldOpenRouterBranch = `  if (preferredProvider === "openrouter" && hasOpenRouter) {
    try {
      const text = await callOpenRouter(
        [{ role: "system", content: system }, ...messages],
        temperature,
      );
      return { text, providerUsed: "openrouter" };
    } catch (openRouterErr) {
      console.warn("[Provider] OpenRouter failed, falling back to Gemini:", openRouterErr);
      if (hasGemini) {
        const response = await getGeminiClient().models.generateContent({
          model: "gemini-3.6-flash",
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          config: { systemInstruction: system },
        });
        return { text: (response?.text || "").trim(), providerUsed: "gemini" };
      }
      throw openRouterErr;
    }
  }
`;
const newOpenRouterBranch = `  if (preferredProvider === "openrouter" && hasOpenRouter) {
    const text = await callOpenRouter(
      [{ role: "system", content: system }, ...messages],
      temperature,
    );
    return { text, providerUsed: "openrouter" };
  }
`;
if (!source.includes(newOpenRouterBranch)) {
  if (!source.includes(oldOpenRouterBranch)) throw new Error("OpenRouter provider branch not found");
  source = source.replace(oldOpenRouterBranch, newOpenRouterBranch);
}

fs.writeFileSync(path, source);
console.log("provider transport patch applied");
