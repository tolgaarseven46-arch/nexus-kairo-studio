import type { LanguageUnderstandingContext } from "./languageUnderstandingService";

export type EntityRole =
  | "speaker"
  | "addressee"
  | "first_person"
  | "second_person"
  | "named_person"
  | "character";

export interface ResolvedEntityReference {
  surface: string;
  normalized: string;
  role: EntityRole;
  resolvedId?: string;
  resolvedName?: string;
  confidence: number;
}

export interface EntityResolutionResult {
  speaker: {
    id?: string;
    name?: string;
  };
  addressee: {
    id: "kaira";
    name: string;
  };
  references: ResolvedEntityReference[];
  namedPeople: string[];
  ambiguities: string[];
  confidence: number;
}

const FIRST_PERSON = new Set([
  "ben",
  "bana",
  "beni",
  "benim",
  "bende",
  "benden",
  "benimle",
  "benle",
]);

const SECOND_PERSON = new Set([
  "sen",
  "sana",
  "seni",
  "senin",
  "sende",
  "senden",
  "seninle",
  "senle",
]);

const PERSON_CONTEXT_WORDS = new Set([
  ...FIRST_PERSON,
  ...SECOND_PERSON,
  "dedi",
  "demiş",
  "demisti",
  "demişti",
  "söyledi",
  "soyledi",
  "söylemiş",
  "soylemis",
  "yazdı",
  "yazdi",
  "sordu",
]);

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

const sameName = (a?: string, b?: string) =>
  Boolean(a && b && normalize(a) === normalize(b));

const looksLikeProperNameToken = (token?: string) =>
  Boolean(token && /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/u.test(token));

/**
 * Lightweight discourse/entity resolver.
 *
 * This layer deliberately does not decide emotion, intent or behavior. It only
 * anchors pronouns/names to the current discourse participants and surfaces
 * ambiguity instead of inventing an identity.
 */
export function resolveMessageEntities(
  message: string,
  context: LanguageUnderstandingContext = {},
): EntityResolutionResult {
  const characterName = context.characterName || "Kaira";
  const userName = context.userName;
  const references: ResolvedEntityReference[] = [];
  const ambiguities: string[] = [];
  const namedPeople = new Set<string>();

  const tokens = message.match(/[\p{L}ÇĞİÖŞÜçğıöşü]+/gu) ?? [];

  for (const [tokenIndex, token] of tokens.entries()) {
    const normalized = normalize(token);
    if (!normalized) continue;

    if (FIRST_PERSON.has(normalized)) {
      references.push({
        surface: token,
        normalized,
        role: "first_person",
        resolvedId: userName ? "current_user" : undefined,
        resolvedName: userName,
        confidence: userName ? 1 : 0.7,
      });
      continue;
    }

    if (SECOND_PERSON.has(normalized)) {
      references.push({
        surface: token,
        normalized,
        role: "second_person",
        resolvedId: "kaira",
        resolvedName: characterName,
        confidence: 0.98,
      });
      continue;
    }

    if (sameName(token, characterName)) {
      references.push({
        surface: token,
        normalized,
        role: "character",
        resolvedId: "kaira",
        resolvedName: characterName,
        confidence: 1,
      });
      continue;
    }

    if (userName && sameName(token, userName)) {
      namedPeople.add(userName);
      references.push({
        surface: token,
        normalized,
        role: "named_person",
        resolvedId: "current_user",
        resolvedName: userName,
        confidence: 1,
      });
      continue;
    }

    const looksLikeProperName = looksLikeProperNameToken(token);
    const sentenceInitialPersonContext =
      tokenIndex === 0 &&
      tokens
        .slice(1, 4)
        .some((nextToken) => PERSON_CONTEXT_WORDS.has(normalize(nextToken)));
    const sentenceInitialContrastiveName =
      tokenIndex === 0 &&
      normalize(tokens[1] || "") === "mi" &&
      looksLikeProperNameToken(tokens[2]) &&
      normalize(tokens[3] || "") === "mi";

    // Sentence-initial capitalization alone is weak evidence ("Mal aldım").
    // Keep an unknown initial token as a person when nearby discourse supports
    // a person reading, including contrastive questions such as
    // "Ayşe mi Merve mi ...?".
    if (
      looksLikeProperName &&
      (tokenIndex > 0 || sentenceInitialPersonContext || sentenceInitialContrastiveName)
    ) {
      namedPeople.add(token);
      references.push({
        surface: token,
        normalized,
        role: "named_person",
        resolvedName: token,
        confidence: tokenIndex === 0 ? 0.65 : 0.55,
      });
    }
  }

  if (userName) {
    const userPattern = normalize(userName);
    const normalizedMessage = message.toLocaleLowerCase("tr-TR");
    const hasExplicitUserName = new RegExp(`(^|\\s)${userPattern}(?=\\s|$)`, "iu").test(
      normalizedMessage,
    );
    const hasFirstPerson = references.some((item) => item.role === "first_person");

    if (hasExplicitUserName && hasFirstPerson) {
      ambiguities.push(
        `Mesaj hem konuşanın adını (${userName}) hem de birinci şahıs ifadesini içeriyor; anlatılan olayda aynı kişi iki farklı söylem rolünde görünebilir.`,
      );
    }
  }

  const unresolvedNamed = references.filter(
    (item) => item.role === "named_person" && !item.resolvedId,
  ).length;
  const confidence = Math.max(
    0.35,
    Math.min(1, 0.96 - ambiguities.length * 0.18 - unresolvedNamed * 0.08),
  );

  return {
    speaker: {
      id: userName ? "current_user" : undefined,
      name: userName,
    },
    addressee: {
      id: "kaira",
      name: characterName,
    },
    references,
    namedPeople: [...namedPeople],
    ambiguities,
    confidence,
  };
}
