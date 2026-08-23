import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DroitPersonalityTraits } from '../../types/nexus';

interface CharacterPersonalityPanelProps {
  personality: DroitPersonalityTraits;
  onChange: (updated: Partial<DroitPersonalityTraits>) => void;
}

interface TraitDefinition {
  key: keyof DroitPersonalityTraits;
  label: string;
}

interface CategoryDefinition {
  id: string;
  name: string;
  traits: TraitDefinition[];
}

const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'DUYGUSAL',
    name: 'DUYGUSAL',
    traits: [
      { key: 'anger', label: 'Sinirlilik' },
      { key: 'patience', label: 'Sabır' },
      { key: 'empathy', label: 'Empati' },
      { key: 'emotionalSensitivity', label: 'Duygusal Hassasiyet' },
    ],
  },
  {
    id: 'SOSYAL',
    name: 'SOSYAL',
    traits: [
      { key: 'socialIntelligence', label: 'Sosyal Zekâ' },
      { key: 'selfConfidence', label: 'Özgüven' },
      { key: 'humor', label: 'Mizah' },
      { key: 'communication', label: 'İletişim' },
      { key: 'charisma', label: 'Karizma' },
    ],
  },
  {
    id: 'ZİHİNSEL',
    name: 'ZİHİNSEL',
    traits: [
      { key: 'curiosity', label: 'Merak' },
      { key: 'analyticalThinking', label: 'Analitik Düşünme' },
      { key: 'creativity', label: 'Yaratıcılık' },
      { key: 'decisionMaking', label: 'Karar Verme' },
      { key: 'attention', label: 'Dikkat' },
    ],
  },
  {
    id: 'KARAKTER',
    name: 'KARAKTER',
    traits: [
      { key: 'authority', label: 'Otorite' },
      { key: 'courage', label: 'Cesaret' },
      { key: 'seriousness', label: 'Ciddiyet' },
      { key: 'loyalty', label: 'Sadakat' },
      { key: 'initiative', label: 'İnisiyatif' },
    ],
  },
];

export const CharacterPersonalityPanel: React.FC<CharacterPersonalityPanelProps> = ({
  personality,
  onChange,
}) => {
  // Açık olan kategorilerin state'i (Aynı anda birden fazla kategori açık kalabilir)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <aside className="w-full md:w-80 lg:w-88 h-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col select-none overflow-hidden shrink-0">
      {/* Panel Başlığı */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 shrink-0">
        <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase">
          KARAKTER
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Kalıcı kişilik özellikleri
        </p>
      </div>

      {/* Accordion Kategori Listesi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {CATEGORIES.map((category) => {
          const isOpen = !!openCategories[category.id];

          return (
            <div
              key={category.id}
              className="border border-zinc-850/80 rounded-lg bg-zinc-900/30 overflow-hidden transition-all"
            >
              {/* Accordion Başlığı (İnce, temiz ve tıklanabilir) */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-zinc-900/70 focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className="text-xs font-mono font-bold tracking-wider text-zinc-200">
                  {category.name}
                </span>
                <span className="text-zinc-400 flex items-center">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-zinc-300 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 transition-transform duration-200" />
                  )}
                </span>
              </button>

              {/* Accordion Açılan İçerik (Sliderlar) */}
              {isOpen && (
                <div className="px-3.5 pt-1 pb-4 border-t border-zinc-850/60 space-y-4 animate-in fade-in-50 duration-150">
                  {category.traits.map((trait) => {
                    const value = personality[trait.key] ?? 50;

                    return (
                      <div key={trait.key} className="space-y-1.5 pt-1">
                        {/* Özellik Adı ve Yüzde Değeri */}
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor={`slider-${trait.key}`}
                            className="text-xs font-medium text-zinc-300"
                          >
                            {trait.label}
                          </label>
                          <span className="text-xs font-mono font-semibold text-zinc-400">
                            {value}%
                          </span>
                        </div>

                        {/* Minimalist Modern Slider */}
                        <div className="relative flex items-center py-0.5">
                          <input
                            id={`slider-${trait.key}`}
                            type="range"
                            min="0"
                            max="100"
                            value={value}
                            onChange={(e) =>
                              onChange({
                                [trait.key]: parseInt(e.target.value, 10),
                              })
                            }
                            style={{
                              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${value}%, #27272a ${value}%, #27272a 100%)`,
                            }}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
