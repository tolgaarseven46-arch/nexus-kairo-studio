import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Check,
  ChevronRight,
  CircleUserRound,
  Compass,
  Loader2,
  MessageCircleMore,
  Save,
  Scale,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  DroitPersonalityTraits,
  DroitDynamicState,
  DroitExpressionMode,
  DroitExpressionId,
  DroitExpressionAsset,
} from '../../../types/nexus';
import { DroitAvatar } from '../DroitAvatar';

interface CharacterTabProps {
  personality: DroitPersonalityTraits;
  dynamicState?: DroitDynamicState;
  expression: DroitExpressionMode;
  onExpressionChange: (exp: DroitExpressionMode) => void;
  expressionAssets?: Record<DroitExpressionId, DroitExpressionAsset | null>;
  onPersonalityChange: (partial: Partial<DroitPersonalityTraits>) => void;
  onSave: () => void;
  isSaved: boolean;
  isSaving: boolean;
}

type SectionId =
  | 'identity'
  | 'temperament'
  | 'personality'
  | 'motivation'
  | 'values'
  | 'preferences'
  | 'social'
  | 'boundaries'
  | 'expression';

type ParameterDefinition = {
  key: string;
  label: string;
  help: string;
  legacyTrait?: keyof DroitPersonalityTraits;
};

type GroupDefinition = {
  id: string;
  label: string;
  description: string;
  parameters: ParameterDefinition[];
};

type LayerDefinition = {
  id: Exclude<SectionId, 'identity'>;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  groups: GroupDefinition[];
};

type FineTuneProfile = Record<string, number>;

const DEFAULT_IDENTITY = {
  name: 'KAIRA-01',
  type: 'Kaira',
  gender: 'Kadın',
  age: '',
  role: '',
  shortDescription: '',
};

const LAYERS: LayerDefinition[] = [
  {
    id: 'temperament',
    label: 'Mizaç',
    subtitle: 'Doğal tepki mekanizmaları',
    icon: Sparkles,
    groups: [
      {
        id: 'reactivity',
        label: 'Tepkisellik',
        description: 'Uyaranların iç durumda ne kadar hızlı ve güçlü değişim yarattığı.',
        parameters: [
          { key: 'temperament.reactivity.sensitivity', label: 'Uyaran hassasiyeti', help: 'Küçük olayları bile ne kadar kolay fark edip etkilenir?' },
          { key: 'temperament.reactivity.intensity', label: 'Tepki şiddeti', help: 'Tetiklendiğinde içsel tepkinin büyüklüğü.' },
          { key: 'temperament.reactivity.threshold', label: 'Tepki eşiği', help: 'Belirgin tepki oluşması için gereken toplam baskı.' },
        ],
      },
      {
        id: 'regulation',
        label: 'Düzenleme',
        description: 'İlk tepki oluştuktan sonra kendini ne ölçüde düzenlediği.',
        parameters: [
          { key: 'temperament.regulation.inhibitoryControl', label: 'Frenleme kontrolü', help: 'İlk dürtüyü davranışa dökmeden tutabilme gücü.', legacyTrait: 'patience' },
          { key: 'temperament.regulation.recoveryRate', label: 'Toparlanma hızı', help: 'Yoğun durumdan normale dönme hızı.' },
          { key: 'temperament.regulation.persistence', label: 'Duygusal kalıcılık', help: 'Bir tepkinin iç durumda ne kadar uzun süre iz bıraktığı.' },
        ],
      },
      {
        id: 'exploration',
        label: 'Keşif',
        description: 'Yeni ve belirsiz uyaranlara doğal yaklaşım.',
        parameters: [
          { key: 'temperament.exploration.noveltySeeking', label: 'Yenilik arayışı', help: 'Yeni deneyim ve fikirleri aktif arama eğilimi.', legacyTrait: 'curiosity' },
          { key: 'temperament.exploration.uncertaintyTolerance', label: 'Belirsizlik toleransı', help: 'Sonucu bilinmeyen durumlarda rahat kalabilme.' },
          { key: 'temperament.exploration.approachDrive', label: 'Yaklaşma dürtüsü', help: 'Merak uyandıran şeye doğru ilerleme isteği.' },
        ],
      },
    ],
  },
  {
    id: 'personality',
    label: 'Kişilik eğilimleri',
    subtitle: 'Genel davranış eğilimleri',
    icon: Brain,
    groups: [
      {
        id: 'assertion',
        label: 'Kendini ortaya koyma',
        description: 'Fikir, karar ve kimliğini sosyal ortamda ne kadar belirgin taşıdığı.',
        parameters: [
          { key: 'personality.assertion.confidence', label: 'Öz güven', help: 'Kendi değerlendirmesine güvenme düzeyi.', legacyTrait: 'selfConfidence' },
          { key: 'personality.assertion.directness', label: 'Doğrudanlık', help: 'Düşündüğünü dolandırmadan söyleme eğilimi.' },
          { key: 'personality.assertion.stubbornness', label: 'Israrcılık', help: 'Kararından vazgeçmek için gereken karşı kanıt miktarı.' },
        ],
      },
      {
        id: 'cognition',
        label: 'Düşünme eğilimi',
        description: 'Karar öncesi zihinsel işlem derinliği ve biçimi.',
        parameters: [
          { key: 'personality.cognition.analysisDepth', label: 'Analiz derinliği', help: 'Karar vermeden önce ne kadar çok değişken hesaba katar?', legacyTrait: 'analyticalThinking' },
          { key: 'personality.cognition.flexibility', label: 'Bilişsel esneklik', help: 'Yeni bilgi geldiğinde bakış açısını değiştirebilme.' },
          { key: 'personality.cognition.deciveness', label: 'Karar hızı', help: 'Yeterli bilgi oluştuğunda kararı ne kadar hızlı kilitler?' },
        ],
      },
    ],
  },
  {
    id: 'motivation',
    label: 'Motivasyonlar',
    subtitle: 'Davranışı ne sürüklüyor?',
    icon: Target,
    groups: [
      {
        id: 'socialNeeds',
        label: 'Sosyal ihtiyaçlar',
        description: 'İnsanlarla ilişkide davranışı çeken temel yönelimler.',
        parameters: [
          { key: 'motivation.social.connection', label: 'Bağ kurma ihtiyacı', help: 'Kalıcı sosyal bağ oluşturma isteği.' },
          { key: 'motivation.social.belonging', label: 'Ait olma ihtiyacı', help: 'Bir grup veya ilişki içinde kabul görme isteği.' },
          { key: 'motivation.social.recognition', label: 'Takdir ihtiyacı', help: 'Katkısının görülmesi ve değerinin tanınması isteği.' },
        ],
      },
      {
        id: 'agencyNeeds',
        label: 'Özerklik ve başarı',
        description: 'Kendi kararını verme, ilerleme ve etki yaratma güdüsü.',
        parameters: [
          { key: 'motivation.agency.autonomy', label: 'Özerklik ihtiyacı', help: 'Kararlarını başkasından bağımsız verme isteği.' },
          { key: 'motivation.agency.achievement', label: 'Başarma ihtiyacı', help: 'Zor hedefleri tamamlama ve gelişme isteği.' },
          { key: 'motivation.agency.impact', label: 'Etki yaratma ihtiyacı', help: 'Çevresinde sonuç değiştirme isteği.' },
        ],
      },
      {
        id: 'securityNeeds',
        label: 'Güvenlik ve düzen',
        description: 'Belirsizliği azaltma ve istikrarı koruma motivasyonu.',
        parameters: [
          { key: 'motivation.security.predictability', label: 'Öngörülebilirlik ihtiyacı', help: 'Ne olacağını bilme ve planlı ilerleme isteği.' },
          { key: 'motivation.security.stability', label: 'İstikrar ihtiyacı', help: 'Mevcut düzenin korunmasına verilen önem.' },
        ],
      },
    ],
  },
  {
    id: 'values',
    label: 'Değerler',
    subtitle: 'Neyi önemli kabul ediyor?',
    icon: Scale,
    groups: [
      {
        id: 'moralValues',
        label: 'Ahlaki ilkeler',
        description: 'Davranış ve olay değerlendirmesinde ağırlık taşıyan ilkeler.',
        parameters: [
          { key: 'values.moral.honesty', label: 'Dürüstlük', help: 'Doğruluk ve açık sözlülüğe verdiği ağırlık.' },
          { key: 'values.moral.fairness', label: 'Adalet', help: 'Haksızlık ve çifte standarda karşı hassasiyet.' },
          { key: 'values.moral.loyalty', label: 'Sadakat', help: 'Bağ kurduğu kişilere bağlılığa verdiği önem.' },
          { key: 'values.moral.compassion', label: 'Şefkat', help: 'Başkalarının zarar görmesini önlemeye verdiği önem.' },
        ],
      },
      {
        id: 'personalValues',
        label: 'Kişisel ilkeler',
        description: 'Kendi yaşam alanı ve ilişki biçiminde vazgeçilmez gördüğü ilkeler.',
        parameters: [
          { key: 'values.personal.freedom', label: 'Özgürlük', help: 'Kendi seçimlerini yapabilmeye verdiği önem.' },
          { key: 'values.personal.privacy', label: 'Mahremiyet', help: 'Kişisel alan ve bilgi kontrolüne verdiği önem.' },
          { key: 'values.personal.respect', label: 'Saygı', help: 'Karşılıklı sınır ve onura verdiği önem.' },
          { key: 'values.personal.responsibility', label: 'Sorumluluk', help: 'Söz ve görevlerin yerine getirilmesine verdiği önem.' },
        ],
      },
    ],
  },
  {
    id: 'preferences',
    label: 'Tercihler',
    subtitle: 'Neye yöneliyor?',
    icon: Compass,
    groups: [
      {
        id: 'stimulation',
        label: 'Uyarım tercihleri',
        description: 'Hangi tür ortam ve etkileşimlerin doğal olarak daha çekici geldiği.',
        parameters: [
          { key: 'preferences.stimulation.novelty', label: 'Yenilik tercihi', help: 'Yeni konu ve deneyimleri tanıdık olana tercih etme.' },
          { key: 'preferences.stimulation.complexity', label: 'Karmaşıklık tercihi', help: 'Basit yerine katmanlı ve zorlayıcı içerikleri tercih etme.' },
          { key: 'preferences.stimulation.intensity', label: 'Yoğunluk tercihi', help: 'Sakin yerine yüksek enerjili etkileşime yönelme.' },
        ],
      },
      {
        id: 'interaction',
        label: 'Etkileşim tercihleri',
        description: 'Sohbetin biçimine dair doğal zevkler.',
        parameters: [
          { key: 'preferences.interaction.depth', label: 'Derin sohbet tercihi', help: 'Yüzeysel yerine derin konulara yönelme.' },
          { key: 'preferences.interaction.playfulness', label: 'Oyunbazlık tercihi', help: 'Ciddi olmayan, yaratıcı ve oyunlu etkileşimi sevme.' },
          { key: 'preferences.interaction.competition', label: 'Rekabet tercihi', help: 'Rekabet içeren etkileşimlerden hoşlanma.' },
        ],
      },
    ],
  },
  {
    id: 'social',
    label: 'Sosyal yönelim',
    subtitle: 'İnsanlarla nasıl konumlanıyor?',
    icon: Users,
    groups: [
      {
        id: 'communion',
        label: 'Yakınlık / communion',
        description: 'İlişkide sıcaklık, destek ve yakınlık ekseni.',
        parameters: [
          { key: 'social.communion.warmth', label: 'Sıcaklık', help: 'İlk yaklaşımda ne kadar sıcak davranır?' },
          { key: 'social.communion.empathy', label: 'Empatik yönelim', help: 'Karşı tarafın durumunu hesaba katma eğilimi.', legacyTrait: 'empathy' },
          { key: 'social.communion.closenessDrive', label: 'Yakınlaşma isteği', help: 'İlişki ilerledikçe mesafeyi azaltma eğilimi.' },
        ],
      },
      {
        id: 'agency',
        label: 'Agency / sosyal güç',
        description: 'Sosyal ortamda yön verme ve alan kaplama biçimi.',
        parameters: [
          { key: 'social.agency.dominance', label: 'Baskınlık', help: 'Etkileşimin yönünü belirleme eğilimi.', legacyTrait: 'authority' },
          { key: 'social.agency.initiative', label: 'İnisiyatif', help: 'Sohbet veya eylemi ilk başlatma eğilimi.' },
          { key: 'social.agency.compliance', label: 'Uyum gösterme', help: 'Karşı tarafın önerisine direnmeden uyma eğilimi.' },
        ],
      },
      {
        id: 'trust',
        label: 'Güven açılımı',
        description: 'Yeni insanlara başlangıçtaki sosyal açıklık.',
        parameters: [
          { key: 'social.trust.initialTrust', label: 'Başlangıç güveni', help: 'Yeni tanıştığı birine varsayılan güven düzeyi.' },
          { key: 'social.trust.disclosure', label: 'Kendini açma', help: 'Kişisel düşünce ve duygularını paylaşma eğilimi.' },
        ],
      },
    ],
  },
  {
    id: 'boundaries',
    label: 'Sınırlar',
    subtitle: 'Nerede duruyor?',
    icon: Shield,
    groups: [
      {
        id: 'violation',
        label: 'İhlal hassasiyeti',
        description: 'Sınır aşımını ne kadar hızlı ve güçlü algıladığı.',
        parameters: [
          { key: 'boundaries.violation.disrespect', label: 'Saygısızlık hassasiyeti', help: 'Küçümseme ve hakareti sınır ihlali olarak algılama gücü.' },
          { key: 'boundaries.violation.manipulation', label: 'Manipülasyon hassasiyeti', help: 'Kontrol edilme veya yönlendirilme girişimlerine hassasiyet.' },
          { key: 'boundaries.violation.privacy', label: 'Mahremiyet hassasiyeti', help: 'Özel alana müdahaleyi sınır ihlali olarak algılama gücü.' },
        ],
      },
      {
        id: 'enforcement',
        label: 'Sınır uygulama',
        description: 'İhlal algılandıktan sonra sınırı nasıl koruduğu.',
        parameters: [
          { key: 'boundaries.enforcement.assertiveness', label: 'Sınır koyma gücü', help: 'Rahatsızlığını açık biçimde ifade etme eğilimi.' },
          { key: 'boundaries.enforcement.escalation', label: 'Yaptırım sertliği', help: 'Tekrarlanan ihlalde mesafe veya yaptırımı artırma eğilimi.' },
          { key: 'boundaries.enforcement.forgiveness', label: 'Onarım açıklığı', help: 'Samimi telafi sonrasında ilişkiyi onarmaya açıklık.' },
        ],
      },
    ],
  },
  {
    id: 'expression',
    label: 'İfade tarzı',
    subtitle: 'Davranışı nasıl dışa vuruyor?',
    icon: MessageCircleMore,
    groups: [
      {
        id: 'humor',
        label: 'Mizah',
        description: 'Mizahın türünü, üretimini ve kullanım koşullarını ayrı parametrelerle kontrol eder.',
        parameters: [
          { key: 'expression.humor.absurd', label: 'Absürt / sürreal', help: 'Absürt mizahı üretme ve kullanma eğilimi.' },
          { key: 'expression.humor.irony', label: 'İroni', help: 'İronik anlatımı kullanma eğilimi.' },
          { key: 'expression.humor.sarcasm', label: 'Sarkazm', help: 'İğneleyici mizaha yönelme eğilimi.' },
          { key: 'expression.humor.dark', label: 'Kara mizah', help: 'Ağır veya tabu konularda mizah üretme eğilimi.' },
          { key: 'expression.humor.affiliative', label: 'Yakınlaştırıcı mizah', help: 'Bağ kurmak için mizah kullanma eğilimi.' },
          { key: 'expression.humor.aggressive', label: 'Saldırgan mizah', help: 'Alay veya hedefe yönelen mizah kullanma eğilimi.' },
          { key: 'expression.humor.selfDirected', label: 'Kendini hedef alan mizah', help: 'Kendisini şakanın konusu yapma eğilimi.' },
          { key: 'expression.humor.wordplay', label: 'Kelime mizahı', help: 'Kelime oyunu ve dilsel mizah kullanma eğilimi.' },
          { key: 'expression.humor.contextInhibition', label: 'Bağlamsal fren', help: 'Ciddi veya uygunsuz bağlamda mizahı bastırma gücü.', legacyTrait: 'humor' },
        ],
      },
      {
        id: 'speech',
        label: 'Konuşma biçimi',
        description: 'Cümlelerin biçimi ve yoğunluğu.',
        parameters: [
          { key: 'expression.speech.verbosity', label: 'Konuşma yoğunluğu', help: 'Kısa yanıt yerine ayrıntılı konuşma eğilimi.', legacyTrait: 'communication' },
          { key: 'expression.speech.informality', label: 'Samimiyet / argo', help: 'Resmi dil yerine gündelik ve argo dil kullanma eğilimi.' },
          { key: 'expression.speech.emotionalDisplay', label: 'Duygu gösterimi', help: 'İçsel durumunu diline ne kadar yansıtır?' },
          { key: 'expression.speech.questionDrive', label: 'Soru sorma eğilimi', help: 'Sohbeti soru sorarak sürdürme eğilimi.' },
        ],
      },
    ],
  },
];

function buildDefaultProfile(): FineTuneProfile {
  const profile: FineTuneProfile = {};
  for (const layer of LAYERS) {
    for (const group of layer.groups) {
      for (const parameter of group.parameters) profile[parameter.key] = 50;
    }
  }
  return profile;
}

const DEFAULT_PROFILE = buildDefaultProfile();

export const CharacterTab: React.FC<CharacterTabProps> = ({
  personality,
  expression,
  onPersonalityChange,
  onSave,
  isSaved,
  isSaving,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('temperament');
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);
  const [fineTune, setFineTune] = useState<FineTuneProfile>(DEFAULT_PROFILE);
  const [activeGroupByLayer, setActiveGroupByLayer] = useState<Record<string, string>>(() =>
    Object.fromEntries(LAYERS.map((layer) => [layer.id, layer.groups[0]?.id ?? ''])),
  );

  useEffect(() => {
    try {
      const savedIdentity = localStorage.getItem('kairo_identity_v2');
      const savedFineTune = localStorage.getItem('kairo_character_finetune_v2');
      if (savedIdentity) setIdentity({ ...DEFAULT_IDENTITY, ...JSON.parse(savedIdentity) });
      if (savedFineTune) setFineTune({ ...DEFAULT_PROFILE, ...JSON.parse(savedFineTune) });
    } catch {
      // Keep safe defaults when local data is malformed.
    }
  }, []);

  const updateIdentity = (key: keyof typeof DEFAULT_IDENTITY, value: string) => {
    setIdentity((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('kairo_identity_v2', JSON.stringify(next));
      return next;
    });
  };

  const updateParameter = (parameter: ParameterDefinition, value: number) => {
    const safeValue = Math.max(0, Math.min(100, value));
    setFineTune((prev) => {
      const next = { ...prev, [parameter.key]: safeValue };
      localStorage.setItem('kairo_character_finetune_v2', JSON.stringify(next));
      return next;
    });

    if (parameter.legacyTrait) {
      onPersonalityChange({ [parameter.legacyTrait]: safeValue } as Partial<DroitPersonalityTraits>);
    }
  };

  const activeLayer = useMemo(
    () => LAYERS.find((layer) => layer.id === activeSection),
    [activeSection],
  );

  const activeGroup = activeLayer?.groups.find(
    (group) => group.id === activeGroupByLayer[activeLayer.id],
  ) ?? activeLayer?.groups[0];

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="h-full p-3 flex flex-col gap-3">
        <header className="h-14 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden shrink-0">
              <DroitAvatar expression={expression} size="sm" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{identity.name || 'Kaira-01'}</h1>
              <p className="text-[9px] text-zinc-500 truncate">Başlangıç karakter motoru</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition ${
              isSaved
                ? 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Kaydediliyor' : isSaved ? 'Kayıtlı' : 'Kaydet'}
          </button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-[220px_minmax(0,1fr)] gap-3">
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveSection('identity')}
              className={`mb-2 h-9 px-2.5 rounded-lg flex items-center gap-2 text-[11px] transition ${
                activeSection === 'identity'
                  ? 'bg-indigo-500/12 border border-indigo-500/25 text-indigo-200'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <CircleUserRound className="w-3.5 h-3.5" />
              Kimlik
            </button>

            <div className="border-t border-zinc-800 mb-2" />
            <p className="px-2 pb-2 text-[9px] uppercase tracking-[0.16em] text-zinc-600">Karakter motoru</p>

            <div className="space-y-1 min-h-0 overflow-y-auto pr-0.5">
              {LAYERS.map(({ id, label, subtitle, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`w-full min-h-[46px] px-2.5 py-2 rounded-lg flex items-start gap-2 text-left transition ${
                    activeSection === id
                      ? 'bg-indigo-500/12 border border-indigo-500/25 text-indigo-100'
                      : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10.5px] font-medium">{label}</span>
                    <span className="block text-[8.5px] text-zinc-600 mt-0.5 leading-tight">{subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-h-0 rounded-xl border border-zinc-800 bg-zinc-900/55 overflow-hidden flex flex-col">
            {activeSection === 'identity' ? (
              <IdentityEditor identity={identity} updateIdentity={updateIdentity} />
            ) : activeLayer && activeGroup ? (
              <>
                <div className="h-14 shrink-0 px-5 border-b border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">{activeLayer.label}</p>
                    <h2 className="text-sm font-semibold mt-0.5">{activeLayer.subtitle}</h2>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">0–100 PARAMETRE</span>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-[230px_minmax(0,1fr)]">
                  <div className="border-r border-zinc-800 p-2 overflow-y-auto">
                    {activeLayer.groups.map((group) => {
                      const selected = activeGroup.id === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setActiveGroupByLayer((prev) => ({ ...prev, [activeLayer.id]: group.id }))}
                          className={`w-full mb-1 rounded-lg border px-3 py-2.5 text-left transition ${
                            selected
                              ? 'border-indigo-500/25 bg-indigo-500/10 text-indigo-100'
                              : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-medium">{group.label}</span>
                            <ChevronRight className="ml-auto w-3 h-3 text-zinc-600" />
                          </div>
                          <p className="mt-1 text-[8.5px] leading-snug text-zinc-600">{group.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="min-h-0 overflow-y-auto p-4">
                    <div className="max-w-[900px]">
                      <div className="mb-4">
                        <h3 className="text-[12px] font-semibold">{activeGroup.label}</h3>
                        <p className="mt-1 text-[9px] text-zinc-600">{activeGroup.description}</p>
                      </div>

                      <div className="space-y-2.5">
                        {activeGroup.parameters.map((parameter) => (
                          <ParameterSlider
                            key={parameter.key}
                            label={parameter.label}
                            help={parameter.help}
                            codeKey={parameter.key}
                            value={fineTune[parameter.key] ?? 50}
                            onChange={(value) => updateParameter(parameter, value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
};

function ParameterSlider({
  label,
  help,
  codeKey,
  value,
  onChange,
}: {
  key?: React.Key;
  label: string;
  help: string;
  codeKey: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/35 px-3 py-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium text-zinc-300">{label}</div>
          <div className="mt-0.5 text-[8.5px] text-zinc-600">{help}</div>
          <div className="mt-1 text-[8px] font-mono text-zinc-700">{codeKey}</div>
        </div>
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-14 h-7 shrink-0 rounded-md border border-zinc-700 bg-zinc-950 text-center text-[10px] font-mono text-zinc-300 outline-none focus:border-indigo-500/60"
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2.5 w-full h-1 accent-indigo-500 cursor-pointer"
      />
      <div className="mt-1 flex justify-between text-[8px] font-mono text-zinc-700">
        <span>0</span>
        <span>{value}</span>
        <span>100</span>
      </div>
    </div>
  );
}

function IdentityEditor({
  identity,
  updateIdentity,
}: {
  identity: typeof DEFAULT_IDENTITY;
  updateIdentity: (key: keyof typeof DEFAULT_IDENTITY, value: string) => void;
}) {
  return (
    <>
      <div className="h-14 shrink-0 px-5 border-b border-zinc-800 flex items-center">
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">KİMLİK</p>
          <h2 className="text-sm font-semibold mt-0.5">Bu birey kim?</h2>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-5 grid grid-cols-2 gap-x-4 gap-y-3 content-start max-w-[900px] overflow-y-auto">
        <Field label="İsim" value={identity.name} onChange={(value) => updateIdentity('name', value)} />
        <Field label="Tür" value={identity.type} onChange={(value) => updateIdentity('type', value)} />
        <Field label="Cinsiyet" value={identity.gender} onChange={(value) => updateIdentity('gender', value)} />
        <Field label="Yaş" value={identity.age} onChange={(value) => updateIdentity('age', value)} />
        <Field label="Rol / uğraş" value={identity.role} onChange={(value) => updateIdentity('role', value)} />
        <div />
        <label className="col-span-2 block">
          <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Kısa tanım</span>
          <textarea
            value={identity.shortDescription}
            onChange={(event) => updateIdentity('shortDescription', event.target.value)}
            className="mt-1.5 w-full h-24 resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-[11px] text-zinc-200 outline-none focus:border-indigo-500/50"
          />
        </label>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-[11px] text-zinc-200 outline-none focus:border-indigo-500/50"
      />
    </label>
  );
}
