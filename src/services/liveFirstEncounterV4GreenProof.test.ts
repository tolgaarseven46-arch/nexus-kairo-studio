import { describe, expect, it } from "vitest";

describe("LIVE GREEN proof: first-encounter latency v4", () => {
  it("keeps iyilik local and below the production latency gate", async () => {
    const probeId = `live-v4-${Date.now()}`;
    const started = Date.now();
    const response = await fetch("https://nexus-kairo-studio.onrender.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: probeId,
        userName: "LiveProof",
        userMessage: "iyilik",
        character: { name: "Kaira" },
        history: [{ sender: "droit", text: "gayet iyiyim, sen nasılsın?" }],
        provider: "openrouter",
        conversationPhase: "first_encounter",
        firstEncounterContext: { roomId: "live-proof-room", roomName: "live-proof", isOwner: true },
        sessionId: `session_${probeId}`,
        requestId: `request_${probeId}`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const clientMs = Date.now() - started;
    const body = await response.json() as any;
    console.log("LIVE_FIRST_ENCOUNTER_V4_GREEN", JSON.stringify({
      httpStatus: response.status,
      clientMs,
      reply: body.reply,
      providerUsed: body.providerUsed,
      semanticRoutine: body.kdm?.semanticEvent?.socialRoutine,
      semanticSource: body.kdm?.semanticSource,
      variantId: body.localLanguage?.variantId,
      timings: body.timings,
      sessionId: body.sessionId,
      turnId: body.turnId,
    }));

    expect(response.status).toBe(200);
    expect(body.providerUsed).toBe("local_language");
    expect(body.kdm?.semanticEvent?.socialRoutine).toBe("well_being_reply");
    expect(body.localLanguage?.variantId).toMatch(/^first_encounter_well_being_reply_v\d+$/);
    expect(body.timings?.aiMs).toBe(0);
    expect(body.timings?.serverTotalMs).toBeLessThan(5000);
    expect(clientMs).toBeLessThan(7000);
  }, 20000);
});
