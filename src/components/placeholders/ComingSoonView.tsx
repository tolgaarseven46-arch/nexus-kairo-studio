import React from 'react';
import {
  BrainCircuit,
  Database,
  Zap,
  Cpu,
  Terminal,
  Settings,
  Construction,
  Layers,
  Users,
  FlaskConical,
} from 'lucide-react';
import { NavigationSection } from '../../types';
import { Button } from '../common/Button';

interface ComingSoonViewProps {
  section: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({
  section,
  onNavigate,
}) => {
  const sectionMeta: Record<
    NavigationSection,
    {
      title: string;
      code: string;
      icon: React.ReactNode;
      description: string;
      plannedCapabilities: string[];
    }
  > = {
    dashboard: {
      title: 'Ana Sayfa',
      code: 'SYS-DASH',
      icon: <Construction className="w-8 h-8" />,
      description: '',
      plannedCapabilities: [],
    },
    races: {
      title: 'Irklar',
      code: 'SYS-RACE',
      icon: <Layers className="w-8 h-8" />,
      description: '',
      plannedCapabilities: [],
    },
    characters: {
      title: 'Karakterler',
      code: 'SYS-CHAR',
      icon: <Users className="w-8 h-8" />,
      description: '',
      plannedCapabilities: [],
    },
    'create-droit': {
      title: 'Droit Oluştur',
      code: 'SYS-STUDIO',
      icon: <Users className="w-8 h-8" />,
      description: '',
      plannedCapabilities: [],
    },
    'test-lab': {
      title: 'Test Laboratuvarı',
      code: 'SYS-LAB',
      icon: <FlaskConical className="w-8 h-8" />,
      description: '',
      plannedCapabilities: [],
    },
    studio: {
      title: 'Droit Stüdyosu',
      code: 'SYS-STUDIO',
      icon: <Users className="w-8 h-8" />,
      description: '',
      plannedCapabilities: [],
    },
    droits: {
      title: 'Droit Kataloğu',
      code: 'SYS-DROIT',
      icon: <Users className="w-8 h-8" />,
      description: '',
      plannedCapabilities: [],
    },
    personalities: {
      title: 'Kişilik Sistem Matrisi',
      code: 'MOD-04 // PERS',
      icon: <BrainCircuit className="w-8 h-8 text-cyan-400" />,
      description:
        'Dijital varlıklar için kapsamlı psikolojik ve diyalog modelleme matrisi.',
      plannedCapabilities: [
        'Arketip sınıflandırması (Örn: Analitik, Mentor, İnfazcı, Düzenbaz)',
        'Beş Faktör (Big-5) psikolojik özellik ölçeklendirmesi ve ton ayarları',
        'Konuşma tarzları ve karakteristik ifade kalıpları',
        'Dinamik duygusal durum modülasyonu',
      ],
    },
    knowledge: {
      title: 'Bilgi Veri Aktarımı ve Külliyat Deposu',
      code: 'MOD-05 // KNLG',
      icon: <Database className="w-8 h-8 text-cyan-400" />,
      description:
        'Alana özel belge aktarımı, anlamsal parçalama (chunking) ve vektör dizini senkronizasyonu.',
      plannedCapabilities: [
        'Külliyat yüklemeleri ve Markdown veri aktarımı',
        'Karakter ve ırk başına vektör gömme (embedding) bölümleme',
        'Top-K ilgi düzeyi eşleşme eşikleri',
        'Kaynak referansları ve olgusal kısıtlama doğrulaması',
      ],
    },
    abilities: {
      title: 'Yetenekler ve Eylem Araç Setleri',
      code: 'MOD-06 // ABIL',
      icon: <Zap className="w-8 h-8 text-cyan-400" />,
      description:
        'Otonom yetenekler, yürütülebilir fonksiyon çağırma şemaları ve API yetki ilkeleri.',
      plannedCapabilities: [
        'JSON Şeması araç tanımlama ve veri yükü doğrulaması',
        'Rol tabanlı izin denetimi ve yetkilendirme politikaları',
        'Tetikleyici-eylem webhookları ve zamanlanmış görevler',
        'Simüle edilmiş yürütme test alanı (sandbox)',
      ],
    },
    ai: {
      title: 'Yapay Zeka Model Yapılandırması ve Sistem Yönergeleri',
      code: 'MOD-07 // AI-CFG',
      icon: <Cpu className="w-8 h-8 text-cyan-400" />,
      description:
        'Alt seviye model yönlendirme, sıcaklık parametreleri, bağlam uzunluğu sınırları ve sistem istemi mühendisliği.',
      plannedCapabilities: [
        'Gemini Flash / Pro model hedefleme ve yedek rota yönlendirme',
        'Sistem istemi derleyicisi ve önek enjeksiyonu',
        'Sıcaklık (temperature), top-p, top-k hiperparametre ayarı',
        'Güvenlik filtresi ayarları ve yanıt biçimlendirme kuralları',
      ],
    },
    logs: {
      title: 'Çalışma Kayıtları ve Telemetri Akışı',
      code: 'MOD-08 // LOGS',
      icon: <Terminal className="w-8 h-8 text-cyan-400" />,
      description:
        'Canlı olay izleme, model çıkarım gecikmeleri, durum değişiklikleri ve güvenlik denetim kayıtları.',
      plannedCapabilities: [
        'Gerçek zamanlı akışlı olay görüntüleyici',
        'Karakter Kimliği veya Önem Derecesine göre filtreleme',
        'Belirteç (Token) tüketim sayaçları ve gecikme metrikleri',
        'Dışa aktarılabilir JSON/CSV denetim günlükleri',
      ],
    },
    settings: {
      title: 'Kontrol Merkezi Ayarları',
      code: 'MOD-09 // CONF',
      icon: <Settings className="w-8 h-8 text-cyan-400" />,
      description:
        'Genel ayarlar, veritabanı senkronizasyon ilkeleri, ortam değişkenleri ve kimlik doğrulama yapılandırması.',
      plannedCapabilities: [
        'Firebase Kimlik Doğrulama entegrasyonu ve kullanıcı rolleri',
        'Firestore koleksiyon dizinleme ve yedekleme dışa aktarımı',
        'Arayüz görüntüleme yoğunluğu ve tema ayarları',
        'API kimlik bilgisi yönetimi',
      ],
    },
  };

  const current = sectionMeta[section];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner shrink-0">
            {current.icon}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {current.code}
              </span>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
                YAKINDA
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
              {current.title}
            </h1>

            <p className="text-xs text-zinc-400 font-sans leading-relaxed pt-1">
              {current.description}
            </p>
          </div>
        </div>
      </div>

      {/* Planned Architecture Overview */}
      <div className="p-6 sm:p-8 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-5">
        <h2 className="text-xs font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-cyan-500 rounded-xs" />
          Planlanan Mimari ve Yetenekler
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.plannedCapabilities.map((cap, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-3"
            >
              <span className="text-xs font-mono text-cyan-400 shrink-0 mt-0.5">
                0{idx + 1}.
              </span>
              <span className="text-xs text-zinc-300 font-sans leading-relaxed">
                {cap}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500">
            Temel ve veri şemaları hazırlandı.
          </span>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('races')}
            >
              Irklara Git
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('characters')}
            >
              Karakterlere Git
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
