import { DroitDynamicState } from '../types/nexus';
import { BehaviorLayerProfile } from './droitBehaviorEngine';

export function applyRelationshipContext(
  profile: BehaviorLayerProfile,
  dynamicState?: DroitDynamicState | null,
): BehaviorLayerProfile {
  const relationship = dynamicState?.relationship;
  if (!relationship) return profile;

  const familiarity = Math.max(0, Math.min(1, relationship.familiarityDays / 30));
  const interactionFamiliarity = Math.max(0, Math.min(1, relationship.interactionCount / 40));
  const warmth = Math.max(0, Math.min(1, relationship.warmth / 100));
  const closeness = Math.max(0, Math.min(1, familiarity * 0.55 + interactionFamiliarity * 0.2 + warmth * 0.25));
  const establishedRelationship = relationship.familiarityDays >= 14 || relationship.interactionCount >= 20;
  const friendlyRelationship = closeness >= 0.55;

  const patienceLevel = Math.min(1, profile.patienceLevel + closeness * 0.22);
  const temperLevel = Math.max(0, profile.temperLevel - closeness * 0.18);
  const empathyLevel = Math.min(1, profile.empathyLevel + closeness * 0.10);
  const humorLevel = Math.min(1, profile.humorLevel + (friendlyRelationship ? closeness * 0.08 : 0));

  const relationshipDirectives = [
    establishedRelationship
      ? 'Kullanıcı artık tanıdık; gereksiz resmiyet ve mesafeyi azalt, daha doğal tepki ver.'
      : 'Kullanıcıyla ilişki henüz yeni; sıcak ol ama gereksiz samimiyet ve varsayımlardan kaçın.',
    friendlyRelationship
      ? 'İlişki sıcaklığı yüksek; küçük hatalara ve sert ifadelere ilk tanışmaya göre daha yüksek tolerans göster.'
      : 'İlişki henüz tam oturmadı; sınırları ve karşılıklı güveni koru.',
    friendlyRelationship
      ? 'Çatışmalı bir mesaj geldiğinde yakınlığın sağladığı toleransı göster; mizah kullanabilirsin ama rahatsızlığı tamamen yok sayma.'
      : 'Çatışmalı bir mesaj geldiğinde mizah yerine önce ilişki sınırını koru; kısa ve doğal bir tepki ver.',
    'Çatışmalı mesajlarda ilişki durumu mizah seviyesinden daha yüksek önceliğe sahiptir; yüksek mizah her sert mesajı espriye çevirmemelidir.',
  ];

  const tone = friendlyRelationship && profile.tone === 'formal' ? 'confident' : profile.tone;
  const dominantSummary = `${profile.dominantSummary}, ${establishedRelationship ? 'yerleşmiş ilişki' : 'gelişen ilişki'}`;
  const responseStyle = `${tone}_${profile.decisionSpeed}_rel${Math.round(closeness * 100)}`;

  return {
    ...profile,
    tone,
    patienceLevel,
    temperLevel,
    empathyLevel,
    humorLevel,
    responseStyle,
    behaviorDirectives: [...profile.behaviorDirectives, ...relationshipDirectives],
    dominantSummary,
    debugMatrix: {
      ...profile.debugMatrix,
      synthesizedParameters: {
        ...profile.debugMatrix.synthesizedParameters,
        relationshipCloseness: closeness,
        relationshipWarmth: warmth,
        familiarityDays: relationship.familiarityDays,
        interactionCount: relationship.interactionCount,
        toleranceMultiplier: 1 + closeness * 0.35,
      },
    },
  };
}
