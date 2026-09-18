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

const ROOM_CREATED_VARIANTS = [
  (name: string) => `Selam ${name}. Ben Kaira; bir şey lazım olursa buradayım, gerisini seninle birlikte şekillendiririz.`,
  (name: string) => `Hoş geldin ${name}. Kaira ben — bu oda senin, ben de gerektiğinde yanında olurum.`,
  (name: string) => `Yeni oda güzel başladı ${name} 😄 Ben Kaira; yardım istersen buradayım, yoksa rahatına bak.`,
  (name: string) => `Selam! Ben Kaira. Burayı sen kuruyorsun; işin düşerse destek olurum, birlikte de canlandırırız.`,
  (name: string) => `Kaira ben. Yeni odan hayırlı olsun demeyeyim de 😄 Bir şeye ihtiyaç olursa buradayım.`,
  (name: string) => `Hey ${name}, ben Kaira. Sen ortamı kur, ben gerektiğinde el atarım.`,
  (name: string) => `Selam ${name}. Ben Kaira; sana yardımcı olmak için buradayım, bu odayı beraber güzel hale getiririz.`,
  (name: string) => `Hoş geldin. Ben Kaira — baskı yok; ihtiyacın olduğunda seslen, buradayım.`,
];

const PARTICIPANT_JOINED_VARIANTS = [
  (name: string) => `Selam ${name}, hoş geldin. Ben Kaira; bir şeye ihtiyacın olursa buradayım.`,
  (name: string) => `Hoş geldin ${name}. Kaira ben — yabancılık çekme, gerektiğinde seslen.`,
  (name: string) => `Hey ${name}, geldin demek 😄 Hoş geldin; ben Kaira, buralardayım.`,
  (name: string) => `Selam ${name}. Yeni geldin diye uzun konuşmayayım; hoş geldin, ben Kaira.`,
  (name: string) => `${name}, hoş geldin. Ben Kaira; ortamı sen keşfet, ihtiyaç olursa yanındayım.`,
  (name: string) => `Hoş geldin ${name}. Ben Kaira — keyfine bak, bir şey gerekirse seslen yeter.`,
  (name: string) => `Selam! Kaira ben. Hoş geldin ${name}; rahat ol, burası senin de ortamın artık.`,
  (name: string) => `Yeni biri geldi 👀 ${name}, hoş geldin. Ben Kaira, burada denk geliriz.`,
];

const fnv1a = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function realizeKairaWelcome(
  input: KairaWelcomeRealizationInput,
): KairaWelcomeRealization {
  const seed = `${input.eventId}:${input.kairaInstanceId}:${input.decision.tone}`;
  const variants =
    input.decision.introduceSelf ? ROOM_CREATED_VARIANTS : PARTICIPANT_JOINED_VARIANTS;
  const index = fnv1a(seed) % variants.length;
  const variantId = `${input.decision.introduceSelf ? "room_created" : "participant_joined"}_v${index + 1}`;
  const displayName = input.actorDisplayName.trim() || "arkadaşım";
  const genericName = /^(?:beta kullanıcısı|oyuncu|siz|kullanıcı)$/iu.test(displayName);
  const realized = variants[index](displayName);
  const text = genericName
    ? realized
        .replace(
          new RegExp("(^|\\\\s)" + displayName + "(?=[,.!?\\\\s]|$)", "giu"),
          "$1",
        )
        .replace(/^\\s*[,.-]+\\s*/u, "")
        .replace(/\\s+([,.!?])/gu, "$1")
        .replace(/\\s{2,}/gu, " ")
        .trim()
    : realized;

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
