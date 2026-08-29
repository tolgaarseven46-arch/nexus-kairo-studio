import { afterEach, describe, expect, it, vi } from "vitest";
import { ZemberekRestMorphologyProvider } from "./zemberekMorphologyProvider";

describe("ZemberekRestMorphologyProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns lemma-aware Turkish tokens", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = init?.body as URLSearchParams;
        const word = body.get("word");
        const lemma = word === "salaksın" ? "salak" : word;
        return new Response(JSON.stringify({ lemmas: [lemma] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    const provider = new ZemberekRestMorphologyProvider({
      baseUrl: "http://localhost:4567",
    });

    const result = await provider.analyze("Kaira sen salaksın");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.provider).toBe("zemberek_rest");
    expect(result.tokens.map((token) => token.lemma)).toEqual([
      "Kaira",
      "sen",
      "salak",
    ]);
  });

  it("fails fast when no service URL is configured", () => {
    const previous = process.env.ZEMBEREK_REST_URL;
    delete process.env.ZEMBEREK_REST_URL;

    expect(() => new ZemberekRestMorphologyProvider()).toThrow(
      "ZEMBEREK_REST_URL is not configured",
    );

    if (previous === undefined) delete process.env.ZEMBEREK_REST_URL;
    else process.env.ZEMBEREK_REST_URL = previous;
  });
});
