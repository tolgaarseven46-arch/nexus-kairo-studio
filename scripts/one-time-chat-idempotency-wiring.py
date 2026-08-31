from pathlib import Path

server_path = Path('server.ts')
server = server_path.read_text(encoding='utf-8')

import_anchor = 'import { normalizeBehaviorPolicyInput } from "./src/services/behaviorPolicyInput";\n'
import_line = 'import { claimKairaChatRequest, completeKairaChatRequest, failKairaChatRequest } from "./src/services/kairaChatIdempotency";\n'
if import_line not in server:
    if import_anchor not in server:
        raise SystemExit('server import anchor not found')
    server = server.replace(import_anchor, import_anchor + import_line, 1)

handler_anchor = 'app.post("/api/chat", async (req, res) => {\n  const serverStart = now();\n  try {\n'
handler_replacement = 'app.post("/api/chat", async (req, res) => {\n  const serverStart = now();\n  let idempotencyKey = "";\n  let ownsIdempotencyClaim = false;\n  try {\n'
if handler_anchor not in server:
    raise SystemExit('chat handler anchor not found')
server = server.replace(handler_anchor, handler_replacement, 1)

request_destructure_anchor = '      kairaInstanceType: incomingKairaInstanceType,\n    } = req.body;\n'
request_destructure_replacement = '      kairaInstanceType: incomingKairaInstanceType,\n      requestId: incomingRequestId,\n    } = req.body;\n'
if request_destructure_anchor not in server:
    raise SystemExit('request destructure anchor not found')
server = server.replace(request_destructure_anchor, request_destructure_replacement, 1)

claim_anchor = '    const sessionId = incomingSessionId?.trim() || `session_${stateUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;\n    const cleanHistory = sanitizeKairoChatHistory(history);\n'
claim_replacement = '''    const sessionId = incomingSessionId?.trim() || `session_${stateUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const requestId = typeof incomingRequestId === "string" ? incomingRequestId.trim().slice(0, 160) : "";
    idempotencyKey = requestId ? `${stateUserId}::${kairaInstance.instanceId}::${requestId}` : "";
    if (idempotencyKey) {
      const claim = claimKairaChatRequest<any>(idempotencyKey);
      if (claim.kind === "replay") return res.json(claim.payload);
      if (claim.kind === "wait") {
        const outcome = await claim.outcome;
        if (outcome.ok) return res.json(outcome.payload);
        throw new Error(outcome.errorMessage);
      }
      ownsIdempotencyClaim = true;
    }
    const sendChatPayload = (payload: any) => {
      if (idempotencyKey && ownsIdempotencyClaim) {
        completeKairaChatRequest(idempotencyKey, payload);
        ownsIdempotencyClaim = false;
      }
      return res.json(payload);
    };
    const cleanHistory = sanitizeKairoChatHistory(history);
'''
if claim_anchor not in server:
    raise SystemExit('claim anchor not found')
server = server.replace(claim_anchor, claim_replacement, 1)

local_marker = '      res.json({\n        sessionId,\n        turnId: savedTurnId,\n        kairaInstanceId: kairaInstance.instanceId,\n'
local_replacement = '      sendChatPayload({\n        sessionId,\n        turnId: savedTurnId,\n        requestId: requestId || undefined,\n        kairaInstanceId: kairaInstance.instanceId,\n'
if local_marker not in server:
    raise SystemExit('local response marker not found')
server = server.replace(local_marker, local_replacement, 1)

ai_marker = '    res.json({\n      sessionId,\n      turnId: savedTurnId,\n      kairaInstanceId: kairaInstance.instanceId,\n'
ai_replacement = '    sendChatPayload({\n      sessionId,\n      turnId: savedTurnId,\n      requestId: requestId || undefined,\n      kairaInstanceId: kairaInstance.instanceId,\n'
if ai_marker not in server:
    raise SystemExit('ai response marker not found')
server = server.replace(ai_marker, ai_replacement, 1)

catch_anchor = '''  } catch (e: any) {
    console.error(e);
    if (!res.headersSent)
      res.status(500).json({ error: e?.message || "Chat service failed" });
  }
});
'''
catch_replacement = '''  } catch (e: any) {
    console.error(e);
    if (idempotencyKey && ownsIdempotencyClaim) {
      failKairaChatRequest(idempotencyKey, e);
      ownsIdempotencyClaim = false;
    }
    if (!res.headersSent)
      res.status(500).json({ error: e?.message || "Chat service failed" });
  }
});
'''
if catch_anchor not in server:
    raise SystemExit('chat catch anchor not found')
server = server.replace(catch_anchor, catch_replacement, 1)
server_path.write_text(server, encoding='utf-8')

client_path = Path('src/services/droitChatService.ts')
client = client_path.read_text(encoding='utf-8')
client_import_anchor = 'import { normalizeFineTuneProfile } from "./fineTuneProfileNormalizer";\n'
client_import = 'import { acquireKairaChatRequestIdentity, buildKairaChatRetryFingerprint, completeKairaChatRequestIdentity } from "./kairaChatRetryIdentity";\n'
if client_import not in client:
    if client_import_anchor not in client:
        raise SystemExit('client import anchor not found')
    client = client.replace(client_import_anchor, client_import_anchor + client_import, 1)

session_anchor = '    const resolvedSessionId = sessionId?.trim() || freshSessionId(userId, kairaInstance.instanceId);\n    const prepStart = performance.now();\n'
session_replacement = '''    const resolvedSessionId = sessionId?.trim() || freshSessionId(userId, kairaInstance.instanceId);
    const retryFingerprint = buildKairaChatRetryFingerprint({
      userId,
      kairaInstanceId: kairaInstance.instanceId,
      userMessage,
      dynamicState,
    });
    const requestId = acquireKairaChatRequestIdentity(retryFingerprint);
    const prepStart = performance.now();
'''
if session_anchor not in client:
    raise SystemExit('client session anchor not found')
client = client.replace(session_anchor, session_replacement, 1)

payload_anchor = 'const payload = { sessionId: resolvedSessionId, userId, userName, userMessage, semanticEvent,'
payload_replacement = 'const payload = { sessionId: resolvedSessionId, requestId, userId, userName, userMessage, semanticEvent,'
if payload_anchor not in client:
    raise SystemExit('client payload anchor not found')
client = client.replace(payload_anchor, payload_replacement, 1)

return_anchor = '      return { reply, profile: authoritativeBehaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed,'
return_replacement = '      completeKairaChatRequestIdentity(retryFingerprint);\n      return { reply, profile: authoritativeBehaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed,'
if return_anchor not in client:
    raise SystemExit('client success return anchor not found')
client = client.replace(return_anchor, return_replacement, 1)
client_path.write_text(client, encoding='utf-8')
