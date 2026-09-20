import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, Users, Plus, Sparkles } from 'lucide-react';
import { auth } from '../../firebase';
import { PlayerProfile } from '../../types';
import {
  DirectConversationSummary,
  DirectMessageService,
} from '../../services/directMessageService';
import { UserProfileDocument, UserService } from '../../services/userService';
import { UserProfileData } from '../UserProfileModal';

interface MessagesTabProps {
  profile: PlayerProfile;
  onOpenChat: (opponentName?: string) => void;
  onNavigateTab: (tab: 'feed' | 'messages' | 'groups' | 'games' | 'profile') => void;
  onSelectUser?: (user: UserProfileData) => void;
}

interface ConversationRow {
  conversation: DirectConversationSummary;
  user: UserProfileDocument;
}

const formatConversationTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
};

const DroitBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-300">
    <Sparkles className="w-2.5 h-2.5" />
    Droit
  </span>
);

export const MessagesTab: React.FC<MessagesTabProps> = ({
  profile,
  onOpenChat,
  onNavigateTab,
  onSelectUser,
}) => {
  const [filter, setFilter] = useState<'all' | 'groups' | 'direct'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationRows, setConversationRows] = useState<ConversationRow[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<UserProfileDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    DirectMessageService.subscribeToMyConversations(
      async (conversations) => {
        try {
          const rows = await Promise.all(
            conversations.map(async (conversation) => {
              const user = await UserService.getUserProfile(conversation.otherParticipantUid);
              return user ? { conversation, user } : null;
            })
          );
          if (!cancelled) {
            setConversationRows(rows.filter((row): row is ConversationRow => Boolean(row)));
            setError(null);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Conversation list hydration error:', err);
          if (!cancelled) {
            setError('Sohbet listesi yüklenemedi.');
            setIsLoading(false);
          }
        }
      },
      (err) => {
        console.error('Conversation list subscription error:', err);
        if (!cancelled) {
          setError('Sohbet listesi yüklenemedi.');
          setIsLoading(false);
        }
      }
    )
      .then((nextUnsubscribe) => {
        if (cancelled) nextUnsubscribe();
        else unsubscribe = nextUnsubscribe;
      })
      .catch((err) => {
        console.error('Conversation list initialization error:', err);
        if (!cancelled) {
          setError('Sohbet listesi başlatılamadı.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const search = searchQuery.trim();
    if (!search) {
      setUserSearchResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const users = await UserService.searchUsers(search, auth.currentUser?.uid);
      setUserSearchResults(users.slice(0, 8));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const filteredRows = useMemo(() => {
    if (filter === 'groups') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversationRows;
    return conversationRows.filter(({ user, conversation }) =>
      user.displayName.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      (conversation.lastMessageText || '').toLowerCase().includes(q)
    );
  }, [conversationRows, filter, searchQuery]);

  const unreadConversationCount = useMemo(
    () => conversationRows.filter(({ conversation }) => conversation.unread).length,
    [conversationRows]
  );

  const openUserChat = (user: UserProfileDocument) => {
    setSearchQuery('');
    setUserSearchResults([]);
    onOpenChat(user.username);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#060810] text-slate-100 overflow-y-auto pb-24 space-y-3.5 px-3 sm:px-4 pt-2.5 select-none">
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-2xl p-3.5 shadow-lg flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <span>Mesajlar</span>
            {unreadConversationCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                {unreadConversationCount}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 font-semibold">Gerçek zamanlı birebir sohbetler</p>
        </div>
        <button type="button" onClick={() => setSearchQuery('@')} className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white p-2.5 rounded-xl font-bold shadow-md active:scale-95 transition-all cursor-pointer" title="Yeni Sohbet">
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      <div className="relative">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.replace(/^@/, ''))} placeholder="Kullanıcı veya sohbet ara..." className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-400 text-white placeholder-slate-400 text-xs font-semibold rounded-2xl pl-10 pr-4 py-2.5 outline-none transition-all shadow-inner" />
        <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
      </div>

      {searchQuery.trim() && userSearchResults.length > 0 && (
        <div className="bg-[#0d1322] border border-cyan-500/20 rounded-2xl overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-cyan-400 font-black">Kullanıcılar</div>
          {userSearchResults.map((user) => (
            <button key={user.uid} type="button" onClick={() => openUserChat(user)} className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-slate-800/70 transition-colors text-left">
              <img src={user.avatarUrl} alt={user.displayName} className="w-9 h-9 rounded-xl object-cover bg-slate-800" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{user.displayName}</div>
                  {UserService.isDroitProfile(user) && <DroitBadge />}
                </div>
                <div className="text-[11px] text-slate-400 truncate">@{user.username}{user.roleTitle ? ` · ${user.roleTitle}` : ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
        <button type="button" onClick={() => setFilter('all')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'}`}>Tümü ({conversationRows.length})</button>
        <button type="button" onClick={() => setFilter('direct')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'direct' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'}`}>Özel Mesajlar</button>
        <button type="button" onClick={() => setFilter('groups')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'groups' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'}`}>Gruplar</button>
      </div>

      {filter === 'groups' ? (
        <div className="py-10 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
          <Users className="w-9 h-9 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-300">Grup sohbetleri sonraki fazda</p>
          <p className="text-[11px] text-slate-500 mt-1">Önce 1:1 sohbet omurgasını sağlamlaştırıyoruz.</p>
        </div>
      ) : isLoading ? (
        <div className="py-10 text-center text-xs text-slate-500">Sohbetler yükleniyor...</div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl">{error}</div>
      ) : filteredRows.length > 0 ? (
        <div className="space-y-2.5">
          {filteredRows.map(({ conversation, user }) => (
            <div key={conversation.conversationId} onClick={() => openUserChat(user)} className={`bg-gradient-to-r from-[#0d1626] via-[#0a101d] to-[#0d1626] border rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer shadow-md active:scale-[0.99] group ${conversation.unread ? 'border-cyan-500/60' : 'border-slate-800/80 hover:border-cyan-500/40'}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div onClick={(e) => { if (!onSelectUser) return; e.stopPropagation(); onSelectUser({ username: user.username, name: user.displayName, avatar: user.avatarUrl, isOnline: true, bio: user.roleTitle || `${user.displayName} ile doğrudan sohbet` }); }} className="relative flex-shrink-0">
                  <img src={user.avatarUrl} alt={user.displayName} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-cyan-500/30" />
                  {conversation.unread && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-[#0d1626]" />}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className={`text-sm text-white truncate ${conversation.unread ? 'font-black' : 'font-bold'}`}>{user.displayName}</h4>
                      {UserService.isDroitProfile(user) && <DroitBadge />}
                    </div>
                    <span className={`text-[10px] font-bold ml-2 flex-shrink-0 ${conversation.unread ? 'text-cyan-300' : 'text-slate-400'}`}>{formatConversationTime(conversation.lastMessageAt || conversation.updatedAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mb-0.5">@{user.username}{user.roleTitle ? ` · ${user.roleTitle}` : ''}</p>
                  <p className={`text-xs truncate ${conversation.unread ? 'text-slate-100 font-bold' : 'text-slate-400 font-medium'}`}>{conversation.lastMessageText || 'Sohbet başladı'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-2">
          <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-300">Henüz gerçek sohbet yok</p>
          <p className="text-[11px] text-slate-500">Yukarıdan bir kullanıcı ara ve ilk mesajı gönder.</p>
        </div>
      )}
    </div>
  );
};
