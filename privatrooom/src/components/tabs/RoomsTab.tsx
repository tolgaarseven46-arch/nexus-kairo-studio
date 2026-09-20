import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Music,
  Dumbbell,
  MessageSquare,
  ChevronRight,
  Compass,
  MoreVertical,
  Bell,
  BellOff,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { PlayerProfile } from '../../types';
import { RoomService, RoomDocument } from '../../services/roomService';
import { formatDocToDisplayRoom, DisplayRoom } from './HomeFeedTab';

interface RoomsTabProps {
  profile?: PlayerProfile;
  onOpenCreateRoomModal?: (
    mode?: 'create' | 'join' | 'view',
    joinedRoom?: RoomDocument
  ) => void;
}

export const RoomsTab: React.FC<RoomsTabProps> = ({
  onOpenCreateRoomModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [rooms, setRooms] = useState<DisplayRoom[]>(() =>
    RoomService.getDefaultStarterRoomDocs().map(formatDocToDisplayRoom)
  );

  // Main servers state
  const [mainServerIds, setMainServerIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prv_main_servers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.length === 4 && parsed.includes('room-super-lig') && !parsed.includes('room-oyun-kulubu')) {
            return [...parsed, 'room-oyun-kulubu'];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [
      'room-super-lig',
      'room-arkadas-kosesi',
      'room-gece-yolu',
      'room-prv42',
      'room-oyun-kulubu',
    ];
  });

  // Muted state
  const [mutedRoomIds, setMutedRoomIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prv_muted_rooms');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  // Open Popover Menu ID
  const [openMenuRoomId, setOpenMenuRoomId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleDocumentClick = () => {
      setOpenMenuRoomId(null);
    };
    if (openMenuRoomId) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [openMenuRoomId]);

  useEffect(() => {
    const unsub = RoomService.subscribeToActiveRooms((roomDocs) => {
      if (roomDocs && roomDocs.length > 0) {
        setRooms(roomDocs.map(formatDocToDisplayRoom));
      }
    });

    return () => {
      unsub();
    };
  }, []);

  const toggleMute = (roomId: string) => {
    setMutedRoomIds((prev) => {
      const next = prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId];
      try {
        localStorage.setItem('prv_muted_rooms', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
    setOpenMenuRoomId(null);
  };

  const toggleMainServer = (roomId: string) => {
    setMainServerIds((prev) => {
      const next = prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId];
      try {
        localStorage.setItem('prv_main_servers', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
    setOpenMenuRoomId(null);
  };

  const categories = ['Tümü', 'Futbol', 'Müzik', 'Spor', 'Genel sohbet'];

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      !searchQuery.trim() ||
      r.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'Tümü' ||
      r.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const renderRoomIcon = (type: 'music' | 'spor' | 'chat') => {
    if (type === 'music') return <Music className="w-5 h-5 stroke-[1.8]" />;
    if (type === 'spor') return <Dumbbell className="w-5 h-5 stroke-[1.8]" />;
    return <MessageSquare className="w-5 h-5 stroke-[1.8]" />;
  };

  const handleRoomClick = (room: DisplayRoom) => {
    if (onOpenCreateRoomModal) {
      const roomDoc: RoomDocument = room.rawDoc || {
        roomId: room.roomId,
        roomName: room.roomName,
        category: room.category,
        iconType: room.iconType,
        description: `${room.roomName} topluluk odası ve sohbet kanalı.`,
        isPrivate: false,
        creatorUid: 'community-system',
        creatorName: 'Topluluk',
        creatorAvatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=200',
        participants: [],
        requests: [],
        invites: [],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onOpenCreateRoomModal('join', roomDoc);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col h-full bg-[#121116] text-white select-none px-5 pt-4 pb-20 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-2 mb-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#9b8afb]" />
          <h1 className="text-lg font-bold text-white tracking-wide">
            Odaları Keşfet
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenCreateRoomModal) onOpenCreateRoomModal('create');
          }}
          className="px-3.5 py-1.5 rounded-full bg-[#9b8afb] hover:bg-[#8a79fa] text-[#121116] text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Oda Kur</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3.5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8a9d]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Oda veya kategori ara..."
          className="w-full pl-10 pr-4 py-2.5 rounded-[16px] bg-[#1a1921] border border-[#272533] text-sm text-white placeholder-[#686377] focus:outline-none focus:border-[#9b8afb] transition-colors"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
              selectedCategory === cat
                ? 'bg-[#9b8afb] text-[#121116] font-bold'
                : 'bg-[#1c1a24] text-[#8e8a9d] hover:text-white border border-[#282536]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Rooms List */}
      <div className="space-y-3 flex-1">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12 text-[#8e8a9d] text-sm">
            Aradığınız kriterlere uygun oda bulunamadı.
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isMuted = mutedRoomIds.includes(room.roomId);
            const isMainServer = mainServerIds.includes(room.roomId);
            const isMenuOpen = openMenuRoomId === room.roomId;

            return (
              <div
                key={room.roomId}
                onClick={() => handleRoomClick(room)}
                className={`relative ${isMenuOpen ? 'z-40' : 'z-0'} p-4 rounded-[22px] ${room.cardBg} border ${room.borderBg} flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-sm hover:brightness-105`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  {/* Left Category Icon */}
                  <div
                    className={`w-12 h-12 rounded-[16px] ${room.iconBg} ${room.iconColor} flex items-center justify-center flex-shrink-0`}
                  >
                    {renderRoomIcon(room.iconType)}
                  </div>

                  {/* Title & Category/Members */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[15px] font-bold text-white truncate leading-snug">
                        {room.roomName}
                      </h3>
                      {isMuted && (
                        <BellOff className="w-3.5 h-3.5 text-[#8e8a9d] flex-shrink-0" />
                      )}
                    </div>
                    <p className={`text-[13px] font-normal ${room.subtextColor} mt-0.5 truncate`}>
                      {room.category} · {room.membersCount} üye
                    </p>
                  </div>
                </div>

                {/* Right Actions: Three-dot button & Arrow */}
                <div className="flex items-center gap-1.5 flex-shrink-0 relative">
                  {/* Three-dot Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuRoomId(isMenuOpen ? null : room.roomId);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#8e8a9d] hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                    title="Seçenekler"
                  >
                    <MoreVertical className="w-4 h-4 stroke-[2.2]" />
                  </button>

                  <div className={room.arrowColor}>
                    <ChevronRight className="w-5 h-5 stroke-[2]" />
                  </div>

                  {/* Popover Dropdown Menu */}
                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-9 w-48 bg-[#1a1824] border border-[#2e2a3f] rounded-[16px] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md"
                    >
                      {/* Option 1: Mute / Unmute Notifications */}
                      <button
                        type="button"
                        onClick={() => toggleMute(room.roomId)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#d1cedb] hover:text-white hover:bg-[#282438] rounded-[10px] transition-colors text-left cursor-pointer"
                      >
                        {isMuted ? (
                          <>
                            <Bell className="w-4 h-4 text-[#9b8afb] stroke-[2]" />
                            <span>Bildirimleri Aç</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-4 h-4 text-[#8e8a9d] stroke-[2]" />
                            <span>Bildirimleri Sustur</span>
                          </>
                        )}
                      </button>

                      {/* Option 2: Add to / Remove from Home (Main servers) */}
                      <button
                        type="button"
                        onClick={() => toggleMainServer(room.roomId)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#d1cedb] hover:text-white hover:bg-[#282438] rounded-[10px] transition-colors text-left cursor-pointer"
                      >
                        {isMainServer ? (
                          <>
                            <MinusCircle className="w-4 h-4 text-[#f87171] stroke-[2]" />
                            <span className="text-[#f87171]">Anasayfadan Çıkar</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4 text-[#4ade80] stroke-[2]" />
                            <span className="text-[#4ade80]">Anasayfaya Ekle</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

