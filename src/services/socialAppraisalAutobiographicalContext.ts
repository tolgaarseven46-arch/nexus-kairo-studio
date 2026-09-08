import type { SocialAppraisalAutobiographicalContext } from "../types/socialAppraisal";
import type { KairaCanonicalIdentityState } from "./kairaCanonicalIdentity";
import { persistentUserIdentityScope } from "./kairaInstanceContext";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Stable participant id shared with lived-memory consolidation. */
export function socialAppraisalParticipantIdForUser(userId?: string): string {
  return `user:${persistentUserIdentityScope(userId)}`;
}

/**
 * Build a typed, bounded appraisal summary for the active user only.
 *
 * Authority constraints:
 * - exact participant ownership match only;
 * - lived + ordinary canonical memories only;
 * - no eventType/fact/emotion-label interpretation;
 * - raw autobiographical records never enter SocialAppraisal.
 */
export function buildSocialAppraisalAutobiographicalContext(
  identity: Pick<KairaCanonicalIdentityState, "autobiographicalMemories"> | null | undefined,
  userId?: string,
): SocialAppraisalAutobiographicalContext | null {
  if (!identity) return null;
  const participantId = socialAppraisalParticipantIdForUser(userId);
  const episodes = identity.autobiographicalMemories.filter(
    (memory) =>
      memory.canonical === true &&
      memory.origin === "lived" &&
      memory.sensitivity === "ordinary" &&
      memory.participantIds.includes(participantId),
  );
  if (!episodes.length) return null;

  const saliences = episodes.map((memory) => clamp01(Number(memory.salience) || 0));
  const emotionalIntensities = episodes.map((memory) =>
    clamp01(
      Math.max(
        0,
        ...memory.emotions.map((emotion) => Number(emotion.intensity) || 0),
      ),
    ),
  );
  const mean = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  return {
    participantId,
    episodeCount: episodes.length,
    salientEpisodeCount: saliences.filter((value) => value >= 0.65).length,
    meanSalience: clamp01(mean(saliences)),
    maxSalience: clamp01(Math.max(0, ...saliences)),
    meanEmotionalIntensity: clamp01(mean(emotionalIntensities)),
  };
}
