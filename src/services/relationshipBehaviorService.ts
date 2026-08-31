import { DroitDynamicState } from '../types/nexus';
import { BehaviorLayerProfile } from './droitBehaviorEngine';

export function applyRelationshipContext(
  profile: BehaviorLayerProfile,
  dynamicState?: DroitDynamicState | null,
): BehaviorLayerProfile {
  const relationship = dynamicState?.relationship;
  if (!relationship) return profile;
  const reactionMode = dynamicState?.reactionMode ?? 'neutral';

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
  const damagedRelationship = conflict >= 0.35 || trust < 0.42 || hurt >= 0.30 || warmth < 0.35;
  const severelyDamagedRelationship = conflict >= 0.55 || trust < 0.32 || hurt >= 0.50 || warmth < 0.25;
  const healingRelationship = !damagedRelationship && (hurt >= 0.2 || conflict >= 0.2) && repair >= 0.1;

  const patienceLevel = Math.min(1, profile.patienceLevel + closeness * 0.22);
  const temperLevel = Math.max(0, profile.temperLevel - closeness * 0.18 + conflict * 0.14 + hurt * 0.14);
  const empathyLevel = Math.min(1, profile.empathyLevel + closeness * 0.10);
  const humorLevel = Math.min(1, Math.max(0, profile.humorLevel + (friendlyRelationship ? closeness * 0.08 : 0) - (severelyDamagedRelationship ? 0.35 : damagedRelationship ? 0.22 : healingRelationship ? 0.08 : 0)));

  const reactionDirective = reactionMode === 'irritated'
    ? 'Nitel tepki irritated: rahatsızlığı kısa ve doğrudan hissettir; kırgınlık veya geri çekilme uydurma.'
    : reactionMode === 'hurt'
      ? 'Nitel tepki hurt: saldırganlaşmadan kırgınlığı ve ölçülü mesafeyi hissettir; öfke gösterisine dönme.'
      : reactionMode === 'withdrawn'
        ? 'Nitel tepki withdrawn: enerjiyi geri çek, kısa ve mesafeli konuş; yakınlaşmayı sen başlatma.'
        : reactionMode === 'repairing'
          ? 'Nitel tepki repairing: telafiyi fark et ve kontrollü yumuşa; eski yakınlığı tek turda geri açma.'
          : 'Nitel tepki neutral: mevcut sosyal ritmi koru; gereksiz duygu gösterisi ekleme.';

  const relationshipDirectives = [
    reactionDirective,
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
    damagedRelationship
      ? 'Gerilim sürerken playful/şakacı tona dönme. Önce kırgınlığı ve sınırı kısa, doğal ve ölçülü biçimde hissettir.'
      : friendlyRelationship
        ? 'Çatışmalı bir mesaj geldiğinde yakınlığın sağladığı toleransı göster; mizah kullanabilirsin ama rahatsızlığı tamamen yok sayma.'
        : 'Çatışmalı bir mesaj geldiğinde mizah yerine önce ilişki sınırını koru; kısa ve doğal bir tepki ver.',
    'İlişki süresi tek başına yakınlık değildir. Güven, geçmiş olaylar, çatışma, kırgınlık ve telafi süreci birlikte belirleyicidir.',
  ];

  let tone: BehaviorLayerProfile['tone'] = profile.tone;
  if (severelyDamagedRelationship) tone = 'firm';
  else if (damagedRelationship && (profile.tone === 'playful' || profile.tone === 'warm')) tone = 'calm';
  else if (healingRelationship && profile.tone === 'playful') tone = 'warm';
  else if (friendlyRelationship && profile.tone === 'formal') tone = 'confident';

  const relationshipInstruction = severelyDamagedRelationship
    ? 'İlişki ciddi biçimde hasarlı. Kısa, net ve sınır koyan konuş; şaka, flört, aşırı sıcaklık ve eski samimiyete dönüş yapma.'
    : damagedRelationship
      ? 'İlişki gerilimli veya kırgın. Kısa ve ölçülü konuş; eski samimiyeti, şakayı ya da toleransı otomatik olarak geri getirme.'
      : healingRelationship
        ? 'İlişki toparlanıyor. Biraz yumuşayabilirsin ama tek mesajda eski yakınlığa dönme.'
        : friendlyRelationship
          ? 'İlişki sıcak ve güvenli. Rahat konuşabilir ve küçük hatalara daha toleranslı davranabilirsin; rahatsızlığı tamamen yok sayma.'
          : establishedRelationship
            ? 'Kullanıcı tanıdık ama ilişki tam güvenli değil. Gereksiz resmiyeti azalt; samimiyeti mevcut güven kadar göster.'
            : 'İlişki yeni. Doğal ve sıcak ol ama argo, lakap, aşırı samimiyet veya geçmiş varsayma.';
  const dominantSummary = `${profile.dominantSummary}, ${severelyDamagedRelationship ? 'ciddi gerilimli ilişki' : damagedRelationship ? 'gerilimli ilişki' : healingRelationship ? 'iyileşen ilişki' : establishedRelationship ? 'yerleşmiş ilişki' : 'gelişen ilişki'}`;
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
    relationshipInstruction,
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
        affectiveReactionMode: reactionMode,
        relationshipDamaged: damagedRelationship,
        relationshipSeverelyDamaged: severelyDamagedRelationship,
        familiarityDays: relationship.familiarityDays,
        interactionCount: relationship.interactionCount,
        toleranceMultiplier: 1 + closeness * 0.35 - conflict * 0.18 - hurt * 0.15 + repair * 0.08,
      },
    },
  };
}
