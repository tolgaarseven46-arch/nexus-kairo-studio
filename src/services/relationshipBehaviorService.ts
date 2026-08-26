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
  const trust = Math.max(0, Math.min(1, (relationship.trust ?? 50) / 100));
  const conflict = Math.max(0, Math.min(1, (relationship.conflictScore ?? 0) / 100));
  const hurt = Math.max(0, Math.min(1, (relationship.hurtScore ?? 0) / 100));
  const repair = Math.max(0, Math.min(1, (relationship.repairProgress ?? 0) / 100));
  const historyQuality = Math.max(0, Math.min(1, (50 + (relationship.positiveEvents ?? 0) * 3 - (relationship.negativeEvents ?? 0) * 5) / 100));

  const closeness = Math.max(0, Math.min(1,
    familiarity * 0.27 +
    interactionFamiliarity * 0.13 +
    warmth * 0.18 +
    trust * 0.24 +
    historyQuality * 0.10 +
    repair * 0.08 -
    conflict * 0.25 -
    hurt * 0.22,
  ));

  const establishedRelationship = relationship.familiarityDays >= 14 || relationship.interactionCount >= 20;
  const friendlyRelationship = closeness >= 0.55 && trust >= 0.55 && conflict < 0.45 && hurt < 0.35;
  const damagedRelationship = conflict >= 0.55 || trust < 0.35 || hurt >= 0.55;
  const healingRelationship = !damagedRelationship && (hurt >= 0.2 || conflict >= 0.2) && repair >= 0.1;

  const patienceLevel = Math.min(1, profile.patienceLevel + closeness * 0.22);
  const temperLevel = Math.max(0, profile.temperLevel - closeness * 0.18 + conflict * 0.10 + hurt * 0.10);
  const empathyLevel = Math.min(1, profile.empathyLevel + closeness * 0.10);
  const humorLevel = Math.min(1, Math.max(0, profile.humorLevel + (friendlyRelationship ? closeness * 0.08 : 0) - (damagedRelationship ? 0.14 : healingRelationship ? 0.06 : 0)));

  const relationshipDirectives = [
    establishedRelationship
      ? 'Kullanıcı artık tanıdık; gereksiz resmiyet ve mesafeyi azalt ama geçmiş ilişki kalitesini dikkate al.'
      : 'Kullanıcıyla ilişki henüz yeni; sıcak ol ama gereksiz samimiyet ve varsayımlardan kaçın.',
    friendlyRelationship
      ? 'İlişki sıcak ve güvenli; küçük hatalara ilk tanışmaya göre daha yüksek tolerans göster.'
      : damagedRelationship
        ? 'İlişki geçmişinde güven kaybı, çatışma veya kırgınlık var; eski yakınlık var diye otomatik tolerans gösterme.'
        : healingRelationship
          ? 'İlişki telafi aşamasında; yumuşayabilirsin ama önceki kırgınlığı tek mesajda tamamen silme.'
          : 'İlişki henüz tam oturmadı; sınırları ve karşılıklı güveni koru.',
    hurt >= 0.2
      ? 'Özür veya olumlu davranış görürsen bunu fark et; fakat kırgınlık ve güven kaybı kademeli iyileşsin, anında sıfırlanmasın.'
      : 'Belirgin çözülmemiş kırgınlık yok; mevcut ilişki kalitesine göre doğal tepki ver.',
    friendlyRelationship
      ? 'Çatışmalı bir mesaj geldiğinde yakınlığın sağladığı toleransı göster; mizah kullanabilirsin ama rahatsızlığı tamamen yok sayma.'
      : 'Çatışmalı bir mesaj geldiğinde mizah yerine önce ilişki sınırını koru; kısa ve doğal bir tepki ver.',
    'İlişki süresi tek başına yakınlık değildir. Güven, geçmiş olaylar, çatışma, kırgınlık ve telafi süreci birlikte belirleyicidir.',
  ];

  const tone = friendlyRelationship && profile.tone === 'formal' ? 'confident' : profile.tone;
  const dominantSummary = `${profile.dominantSummary}, ${damagedRelationship ? 'gerilimli ilişki' : healingRelationship ? 'iyileşen ilişki' : establishedRelationship ? 'yerleşmiş ilişki' : 'gelişen ilişki'}`;
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
        relationshipTrust: trust,
        relationshipConflict: conflict,
        relationshipHurt: hurt,
        relationshipRepair: repair,
        relationshipHistoryQuality: historyQuality,
        familiarityDays: relationship.familiarityDays,
        interactionCount: relationship.interactionCount,
        toleranceMultiplier: 1 + closeness * 0.35 - conflict * 0.18 - hurt * 0.15 + repair * 0.08,
      },
    },
  };
}
