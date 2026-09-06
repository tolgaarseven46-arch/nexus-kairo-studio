from pathlib import Path

Path('src/services/kairaFinalDeliveryGate.ts').write_text('''export interface KairaFinalConsistencySnapshot {\n  accepted: boolean;\n  score: number;\n  issues: string[];\n}\n\nexport interface KairaFinalDeliveryDecision {\n  accepted: boolean;\n  candidateReply: string;\n  persistedReply: string;\n  score: number;\n  issues: string[];\n}\n\nexport function resolveKairaFinalDelivery(\n  candidateReply: string,\n  consistency: KairaFinalConsistencySnapshot,\n): KairaFinalDeliveryDecision {\n  const accepted = consistency.accepted === true;\n  return {\n    accepted,\n    candidateReply,\n    persistedReply: accepted ? candidateReply : "",\n    score: consistency.score,\n    issues: [...consistency.issues],\n  };\n}\n\nexport function buildKairaFinalDeliveryRejectionError(\n  decision: KairaFinalDeliveryDecision,\n): Error {\n  const issueText = decision.issues.length ? decision.issues.join("; ") : "unknown_final_delivery_issue";\n  const error = new Error(`final_delivery_rejected: ${issueText}`);\n  error.name = "KairaFinalDeliveryRejectedError";\n  return error;\n}\n''', encoding='utf-8')

Path('src/services/kairaFinalDeliveryGateRegression.test.ts').write_text('''import { describe, expect, it } from "vitest";\nimport {\n  buildKairaFinalDeliveryRejectionError,\n  resolveKairaFinalDelivery,\n} from "./kairaFinalDeliveryGate";\n\ndescribe("final delivery gate regression", () => {\n  it("passes an accepted candidate through unchanged", () => {\n    const decision = resolveKairaFinalDelivery("niye ya", { accepted: true, score: 100, issues: [] });\n    expect(decision.accepted).toBe(true);\n    expect(decision.persistedReply).toBe("niye ya");\n  });\n\n  it("keeps the rejected candidate only for diagnostics and removes it from conversational persistence", () => {\n    const decision = resolveKairaFinalDelivery("he anladım", {\n      accepted: false,\n      score: 70,\n      issues: ["response_plan_content_engagement_missing"],\n    });\n    expect(decision.accepted).toBe(false);\n    expect(decision.candidateReply).toBe("he anladım");\n    expect(decision.persistedReply).toBe("");\n    expect(buildKairaFinalDeliveryRejectionError(decision).message).toContain(\n      "response_plan_content_engagement_missing",\n    );\n  });\n});\n''', encoding='utf-8')

p = Path('server.ts')
s = p.read_text(encoding='utf-8')
import_anchor = 'import { runKairaResponseConstraintPass } from "./src/services/kairaResponseConstraintPass";\n'
import_line = 'import { buildKairaFinalDeliveryRejectionError, resolveKairaFinalDelivery } from "./src/services/kairaFinalDeliveryGate";\n'
if import_line not in s:
    if import_anchor not in s: raise SystemExit('import anchor missing')
    s = s.replace(import_anchor, import_anchor + import_line, 1)

local_anchor = '      const userFacingReply = await attachActivityPermission(reply);\n      if (kairaPolicy.persistentUserMemory && consistency.accepted) {\n'
local_replace = '      const finalDelivery = resolveKairaFinalDelivery(reply, consistency);\n      const userFacingReply = finalDelivery.accepted\n        ? await attachActivityPermission(reply)\n        : finalDelivery.persistedReply;\n      if (kairaPolicy.persistentUserMemory && consistency.accepted) {\n'
if local_anchor not in s: raise SystemExit('local anchor missing')
s = s.replace(local_anchor, local_replace, 1)

local_knt_anchor = '        saveKntTrace({\n          userId: stateUserId,\n          userMessage,\n          reply: userFacingReply,\n'
local_knt_replace = '        saveKntTrace({\n          userId: stateUserId,\n          userMessage,\n          reply: finalDelivery.candidateReply,\n'
if local_knt_anchor not in s: raise SystemExit('local KNT anchor missing')
s = s.replace(local_knt_anchor, local_knt_replace, 1)

local_send_anchor = '      await sendChatPayload({\n        sessionId,\n        turnId: savedTurnId,\n'
local_send_replace = '      if (!consistency.accepted) {\n        throw buildKairaFinalDeliveryRejectionError(finalDelivery);\n      }\n      await sendChatPayload({\n        sessionId,\n        turnId: savedTurnId,\n'
if local_send_anchor not in s: raise SystemExit('local send anchor missing')
s = s.replace(local_send_anchor, local_send_replace, 1)

ai_anchor = '    if (kairaPolicy.persistentUserMemory && consistency.accepted && !providerFailureFallbackUsed) {\n      learnLanguageReply(stateUserId, reply);\n    }\n    reply = await attachActivityPermission(reply);\n    const postStart = now();\n'
ai_replace = '    if (kairaPolicy.persistentUserMemory && consistency.accepted && !providerFailureFallbackUsed) {\n      learnLanguageReply(stateUserId, reply);\n    }\n    const finalDelivery = resolveKairaFinalDelivery(reply, consistency);\n    reply = finalDelivery.accepted\n      ? await attachActivityPermission(reply)\n      : finalDelivery.persistedReply;\n    const postStart = now();\n'
if ai_anchor not in s: raise SystemExit('AI anchor missing')
s = s.replace(ai_anchor, ai_replace, 1)

ai_knt_anchor = '      saveKntTrace({\n        userId: stateUserId,\n        userMessage,\n        reply,\n        reasoningTrace: kdm.trace,\n'
ai_knt_replace = '      saveKntTrace({\n        userId: stateUserId,\n        userMessage,\n        reply: finalDelivery.candidateReply,\n        reasoningTrace: kdm.trace,\n'
if ai_knt_anchor not in s: raise SystemExit('AI KNT anchor missing')
s = s.replace(ai_knt_anchor, ai_knt_replace, 1)

ai_send_anchor = '    await sendChatPayload({\n      sessionId,\n      turnId: savedTurnId,\n'
ai_send_replace = '    if (!consistency.accepted) {\n      throw buildKairaFinalDeliveryRejectionError(finalDelivery);\n    }\n    await sendChatPayload({\n      sessionId,\n      turnId: savedTurnId,\n'
if ai_send_anchor not in s: raise SystemExit('AI send anchor missing')
s = s.replace(ai_send_anchor, ai_send_replace, 1)
p.write_text(s, encoding='utf-8')

Path('src/services/kairaFinalDeliveryEnforcementCharacterization.test.ts').write_text('''import { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\nimport { describe, expect, it } from "vitest";\n\ndescribe("final delivery enforcement characterization", () => {\n  it("gates every user-facing chat payload on final consistency acceptance", () => {\n    const source = readFileSync(resolve(process.cwd(), "server.ts"), "utf8");\n    const gateMatches = source.match(/if\\s*\\(\\s*!consistency\\.accepted\\s*\\)\\s*\\{/gu) ?? [];\n    const sendMatches = source.match(/await sendChatPayload\\(\\{/gu) ?? [];\n    expect(gateMatches.length).toBe(sendMatches.length);\n    expect(gateMatches.length).toBeGreaterThanOrEqual(2);\n  });\n\n  it("does not persist a rejected assistant candidate as conversational memory", () => {\n    const gateSource = readFileSync(resolve(process.cwd(), "src/services/kairaFinalDeliveryGate.ts"), "utf8");\n    expect(gateSource).toContain("persistedReply: accepted ? candidateReply : \\\"\\\"");\n  });\n});\n''', encoding='utf-8')

Path('docs/adr/0062-final-delivery-enforcement-gate.md').write_text('''# ADR-0062 — Final delivery enforcement gate\n\n## Status\nAccepted\n\n## Context\nThe 2026-09-06 real-user KNT session proved that final consistency had become diagnostically useful but was not a delivery gate. Turn 14 produced `accepted=false`, score 70 and `response_plan_content_engagement_missing`, while the same invalid candidate (`he anladım`) was still returned to the user. Current `main` confirmed that `consistency.accepted` gated language learning/metrics only; both user-facing `sendChatPayload` paths had no fail-closed branch.\n\nThis is not a regression in an existing gate. The enforcement point did not exist.\n\n## Decision\n- Add one deterministic final-delivery gate owned by the already-computed final consistency result.\n- Both local-language and provider delivery paths reject `accepted=false` before `sendChatPayload`.\n- A rejected candidate is retained only in KNT diagnostics and blanked from conversational persistence.\n- The user event/state transition may still persist; only the invalid Kaira utterance is blocked.\n- Rejection is a transport/runtime failure (`final_delivery_rejected`), not a new conversational fallback, so the gate adds no new WHAT authority.\n- Existing repair/fallback logic remains responsible for producing a valid candidate before this last gate.\n- No provider/API call is added by the gate.\n\n## Consequences\nA response known to violate canonical final constraints can no longer be delivered as if valid. If all existing repair/fallback paths still fail, the request fails explicitly instead of leaking a known-invalid Kaira message.\n''', encoding='utf-8')

state = Path('PROJECT_STATE.md')
st = state.read_text(encoding='utf-8')
note = '''\n\n## 2026-09-06 — Real-user acceptance: final delivery enforcement\n- 16-turn real-user KNT Turn 14 exposed the first bounded post-acceptance systemic gap: `consistency.accepted=false` (`response_plan_content_engagement_missing`) was diagnostic only and the invalid reply still reached `sendChatPayload`.\n- Current-main code inspection proved there was no existing fail-closed final-delivery gate; `consistency.accepted` only gated language learning/metrics.\n- ADR-0062 adds a deterministic final gate to both local and provider user-delivery paths. Rejected candidates remain KNT diagnostics only and are blanked from conversational persistence; the user/state event may still persist.\n- The gate invents no replacement WHAT content and adds no provider/API calls. Development/audit/CI remain API-free; provider use remains reserved for real-user acceptance.\n'''
if '## 2026-09-06 — Real-user acceptance: final delivery enforcement' not in st:
    state.write_text(st.rstrip() + note + '\n', encoding='utf-8')
