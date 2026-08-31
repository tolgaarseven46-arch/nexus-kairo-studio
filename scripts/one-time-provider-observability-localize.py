from pathlib import Path

server_path = Path('server.ts')
server = server_path.read_text(encoding='utf-8')
old_provider = '''let activeAiProviderUsed = "gemini";
async function generateText(
  system: string,
  messages: any[],
  temperature: number,
  preferredProvider: string,
): Promise<string> {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (preferredProvider === "openrouter" && hasOpenRouter) {
    try {
      const text = await callOpenRouter(
        [{ role: "system", content: system }, ...messages],
        temperature,
      );
      activeAiProviderUsed = "openrouter";
      return text;
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
        activeAiProviderUsed = "gemini";
        return (response?.text || "").trim();
      }
      throw openRouterErr;
    }
  }

  if (hasGemini) {
    const response = await getGeminiClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: { systemInstruction: system },
    });
    activeAiProviderUsed = "gemini";
    return (response?.text || "").trim();
  }

  if (hasOpenRouter) {
    const text = await callOpenRouter(
      [{ role: "system", content: system }, ...messages],
      temperature,
    );
    activeAiProviderUsed = "openrouter";
    return text;
  }

  throw new Error("Yapay zeka anahtarı (GEMINI_API_KEY veya OPENROUTER_API_KEY) bulunamadı.");
}
'''
new_provider = '''type AiProviderUsed = "gemini" | "openrouter" | "deterministic_fallback";
type GeneratedTextResult = {
  text: string;
  providerUsed: Exclude<AiProviderUsed, "deterministic_fallback">;
};
async function generateTextResult(
  system: string,
  messages: any[],
  temperature: number,
  preferredProvider: string,
): Promise<GeneratedTextResult> {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (preferredProvider === "openrouter" && hasOpenRouter) {
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

  if (hasOpenRouter) {
    const text = await callOpenRouter(
      [{ role: "system", content: system }, ...messages],
      temperature,
    );
    return { text, providerUsed: "openrouter" };
  }

  throw new Error("Yapay zeka anahtarı (GEMINI_API_KEY veya OPENROUTER_API_KEY) bulunamadı.");
}
async function generateText(
  system: string,
  messages: any[],
  temperature: number,
  preferredProvider: string,
): Promise<string> {
  return (await generateTextResult(system, messages, temperature, preferredProvider)).text;
}
'''
if old_provider not in server:
    raise SystemExit('provider block not found')
server = server.replace(old_provider, new_provider, 1)

old_initial = '''    const aiStart = now();
    let reply = "";
    let providerFailureFallbackUsed = false;
    try {
      reply = sanitizeKairoReplyText(
        await generateText(system, msgs, 0.78, provider),
      );
    } catch (generationError) {
'''
new_initial = '''    const aiStart = now();
    let reply = "";
    let providerFailureFallbackUsed = false;
    let activeAiProviderUsed: AiProviderUsed = provider === "gemini" ? "gemini" : "openrouter";
    try {
      const generated = await generateTextResult(system, msgs, 0.78, provider);
      reply = sanitizeKairoReplyText(generated.text);
      activeAiProviderUsed = generated.providerUsed;
    } catch (generationError) {
'''
if old_initial not in server:
    raise SystemExit('initial generation block not found')
server = server.replace(old_initial, new_initial, 1)

old_repair = '''        const repairedReply = sanitizeKairoReplyText(
          await Promise.race([
            generateText(
              `${system}\\nDÜZELTME KAPISI: Önceki taslak şu nedenle reddedildi: ${groundingIssues.join("; ")}. Aynı doğal konuşma tonunu koruyarak yalnızca bu hataları düzelt.`,
              msgs,
              0.35,
              provider,
            ),
            sleep(8000, ""),
          ]),
        );
        if (!repairedReply.trim()) throw new Error("KDM onarım zaman aşımı");
'''
new_repair = '''        const repairedGeneration = await Promise.race([
          generateTextResult(
            `${system}\\nDÜZELTME KAPISI: Önceki taslak şu nedenle reddedildi: ${groundingIssues.join("; ")}. Aynı doğal konuşma tonunu koruyarak yalnızca bu hataları düzelt.`,
            msgs,
            0.35,
            provider,
          ),
          sleep<GeneratedTextResult | null>(8000, null),
        ]);
        if (!repairedGeneration?.text.trim()) throw new Error("KDM onarım zaman aşımı");
        const repairedReply = sanitizeKairoReplyText(repairedGeneration.text);
'''
if old_repair not in server:
    raise SystemExit('repair generation block not found')
server = server.replace(old_repair, new_repair, 1)

old_accept = '''        if (repairedIssues.length < groundingIssues.length) {
          reply = repairedReply;
          groundingIssues = repairedIssues;
        }
'''
new_accept = '''        if (repairedIssues.length < groundingIssues.length) {
          reply = repairedReply;
          groundingIssues = repairedIssues;
          activeAiProviderUsed = repairedGeneration.providerUsed;
        }
'''
if old_accept not in server:
    raise SystemExit('repair accept block not found')
server = server.replace(old_accept, new_accept, 1)
server_path.write_text(server, encoding='utf-8')

client_path = Path('src/services/droitChatService.ts')
client = client_path.read_text(encoding='utf-8')
old_union = 'export type KairoProviderUsed = KairoProvider | "local_language";'
new_union = 'export type KairoProviderUsed = KairoProvider | "local_language" | "deterministic_fallback";'
if old_union not in client:
    raise SystemExit('client provider union not found')
client_path.write_text(client.replace(old_union, new_union, 1), encoding='utf-8')
