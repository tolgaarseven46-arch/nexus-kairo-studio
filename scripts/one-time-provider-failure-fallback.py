from pathlib import Path

path = Path('server.ts')
text = path.read_text(encoding='utf-8')
old = '''    const aiStart = now();
    let reply = sanitizeKairoReplyText(
      await generateText(system, msgs, 0.78, provider),
    );
'''
new = '''    const aiStart = now();
    let reply = "";
    let providerFailureFallbackUsed = false;
    try {
      reply = sanitizeKairoReplyText(
        await generateText(system, msgs, 0.78, provider),
      );
    } catch (generationError) {
      const providerFallback = buildGroundedDialogueFallback(
        dialogueDecision,
        cleanHistory,
        userMessage,
        userName,
        dialogueAnalysis,
        responsePlan.allowQuestion,
      );
      if (!providerFallback) throw generationError;
      reply = providerFallback;
      providerFailureFallbackUsed = true;
      activeAiProviderUsed = "deterministic_fallback";
    }
'''
if old not in text:
    raise SystemExit('initial generation seam not found')
text = text.replace(old, new, 1)
old_learning = '''    if (kairaPolicy.persistentUserMemory && consistency.accepted) {
      learnLanguageReply(stateUserId, reply);
    }
'''
new_learning = '''    if (kairaPolicy.persistentUserMemory && consistency.accepted && !providerFailureFallbackUsed) {
      learnLanguageReply(stateUserId, reply);
    }
'''
if old_learning not in text:
    raise SystemExit('language learning seam not found')
text = text.replace(old_learning, new_learning, 1)
path.write_text(text, encoding='utf-8')
