import type { KairaWelcomeDecision } from "./kairaWelcomeDecision";

export interface KairaWelcomeRealizationInput {
  eventId: string;
  kairaInstanceId: string;
  actorDisplayName: string;
  roomName: string;
  decision: KairaWelcomeDecision;
}

export interface KairaWelcomeRealization {
  text: string;
  variantId: string;
  realizationVariantSeed: string;
}

const OWNER_OPENINGS = [
  "Selam",
  "Hey 😄",
  "Selam 😄",
  "Hey",
] as const;

const OWNER_IDENTITIES = [
  "Kaira ben",
  "Ben Kaira",
] as const;

const OWNER_ROOM_BEATS = [
  (roomName: string) =>
    roomName
      ? `“${roomName}” daha yeni; güzel, birlikte oturturuz.`
      : "Burası daha yeni; güzel, birlikte oturturuz.",
  (_roomName: string) =>
    "Yeni oda, boş sayfa sayılır 😄 zamanla kendi havasını bulur.",
  (roomName: string) =>
    roomName
      ? `“${roomName}” şimdilik tertemiz bir sayfa; bakalım nasıl bir yere dönüşecek.`
      : "Şimdilik tertemiz bir sayfa; bakalım nasıl bir yere dönüşecek.",
  (_roomName: string) =>
    "Daha ilk dakikalar 😄 ortam birazdan kendi şeklini bulur.",
] as const;

const MEMBER_OPENINGS = [
  (name: string) => `Selam ${name}, hoş geldin.`,
  (name: string) => `Hey ${name} 😄 hoş geldin.`,
  (name: string) => `${name}, hoş geldin.`,
  (name: string) => `Hoş geldin ${name}.`,
] as const;

const MEMBER_ROOM_BEATS = [
  (_roomName: string) => "Rahat ol, buralar çabuk tanıdık gelir.",
  (_roomName: string) => "Tam zamanında geldin 😄",
  (_roomName: string) => "Yerleş, birazdan ortamı kaparsın.",
  (roomName: string) =>
    roomName
      ? `“${roomName}”a hoş geldin; takıl kafana göre.`
      : "Takıl kafana göre, hoş geldin.",
] as const;

const fnv1a = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickIndex = (seed: string, axis: string, length: number) =>
  fnv1a(`${seed}:${axis}`) % length;

const cleanDisplayName = (value: string) => {
  const displayName = value.trim() || "arkadaşım";
  return /^(?:beta kullanıcısı|oyuncu|siz|sen|kullanıcı)$/iu.test(displayName)
    ? ""
    : displayName;
};

const cleanSpacing = (value: string) =>
  value
    .replace(/\s+([,.!?])/gu, "$1")
    .replace(/\s{2,}/gu, " ")
    .trim();

export function realizeKairaWelcome(
  input: KairaWelcomeRealizationInput,
): KairaWelcomeRealization {
  const seed = `${input.eventId}:${input.kairaInstanceId}:${input.decision.tone}`;
  const roomName = input.roomName.trim();
  const displayName = cleanDisplayName(input.actorDisplayName);

  let text: string;
  let variantId: string;

  if (input.decision.introduceSelf) {
    const openingIndex = pickIndex(seed, "opening", OWNER_OPENINGS.length);
    const identityIndex = pickIndex(seed, "identity", OWNER_IDENTITIES.length);
    const roomBeatIndex = pickIndex(seed, "roomBeat", OWNER_ROOM_BEATS.length);

    const opening = OWNER_OPENINGS[openingIndex];
    const identity = OWNER_IDENTITIES[identityIndex];
    const roomBeat = OWNER_ROOM_BEATS[roomBeatIndex](roomName);

    text = cleanSpacing(`${opening}, ${identity}. ${roomBeat}`);
    variantId = `room_created_o${openingIndex + 1}_i${identityIndex + 1}_r${roomBeatIndex + 1}`;
  } else {
    const openingIndex = pickIndex(seed, "opening", MEMBER_OPENINGS.length);
    const roomBeatIndex = pickIndex(seed, "roomBeat", MEMBER_ROOM_BEATS.length);

    const opening = displayName
      ? MEMBER_OPENINGS[openingIndex](displayName)
      : ["Selam, hoş geldin.", "Hey 😄 hoş geldin.", "Hoş geldin.", "Selam 😄 hoş geldin."][
          openingIndex
        ];
    const roomBeat = MEMBER_ROOM_BEATS[roomBeatIndex](roomName);

    text = cleanSpacing(`${opening} ${roomBeat}`);
    variantId = `participant_joined_o${openingIndex + 1}_r${roomBeatIndex + 1}`;
  }

  for (const term of input.decision.prohibitedTerms) {
    if (text.toLocaleLowerCase("tr-TR").includes(term.toLocaleLowerCase("tr-TR"))) {
      throw new Error(`welcome_realization_prohibited_term:${term}`);
    }
  }

  return {
    text,
    variantId,
    realizationVariantSeed: seed,
  };
}
