import React, { useState, useEffect } from 'react';
import { Menu, ShieldCheck, Clock, Plus, Layers, UserPlus } from 'lucide-react';
import { NavigationSection } from '../../types';
import { Button } from '../common/Button';

interface HeaderProps {
  activeSection: NavigationSection;
  onOpenMobileMenu: () => void;
  onOpenCreateRace: () => void;
  onOpenCreateCharacter: () => void;
  selectedCharacterName?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onOpenMobileMenu,
  onOpenCreateRace,
  onOpenCreateCharacter,
  selectedCharacterName,
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const sectionTitles: Record<NavigationSection, string> = {
    'create-droit': '🧬 Droit Oluştur (Stüdyo)',
    droits: '🗂️ Droitler (Varlık Kataloğu)',
    'test-lab': '🧪 Test Laboratuvarı',
    settings: '⚙️ Sistem Ayarları',
    studio: '🧬 Droit Oluştur',
    characters: '🗂️ Droitler',
    dashboard: '🧬 Droit Oluştur',
    races: 'Irklar',
    personalities: 'Kişilikler',
    knowledge: 'Bilgi',
    abilities: 'Yetenekler',
    ai: 'Yapay Zeka',
    logs: 'Kayıtlar',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 flex items-center justify-between">
      {/* Left side: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg"
          aria-label="Menüyü Aç"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span className="text-zinc-400 font-semibold uppercase tracking-wider hidden sm:inline">
            NEXUS
          </span>
          <span className="text-zinc-600 hidden sm:inline">/</span>
          <span className="text-cyan-400 uppercase tracking-wide">
            {sectionTitles[activeSection]}
          </span>
          {selectedCharacterName && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-200 font-semibold tracking-wide truncate max-w-[150px] sm:max-w-[240px]">
                {selectedCharacterName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side: Telemetry & Quick Action buttons */}
      <div className="flex items-center gap-3">
        {/* Time ticker */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>{currentTime || '00:00:00 UTC'}</span>
        </div>

        {/* Security badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>BAĞIMSIZ MOD</span>
        </div>

        {/* Quick Action Button */}
        {activeSection === 'races' && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateRace}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Irk Oluştur
          </Button>
        )}

        {activeSection === 'characters' && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateCharacter}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Karakter Oluştur
          </Button>
        )}

        {activeSection === 'dashboard' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCreateRace}
              leftIcon={<Layers className="w-3.5 h-3.5" />}
              className="hidden sm:inline-flex"
            >
              Yeni Irk
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenCreateCharacter}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Yeni Karakter
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
