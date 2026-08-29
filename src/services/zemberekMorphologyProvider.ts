import type {
  MorphologyProvider,
  TurkishMorphologyResult,
  TurkishMorphToken,
} from "./languageUnderstandingService";

export interface ZemberekRestMorphologyOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

const lexicalTokens = (message: string) =>
  message.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu) ?? [];

const cleanBaseUrl = (value: string) => value.replace(/\/+$/, "");

function stringCandidates(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringCandidates);
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  return [
    ...stringCandidates(record.lemma),
    ...stringCandidates(record.lemmas),
    ...stringCandidates(record.result),
    ...stringCandidates(record.results),
    ...stringCandidates(record.output),
    ...stringCandidates(record.data),
  ];
}

const normalizeLemma = (value: string) =>
  value
    .trim()
    .replace(/^\[|\]$/g, "")
    .split(/[;,|]/u)[0]
    ?.trim();

async function fetchLemma(
  baseUrl: string,
  word: string,
  timeoutMs: number,
): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = new URLSearchParams({ word, show_input: "1" });
    const response = await fetch(`${baseUrl}/lemmas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawText = await response.text();
    let parsed: unknown = rawText;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Some Zemberek REST wrappers return plain text; keep rawText.
    }

    const candidates = stringCandidates(parsed)
      .map(normalizeLemma)
      .filter((item): item is string => Boolean(item));

    return candidates.find(
      (candidate) =>
        candidate.toLocaleLowerCase("tr-TR") !==
        word.toLocaleLowerCase("tr-TR"),
    ) ?? candidates[0];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Optional morphology provider for a Zemberek-compatible REST service.
 *
 * No dependency is added to the Kaira process: when ZEMBEREK_REST_URL is not
 * configured, callers simply omit this provider and the language-understanding
 * gateway falls back safely.
 *
 * Compatible endpoint contract:
 * POST /lemmas
 * Content-Type: application/x-www-form-urlencoded
 * fields: word, show_input
 */
export class ZemberekRestMorphologyProvider implements MorphologyProvider {
  readonly name = "zemberek_rest";
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: ZemberekRestMorphologyOptions = {}) {
    const configured = options.baseUrl ?? process.env.ZEMBEREK_REST_URL;
    if (!configured?.trim()) {
      throw new Error("ZEMBEREK_REST_URL is not configured.");
    }
    this.baseUrl = cleanBaseUrl(configured.trim());
    this.timeoutMs = Math.max(100, options.timeoutMs ?? 1200);
  }

  async analyze(message: string): Promise<TurkishMorphologyResult> {
    const surfaces = lexicalTokens(message);
    const tokens: TurkishMorphToken[] = [];

    for (const surface of surfaces) {
      const lemma = await fetchLemma(this.baseUrl, surface, this.timeoutMs);
      tokens.push({
        surface,
        normalized: surface.toLocaleLowerCase("tr-TR"),
        ...(lemma ? { lemma } : {}),
      });
    }

    return {
      provider: this.name,
      normalizedText: message
        .toLocaleLowerCase("tr-TR")
        .replace(/[’]/g, "'")
        .replace(/\s+/g, " ")
        .trim(),
      tokens,
    };
  }
}

export function createConfiguredZemberekMorphologyProvider():
  | ZemberekRestMorphologyProvider
  | undefined {
  if (!process.env.ZEMBEREK_REST_URL?.trim()) return undefined;
  return new ZemberekRestMorphologyProvider();
}
