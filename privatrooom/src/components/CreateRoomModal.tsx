import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PlusCircle,
  Plus,
  Users,
  Sparkles,
  Crown,
  Lock,
  Globe2,
  Check,
  Loader2,
  Search,
  ArrowLeft,
  Send,
  Volume2,
  Hash,
  LogOut,
  Menu,
  Smile,
  Gift,
  Settings,
  MicOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RoomService, RoomDocument, RoomChatMessage, RoomParticipant, ZIPO_BOT_USER } from '../services/roomService';
import { UserService, UserProfileDocument } from '../services/userService';
import { auth, ensureFirebaseAuth } from '../firebase';
import { UserProfileData } from './UserProfileModal';
import { RoleSettingsModal, UserRoleSettings } from './RoleSettingsModal';
import { DiscordUserProfileModal, DiscordProfileUser, MuteDurationType } from './DiscordUserProfileModal';
import { DiscordServerSettingsModal } from './DiscordServerSettingsModal';
import { UserRoleType } from '../services/roomService';

const formatRoomMessageTimestamp = (msg: RoomChatMessage): string => {
  const raw = msg.createdAtServer;
  let date: Date | null = null;

  if (raw instanceof Date) date = raw;
  else if (raw && typeof raw?.toDate === 'function') date = raw.toDate();
  else if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  } else if (raw && typeof raw?.seconds === 'number') {
    date = new Date(raw.seconds * 1000);
  }

  const time = date
    ? date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : msg.timestamp;

  return time.includes('Bugün') ? time : `Bugün ${time}`;
};

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'create' | 'join' | 'view';
  initialRoom?: RoomDocument | null;
  onSelectUser?: (user: UserProfileData) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'create',
  initialRoom = null,
  onSelectUser,
}) => {
  // Modal main view: 'create' | 'room'
  const [view, setView] = useState<'create' | 'room'>('create');

  // Active channel: 'chat' | 'voice'
  const [activeChannel, setActiveChannel] = useState<'chat' | 'voice'>('chat');

  // Right Panel subtab for Host: 'members' | 'requests' | 'invite'
  const [rightPanelTab, setRightPanelTab] = useState<'members' | 'requests' | 'invite'>('members');

  // Mobile Drawers
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // Active Room State
  const [activeRoom, setActiveRoom] = useState<RoomDocument | null>(null);

  // Firebase auth may become ready after the first render. Keep the resolved
  // user in React state so owner/admin UI gates re-render deterministically.
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Form State for Creating Room
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Genel Sohbet');
  const [coverUrl, setCoverUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kairaInviteLoading, setKairaInviteLoading] = useState(false);
  const [kairaInviteError, setKairaInviteError] = useState<string | null>(null);
  const [hasValidatedRoomAdminCapability, setHasValidatedRoomAdminCapability] = useState(false);

  // In-Room Chat Messages
  const [roomMessages, setRoomMessages] = useState<RoomChatMessage[]>([]);
  const [roomInputMessage, setRoomInputMessage] = useState('');
  const [activeTestRunId, setActiveTestRunId] = useState('');
  const [activeTestRunPersisted, setActiveTestRunPersisted] = useState<boolean | null>(null);
  const [testRunReview, setTestRunReview] = useState<any | null>(null);
  const [testRunReviewLoading, setTestRunReviewLoading] = useState(false);
  const [testRunReviewError, setTestRunReviewError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User Search for Invites
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfileDocument[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());

  // Loading state for individual actions
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // User Role & Color Settings Modal
  const [isRoleSettingsOpen, setIsRoleSettingsOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<DiscordProfileUser | null>(null);
  const [mutedUsersData, setMutedUsersData] = useState<Record<string, { isMuted: boolean; duration?: string }>>({});
  const [kickedUserIds, setKickedUserIds] = useState<Set<string>>(new Set());
  const [bannedUserIds, setBannedUserIds] = useState<Set<string>>(new Set());
  const [userRoleOverrides, setUserRoleOverrides] = useState<
    Record<
      string,
      {
        roleId?: UserRoleType;
        roleColor?: string;
        roleIcon?: string;
        roleName?: string;
        customNickname?: string;
      }
    >
  >({});
  const [userRoleSettings, setUserRoleSettings] = useState<UserRoleSettings>(() => {
    try {
      const saved = localStorage.getItem('user_chat_role_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return {
      roleColor: '#ff4757',
      roleIcon: '👑',
      roleName: 'Kral',
    };
  });

  const isHost = activeRoom?.creatorUid === currentUser?.uid;
  const currentRoomParticipant = (activeRoom?.participants || []).find(
    (participant) => participant.uid === currentUser?.uid,
  );
  const canManageKaira =
    Boolean(isHost) ||
    currentRoomParticipant?.roleId === 'owner' ||
    currentRoomParticipant?.roleId === 'admin' ||
    hasValidatedRoomAdminCapability;

  // Handler for saving role settings
  const handleSaveRoleSettings = (newSettings: UserRoleSettings) => {
    setUserRoleSettings(newSettings);
    try {
      localStorage.setItem('user_chat_role_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }

    // Instantly update current user's existing messages in state
    setRoomMessages((prev) =>
      prev.map((msg) => {
        if (msg.senderUid === currentUser?.uid || msg.senderUid === 'me') {
          return {
            ...msg,
            roleColor: newSettings.roleColor,
            roleIcon: newSettings.roleIcon,
            roleName: newSettings.roleName,
          };
        }
        return msg;
      })
    );

    // Update current user in room participants list
    if (activeRoom && currentUser) {
      const updatedParticipants = (activeRoom.participants || []).map((p) => {
        if (p.uid === currentUser.uid) {
          return {
            ...p,
            roleColor: newSettings.roleColor,
            roleIcon: newSettings.roleIcon,
            roleName: newSettings.roleName,
          };
        }
        return p;
      });
      setActiveRoom({
        ...activeRoom,
        participants: updatedParticipants,
      });
    }
  };

  // Initialize or reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setKairaInviteError(null);
      setKairaInviteLoading(false);
      setMobileLeftOpen(false);
      setMobileRightOpen(false);

      if (initialRoom) {
        setActiveRoom(initialRoom);
        setView('room');
        setActiveChannel('chat');
        setRightPanelTab('members');
        setRoomMessages([]);
      } else {
        setView('create');
        setActiveRoom(null);
      }

      ensureFirebaseAuth()
        .then((u) => {
          setCurrentUser(u);
          if (!roomName) {
            setRoomName(`${u.displayName || 'Sen'}'in Odası`);
          }
        })
        .catch(console.error);
    } else {
      setView('create');
      setActiveRoom(null);
      setLoading(false);
      setErrorMessage(null);
      setUserSearchQuery('');
      setSearchResults([]);
      setMobileLeftOpen(false);
      setMobileRightOpen(false);
    }
  }, [isOpen, initialRoom]);

  // Re-check the browser-held owner capability against server authority.
  useEffect(() => {
    let cancelled = false;
    setHasValidatedRoomAdminCapability(false);

    if (!activeRoom?.roomId || view !== 'room') {
      return () => {
        cancelled = true;
      };
    }

    if (!RoomService.hasStoredRoomAdminCapability(activeRoom.roomId)) {
      return () => {
        cancelled = true;
      };
    }

    RoomService.checkRoomAdminCapability(activeRoom.roomId)
      .then((valid) => {
        if (!cancelled) {
          setHasValidatedRoomAdminCapability(valid);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasValidatedRoomAdminCapability(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoom?.roomId, view]);

  // Real-time Firestore room subscription
  useEffect(() => {
    if (!activeRoom?.roomId || view !== 'room') return;

    const unsub = RoomService.subscribeToRoom(
      activeRoom.roomId,
      (updatedRoom) => {
        setActiveRoom(updatedRoom);
      },
      (err) => {
        console.error('Oda abonelik hatası:', err);
      }
    );

    const unsubMsgs = RoomService.subscribeToRoomMessages(
      activeRoom.roomId,
      (firestoreMsgs) => {
        setRoomMessages(firestoreMsgs || []);
      },
      (err) => {
        console.error('Oda mesajları dinleme hatası:', err);
      }
    );

    return () => {
      unsub();
      unsubMsgs();
    };
  }, [activeRoom?.roomId, view]);

  // Search users for invite tab
  useEffect(() => {
    if (!userSearchQuery.trim() || rightPanelTab !== 'invite') {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const users = await UserService.searchUsers(userSearchQuery, currentUser?.uid);
        setSearchResults(users);
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery, rightPanelTab, currentUser?.uid]);

  // Restore the last known TestRun id for this beta room.
  useEffect(() => {
    if (!activeRoom?.roomId) {
      setActiveTestRunId('');
      setActiveTestRunPersisted(null);
      setTestRunReview(null);
      setTestRunReviewError(null);
      return;
    }
    setTestRunReview(null);
    setTestRunReviewError(null);
    try {
      setActiveTestRunId(
        localStorage.getItem(`kaira_test_run_${activeRoom.roomId}`) || ''
      );
    } catch {
      setActiveTestRunId('');
    }
  }, [activeRoom?.roomId]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (view === 'room' && activeChannel === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [view, activeChannel, roomMessages]);

  if (!isOpen) return null;

  // Handler: Create new room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!roomName.trim()) {
      setErrorMessage('Lütfen oda adını girin.');
      return;
    }

    setLoading(true);
    try {
      const room = await RoomService.createRoom({
        roomName,
        description,
        isPrivate,
        category,
        coverUrl: coverUrl.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setActiveRoom(room);
      setView('room');
      setActiveChannel('chat');
      setRightPanelTab('members');
      setMobileLeftOpen(false);
      setMobileRightOpen(false);
      setRoomMessages([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Oda oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteKaira = async () => {
    if (!activeRoom?.roomId || !canManageKaira || kairaInviteLoading) return;
    setKairaInviteLoading(true);
    setKairaInviteError(null);
    try {
      const result = await RoomService.inviteKaira(activeRoom.roomId);
      setActiveRoom(result.room);
      if (result.introMessage) {
        setRoomMessages((prev) =>
          prev.some((message) => message.id === result.introMessage?.id)
            ? prev
            : [...prev, result.introMessage as RoomChatMessage],
        );
      }
    } catch (error: any) {
      setKairaInviteError(error?.message || 'Kaira çağrılırken hata oluştu.');
    } finally {
      setKairaInviteLoading(false);
    }
  };

  const handleOpenTestRunReview = async () => {
    if (!isHost || !activeRoom?.roomId || !activeTestRunId || !currentUser) return;

    setTestRunReviewLoading(true);
    setTestRunReviewError(null);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `/api/integrations/kaira/test-runs/${encodeURIComponent(activeTestRunId)}/review?roomId=${encodeURIComponent(activeRoom.roomId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.packet) {
        throw new Error(payload?.error || `test_run_review_http_${response.status}`);
      }
      setTestRunReview(payload.packet);
    } catch (error: any) {
      setTestRunReviewError(error?.message || 'TestRun inceleme kaydı açılamadı.');
    } finally {
      setTestRunReviewLoading(false);
    }
  };

  // Handler: Send Message Text Helper
  const handleSendTextMessage = async (text: string) => {
    const messageText = text.trim();
    if (!messageText) return;

    if (currentUser?.uid && mutedUsersData[currentUser.uid]?.isMuted) {
      const durationLabel = mutedUsersData[currentUser.uid]?.duration;
      alert(
        durationLabel
          ? `${durationLabel} süreyle sessize alındığınız için odaya mesaj gönderemezsiniz.`
          : 'Sessize alındığınız için odaya mesaj gönderemezsiniz.'
      );
      return;
    }

    const senderUid = currentUser?.uid || auth.currentUser?.uid || 'beta_room_user';
    const myName = currentUser?.displayName || auth.currentUser?.displayName || 'Oyuncu';
    const myAvatar =
      currentUser?.photoURL ||
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150';

    const roleColor = userRoleSettings.roleColor || (isHost ? '#ff4757' : '#2ed573');
    const roleIcon = userRoleSettings.roleIcon || (isHost ? '👑' : '🌱');
    const roleName = userRoleSettings.roleName || (isHost ? 'Yönetici' : 'Üye');

    const newMsg: RoomChatMessage = {
      id: `rm_${Date.now()}`,
      senderUid,
      senderName: myName,
      senderUsername: myName.toLowerCase().replace(/\s+/g, '_'),
      senderAvatar: myAvatar,
      roleColor,
      roleIcon,
      roleName,
      content: messageText,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    // Beta chat must stay usable even when Firestore persistence is unavailable.
    setRoomMessages((prev) => [...prev, newMsg]);

    if (activeRoom?.roomId) {
      await RoomService.sendRoomMessage(activeRoom.roomId, {
        messageId: newMsg.id,
        senderUid: newMsg.senderUid,
        senderName: newMsg.senderName,
        senderUsername: newMsg.senderUsername,
        senderAvatar: newMsg.senderAvatar,
        roleColor: newMsg.roleColor,
        roleIcon: newMsg.roleIcon,
        roleName: newMsg.roleName,
        content: newMsg.content,
      }).catch((err) => {
        console.error('[Room Chat] Firestore persist failed:', err);
      });

      const kairaIsActive =
        activeRoom.kairaPresence?.state === 'active' &&
        (activeRoom.participants || []).some(
          (participant) =>
            participant.uid === 'droit_kaira_22261aadeb3a5d02eed3',
        );

      if (kairaIsActive) {
      try {
        const betaResponse = await fetch('/api/integrations/kaira/beta-room-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: activeRoom.roomId,
            messageId: newMsg.id,
            text: messageText,
            userId: newMsg.senderUid,
            userName: newMsg.senderName,
            username: newMsg.senderUsername,
          }),
        });
        const betaData = await betaResponse.json().catch(() => null);
        if (!betaResponse.ok) {
          throw new Error(betaData?.error || `kaira_beta_http_${betaResponse.status}`);
        }

        const returnedTestRunId = String(betaData?.testRunId || '').trim();
        if (returnedTestRunId) {
          setActiveTestRunId(returnedTestRunId);
          try {
            localStorage.setItem(
              `kaira_test_run_${activeRoom.roomId}`,
              returnedTestRunId
            );
          } catch {
            // Beta observability must not block chat if localStorage is unavailable.
          }
        }

        const capturePersisted =
          typeof betaData?.testCapture?.persisted === 'boolean'
            ? betaData.testCapture.persisted
            : null;
        setActiveTestRunPersisted(capturePersisted);

        // Kaira replies are persisted server-side before this response returns.
        // The Firestore subscription is the single UI authority, preventing
        // temporary local replies that disappear on the next snapshot/refresh.
        const replyText = String(betaData?.reply || '').trim();
        const replyMessageId = String(betaData?.replyMessageId || '').trim();
        if (replyText && !replyMessageId) {
          throw new Error('kaira_reply_not_persisted');
        }
      } catch (err) {
        console.error('[Kaira Beta Room] request failed:', err);
        setErrorMessage('Kaira şu an yanıt veremedi. Mesajın yine gönderildi.');
      }
      }
    }

    // Check if user mentioned @Zipo
    if (/@zipo/i.test(messageText)) {
      RoomService.callZipoApi(messageText, activeRoom?.roomId).then(async (replyText) => {
        const zipoMsgData = {
          senderUid: ZIPO_BOT_USER.uid,
          senderName: ZIPO_BOT_USER.name,
          senderUsername: ZIPO_BOT_USER.username,
          senderAvatar: ZIPO_BOT_USER.avatar,
          roleColor: ZIPO_BOT_USER.roleColor,
          roleIcon: ZIPO_BOT_USER.roleIcon,
          roleName: ZIPO_BOT_USER.roleName,
          content: replyText,
        };

        if (activeRoom?.roomId) {
          await RoomService.sendRoomMessage(activeRoom.roomId, zipoMsgData);
        } else {
          setRoomMessages((prev) => [
            ...prev,
            {
              id: `rm_zipo_${Date.now()}`,
              ...zipoMsgData,
              timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      });
    }
  };

  const sendCurrentRoomMessage = async () => {
    const messageText = roomInputMessage.trim();
    if (!messageText) return;
    setRoomInputMessage('');
    await handleSendTextMessage(messageText);
  };

  // Handler: Send Message
  const handleSendRoomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    void sendCurrentRoomMessage();
  };

  // Handler: Respond to join request
  const handleRespondToRequest = async (targetUid: string, accept: boolean) => {
    if (!activeRoom?.roomId) return;
    setActionLoadingId(targetUid);
    try {
      await RoomService.respondToJoinRequest(activeRoom.roomId, targetUid, accept);
    } catch (err: any) {
      alert(err.message || 'İstek yanıtlanırken hata oluştu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Send invite
  const handleSendInvite = async (targetUser: UserProfileDocument) => {
    if (!activeRoom?.roomId) return;
    if (bannedUserIds.has(targetUser.uid)) {
      alert('Bu kullanıcı sunucudan kalıcı olarak yasaklandığı için davet edilemez.');
      return;
    }
    setActionLoadingId(targetUser.uid);
    try {
      await RoomService.sendInvite(activeRoom.roomId, targetUser);
      setInvitedUserIds((prev) => new Set(prev).add(targetUser.uid));
      // If user was previously kicked, sending an invite allows them to rejoin
      setKickedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.uid);
        return next;
      });
    } catch (err: any) {
      alert(err.message || 'Davet gönderilirken hata oluştu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Leave room
  const handleLeaveRoom = async () => {
    if (activeRoom?.roomId) {
      await RoomService.leaveRoom(activeRoom.roomId);
    }
    setActiveRoom(null);
    onClose();
  };

  // Helper: Open Discord user profile modal & role popover
  const handleOpenUserProfile = (user: {
    uid: string;
    name: string;
    username?: string;
    avatar: string;
    roleColor?: string;
    roleIcon?: string;
    roleName?: string;
  }) => {
    // Find latest role info from participants list or overrides
    const participant = participantsList.find((p) => p.uid === user.uid);
    const override = userRoleOverrides[user.uid];

    const finalDisplayName = override?.customNickname || user.name;

    const finalColor =
      override?.roleColor ||
      user.roleColor ||
      participant?.roleColor ||
      (user.uid === currentUser?.uid ? userRoleSettings.roleColor : undefined);

    const finalIcon =
      override?.roleIcon !== undefined
        ? override.roleIcon
        : (user.roleIcon ||
          participant?.roleIcon ||
          (user.uid === currentUser?.uid ? userRoleSettings.roleIcon : undefined));

    const finalName =
      override?.roleName ||
      user.roleName ||
      participant?.roleName ||
      (user.uid === currentUser?.uid ? userRoleSettings.roleName : undefined);

    const isUserHost = participant?.isHost || user.uid === activeRoom?.creatorUid;
    const mutedInfo = mutedUsersData[user.uid];

    setSelectedProfileUser({
      uid: user.uid,
      name: finalDisplayName,
      username: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
      avatar: user.avatar,
      roleId: override?.roleId || (isUserHost ? 'owner' : 'member'),
      roleColor: finalColor,
      roleIcon: finalIcon,
      roleName: finalName,
      isHost: isUserHost,
      isMuted: Boolean(mutedInfo?.isMuted),
      muteDuration: mutedInfo?.duration,
      isBanned: bannedUserIds.has(user.uid),
      customNickname: override?.customNickname,
    });
  };

  // Moderation Handler: Mute / Timeout / Unmute user
  const handleMuteUser = (targetUid: string, mute: boolean, duration?: MuteDurationType) => {
    setMutedUsersData((prev) => {
      const next = { ...prev };
      if (mute) {
        next[targetUid] = { isMuted: true, duration: duration || '1 Saat' };
      } else {
        delete next[targetUid];
      }
      return next;
    });

    setSelectedProfileUser((prev) => {
      if (!prev || prev.uid !== targetUid) return prev;
      return {
        ...prev,
        isMuted: mute,
        muteDuration: mute ? (duration || '1 Saat') : undefined,
      };
    });
  };

  // Moderation Handler: Kick user (Davetle tekrar gelebilir)
  const handleKickUser = (targetUid: string) => {
    setKickedUserIds((prev) => new Set(prev).add(targetUid));
    setSelectedProfileUser(null);
  };

  // Moderation Handler: Ban user (Kalıcı engel)
  const handleBanUser = (targetUid: string) => {
    setBannedUserIds((prev) => new Set(prev).add(targetUid));
    setKickedUserIds((prev) => new Set(prev).add(targetUid));
    setSelectedProfileUser(null);
  };

  // Handler: Assign / change role for any user (mock users, others, or self)
  const handleAssignRoleToUser = (
    targetUid: string,
    roleData: {
      roleId: UserRoleType;
      roleColor: string;
      roleIcon: string;
      roleName: string;
    }
  ) => {
    // 1. Store in role overrides state
    setUserRoleOverrides((prev) => ({
      ...prev,
      [targetUid]: {
        ...(prev[targetUid] || {}),
        ...roleData,
      },
    }));

    // 2. Immediately update messages in chat for this user
    setRoomMessages((prev) =>
      prev.map((msg) => {
        if (
          msg.senderUid === targetUid ||
          (targetUid === currentUser?.uid && (msg.senderUid === 'me' || msg.senderUid === currentUser?.uid))
        ) {
          return {
            ...msg,
            roleColor: roleData.roleColor,
            roleIcon: roleData.roleIcon,
            roleName: roleData.roleName,
          };
        }
        return msg;
      })
    );

    // 3. If target user is the current user, sync to userRoleSettings & localStorage
    if (targetUid === currentUser?.uid || targetUid === 'me') {
      const updatedSettings: UserRoleSettings = {
        ...userRoleSettings,
        roleId: roleData.roleId,
        roleColor: roleData.roleColor,
        roleIcon: roleData.roleIcon,
        roleName: roleData.roleName,
      };
      setUserRoleSettings(updatedSettings);
      try {
        localStorage.setItem('user_chat_role_settings', JSON.stringify(updatedSettings));
      } catch (e) {
        console.error(e);
      }
    }

    // 4. Update currently opened profile card view
    setSelectedProfileUser((prev) => {
      if (!prev || prev.uid !== targetUid) return prev;
      return {
        ...prev,
        roleId: roleData.roleId,
        roleColor: roleData.roleColor,
        roleIcon: roleData.roleIcon,
        roleName: roleData.roleName,
      };
    });
  };

  // Handler: Update Server Profile (Nickname, Custom Color, Role Icon)
  const handleUpdateServerProfile = (
    targetUid: string,
    profileData: {
      customNickname?: string;
      roleColor?: string;
      roleIcon?: string;
      roleName?: string;
    }
  ) => {
    // 1. Store in overrides
    setUserRoleOverrides((prev) => ({
      ...prev,
      [targetUid]: {
        ...(prev[targetUid] || {}),
        ...profileData,
      },
    }));

    // 2. Update existing chat messages instantly
    setRoomMessages((prev) =>
      prev.map((msg) => {
        if (
          msg.senderUid === targetUid ||
          (targetUid === currentUser?.uid && (msg.senderUid === 'me' || msg.senderUid === currentUser?.uid))
        ) {
          return {
            ...msg,
            senderName:
              profileData.customNickname !== undefined && profileData.customNickname.trim() !== ''
                ? profileData.customNickname
                : msg.senderName,
            roleColor: profileData.roleColor !== undefined ? profileData.roleColor : msg.roleColor,
            roleIcon: profileData.roleIcon !== undefined ? profileData.roleIcon : msg.roleIcon,
            roleName: profileData.roleName !== undefined ? profileData.roleName : msg.roleName,
          };
        }
        return msg;
      })
    );

    // 3. Update currently opened profile card view
    setSelectedProfileUser((prev) => {
      if (!prev || prev.uid !== targetUid) return prev;
      return {
        ...prev,
        name:
          profileData.customNickname !== undefined && profileData.customNickname.trim() !== ''
            ? profileData.customNickname
            : prev.name,
        roleColor: profileData.roleColor !== undefined ? profileData.roleColor : prev.roleColor,
        roleIcon: profileData.roleIcon !== undefined ? profileData.roleIcon : prev.roleIcon,
        roleName: profileData.roleName !== undefined ? profileData.roleName : prev.roleName,
      };
    });
  };

  // Helper: Mention user in chat input
  const handleMentionUser = (username: string) => {
    const clean = username.replace(/^@/, '');
    setRoomInputMessage((prev) => (prev ? `${prev} @${clean} ` : `@${clean} `));
  };

  const rawParticipants = Array.isArray(activeRoom?.participants) ? activeRoom.participants : [];

  // Merge only real room participants; legacy mock accounts are intentionally excluded.
  const getMergedParticipants = (): RoomParticipant[] => {
    const map = new Map<string, RoomParticipant>();

    // Oda Kurucusu / Gerçek Katılımcılar
    if (activeRoom) {
      if (!map.has(activeRoom.creatorUid)) {
        const override = userRoleOverrides[activeRoom.creatorUid];
        map.set(activeRoom.creatorUid, {
          uid: activeRoom.creatorUid,
          displayName: override?.customNickname || activeRoom.creatorName,
          username: activeRoom.creatorName.toLowerCase().replace(/\s+/g, '_'),
          avatarUrl: activeRoom.creatorAvatar,
          roleColor: override?.roleColor || '#ff4757',
          roleIcon: override?.roleIcon !== undefined ? override.roleIcon : '👑',
          roleName: override?.roleName || 'Sunucu Sahibi',
          isHost: true,
          joinedAt: activeRoom.createdAt,
        });
      }
    }

    rawParticipants.forEach((p) => {
      const override = userRoleOverrides[p.uid];
      map.set(p.uid, {
        ...p,
        displayName: override?.customNickname || p.displayName,
        roleColor: override?.roleColor || p.roleColor,
        roleIcon: override?.roleIcon !== undefined ? override.roleIcon : p.roleIcon,
        roleName: override?.roleName || p.roleName,
      });
    });

    // Giriş yapan aktif kullanıcı (Kullanıcının seçtiği rol & renk ayarları ile)
    if (currentUser) {
      const existing = map.get(currentUser.uid);
      const override = userRoleOverrides[currentUser.uid];
      map.set(currentUser.uid, {
        uid: currentUser.uid,
        displayName: override?.customNickname || currentUser.displayName || 'Oyuncu',
        username: currentUser.displayName?.toLowerCase().replace(/\s+/g, '_') || 'oyuncu',
        avatarUrl:
          currentUser.photoURL ||
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
        roleColor:
          override?.roleColor ||
          userRoleSettings.roleColor ||
          existing?.roleColor ||
          (isHost ? '#ff4757' : '#2ed573'),
        roleIcon:
          override?.roleIcon !== undefined
            ? override.roleIcon
            : (userRoleSettings.roleIcon || existing?.roleIcon || (isHost ? '👑' : '🌱')),
        roleName:
          override?.roleName ||
          userRoleSettings.roleName ||
          existing?.roleName ||
          (isHost ? 'Sunucu Sahibi' : 'Üye'),
        isHost: isHost || existing?.isHost || false,
        joinedAt: existing?.joinedAt || new Date().toISOString(),
      });
    }

    return Array.from(map.values()).filter(
      (p) => !kickedUserIds.has(p.uid) && !bannedUserIds.has(p.uid)
    );
  };

  const participantsList = getMergedParticipants();

  const requestsList = Array.isArray(activeRoom?.requests) ? activeRoom.requests : [];
  const pendingRequests = requestsList.filter((r) => r.status === 'pending');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-x-0 top-0 bottom-16 z-40 flex items-center justify-center p-0 sm:p-2 bg-black/90 select-none overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (view === 'room') {
              if (confirm('Odadan çıkmak istediğinizden emin misiniz?')) {
                onClose();
              }
            } else {
              onClose();
            }
          }}
          className="absolute inset-0"
        />

        {/* CONTAINER FRAME */}
        {view === 'create' ? (
          /* ============================================================ */
          /*                       CREATE ROOM MODAL                      */
          /* ============================================================ */
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 p-5 space-y-4 max-h-[90vh] flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-white truncate">Yeni Oda Kur</h3>
                  <p className="text-[11px] text-slate-400 truncate">Arkadaşlarınla buluşabileceğin oda oluştur</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex-shrink-0">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateRoom} className="space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Oda Adı <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Örn: Ahmet'in Kelime Odası..."
                  required
                  className="w-full bg-[#172033] border border-slate-700/80 focus:border-cyan-400 text-white placeholder-slate-500 text-xs font-bold rounded-2xl px-4 py-3 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Kısa Açıklama <span className="text-slate-500">(Opsiyonel)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Odanız hakkında kısa bir bilgi..."
                  rows={2}
                  className="w-full bg-[#172033] border border-slate-700/80 focus:border-cyan-400 text-white placeholder-slate-500 text-xs font-bold rounded-2xl px-4 py-2.5 outline-none transition-all shadow-inner resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#172033] border border-slate-700/80 focus:border-cyan-400 text-white text-xs font-bold rounded-2xl px-4 py-3 outline-none transition-all shadow-inner"
                >
                  <option value="Genel Sohbet">Genel Sohbet</option>
                  <option value="Futbol">Futbol</option>
                  <option value="Müzik">Müzik</option>
                  <option value="Spor">Spor</option>
                  <option value="Oyun Kulübü">Oyun Kulübü</option>
                  <option value="Eğlence">Eğlence</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Kapak Görseli <span className="text-slate-500">(URL)</span>
                  </label>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#172033] border border-slate-700/80 focus:border-cyan-400 text-white placeholder-slate-500 text-xs font-medium rounded-2xl px-3 py-2.5 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Oda PP <span className="text-slate-500">(URL)</span>
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#172033] border border-slate-700/80 focus:border-cyan-400 text-white placeholder-slate-500 text-xs font-medium rounded-2xl px-3 py-2.5 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Room Access Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Erişim Şekli</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      !isPrivate
                        ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-md'
                        : 'bg-[#121c30] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Globe2 className={`w-4 h-4 ${!isPrivate ? 'text-emerald-400' : 'text-slate-500'}`} />
                      {!isPrivate && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black">Açık Oda</h4>
                      <p className="text-[10px] opacity-80">Doğrudan katılınabilir</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      isPrivate
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                        : 'bg-[#121c30] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Lock className={`w-4 h-4 ${isPrivate ? 'text-amber-400' : 'text-slate-500'}`} />
                      {isPrivate && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black">Kapalı Oda</h4>
                      <p className="text-[10px] opacity-80">Onay gerektirir</p>
                    </div>
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg border border-emerald-300/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Oda Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Odayı Oluştur ve Katıl</span>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        ) : (
          /* ============================================================ */
          /*                 DISCORD STYLE 3-COLUMN ROOM                  */
          /* ============================================================ */
          activeRoom && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-6xl h-full bg-[#313338] text-[#dbdee1] rounded-none sm:rounded-2xl shadow-2xl flex flex-row overflow-hidden border border-[#1f2023] font-sans z-10"
            >
              {/* Mobile Backdrops for Left & Right Drawers */}
              <AnimatePresence>
                {mobileLeftOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileLeftOpen(false)}
                    className="absolute inset-0 bg-black/60 z-30 md:hidden"
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {mobileRightOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileRightOpen(false)}
                    className="absolute inset-0 bg-black/60 z-30 md:hidden"
                  />
                )}
              </AnimatePresence>

              {/* ------------------------------------------------------------ */}
              {/* 1. SOL PANEL (KANALLAR) — Fixed 240px Desktop / Drawer Mobile */}
              {/* ------------------------------------------------------------ */}
              <div
                className={`
                  fixed md:relative inset-y-0 left-0 z-40 md:z-auto
                  w-[240px] bg-[#2b2d31] border-r border-[#1f2023]
                  flex flex-col flex-shrink-0 select-none transition-transform duration-200 ease-in-out
                  ${mobileLeftOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
                `}
              >
                {/* Header: Room Name & Server Settings */}
                <div className="h-12 px-3 border-b border-[#1f2023] flex items-center justify-between bg-[#2b2d31] shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-extrabold text-white text-xs sm:text-sm truncate tracking-tight">
                      {activeRoom.roomName}
                    </h3>
                    {activeRoom.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Globe2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Sunucu Ayarları Butonu */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsServerSettingsOpen(true);
                        setMobileLeftOpen(false);
                      }}
                      className="p-1.5 rounded-md text-[#949ba4] hover:text-[#f2f3f5] hover:bg-[#35373c] transition-colors cursor-pointer flex-shrink-0"
                      title="Sunucu Ayarları"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Odadan çıkmak istediğinizden emin misiniz?')) {
                          handleLeaveRoom();
                        }
                      }}
                      className="p-1.5 rounded-md text-[#949ba4] hover:text-rose-400 hover:bg-[#35373c] transition-colors cursor-pointer flex-shrink-0"
                      title="Odadan Ayrıl"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileLeftOpen(false)}
                      className="p-1 rounded-md text-[#949ba4] hover:text-white md:hidden cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Channels List & Banner */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {/* 2. Sunucu Kapak Fotoğrafı (Server Banner) */}
                  <div
                    onClick={() => {
                      setIsServerSettingsOpen(true);
                      setMobileLeftOpen(false);
                    }}
                    className="relative h-24 w-full rounded-xl overflow-hidden shadow-md border border-[#35373c]/50 group bg-[#1e1f22] cursor-pointer"
                    title="Sunucu Görünümü & Ayarları"
                  >
                    {/* Kapak Görseli */}
                    <img
                      src={
                        activeRoom.coverUrl ||
                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600'
                      }
                      alt={activeRoom.roomName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Gradient Karartma */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                    {/* Sol Alt: Sunucu Simgesi ve Adı */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/40 shadow-md flex-shrink-0 bg-[#2b2d31]">
                        <img
                          src={
                            activeRoom.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
                          }
                          alt={activeRoom.roomName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-white truncate drop-shadow-md">
                          {activeRoom.roomName}
                        </div>
                        <div className="text-[9px] text-white/80 font-medium flex items-center gap-1 drop-shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{participantsList.length} Katılımcı</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Kanal Listesi Düzeni */}
                  <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-[#949ba4] uppercase tracking-wider flex items-center justify-between">
                    <span>Kanallar</span>
                  </div>

                  {/* 💬 Sohbet Kanalı */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannel('chat');
                      setMobileLeftOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      activeChannel === 'chat'
                        ? 'bg-[#35373c] text-white'
                        : 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]'
                    }`}
                  >
                    <Hash className="w-4 h-4 text-[#80848e] flex-shrink-0" />
                    <span className="truncate">Sohbet</span>
                  </button>

                  {/* 🔊 Sesli Sohbet Kanalı */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannel('voice');
                      setMobileLeftOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      activeChannel === 'voice'
                        ? 'bg-[#35373c] text-white'
                        : 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-[#80848e] flex-shrink-0" />
                    <span className="truncate">Sesli Sohbet</span>
                  </button>
                </div>

                {/* Bottom User Bar */}
                <div className="w-full p-2 bg-[#232428] border-t border-[#1f2023] flex items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                      <img
                        src={
                          currentUser?.photoURL ||
                          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
                        }
                        alt="Ben"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a55a] rounded-full ring-2 ring-[#232428]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-bold text-xs truncate flex items-center gap-1"
                        style={{ color: userRoleSettings.roleColor || '#f2f3f5' }}
                      >
                        {userRoleSettings.roleIcon && (
                          <span className="text-sm select-none">{userRoleSettings.roleIcon}</span>
                        )}
                        <span className="truncate">{currentUser?.displayName || 'Oyuncu'}</span>
                      </div>
                      <div className="text-[10px] text-[#949ba4] font-semibold truncate">
                        <span>{userRoleSettings.roleName || 'Üye'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleSettingsOpen(true);
                      setMobileLeftOpen(false);
                    }}
                    className="p-1.5 rounded-md text-[#949ba4] hover:text-[#f2f3f5] hover:bg-[#35373c] transition-colors cursor-pointer flex-shrink-0"
                    title="Kullanıcı & Rol Ayarları"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* 2. ORTA PANEL (DISCORD SOHBET ALANI #313338)                 */}
              {/* ------------------------------------------------------------ */}
              <div className="flex-1 bg-[#313338] flex flex-col min-w-0 w-full overflow-hidden relative">
                {/* DISCORD MOBİL ÜST BAR (Header #2b2d31) */}
                <div className="h-12 sm:h-14 px-3 sm:px-4 border-b border-[#202225] flex items-center justify-between bg-[#2b2d31] shadow-sm flex-shrink-0 z-20">
                  {/* Sol: Geri Ok & Hamburger Menü & Kanal İkonu + Adı */}
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoom(null);
                        onClose();
                      }}
                      className="p-1.5 rounded-md text-[#b5bac1] hover:text-[#f2f3f5] hover:bg-[#35373c] transition-colors cursor-pointer flex-shrink-0"
                      title="Anasayfaya Dön"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileLeftOpen(true)}
                      className="p-1.5 rounded-md text-[#b5bac1] hover:text-[#f2f3f5] hover:bg-[#35373c] md:hidden cursor-pointer flex-shrink-0"
                      title="Kanallar ve Odalar"
                    >
                      <Menu className="w-5 h-5 stroke-[2.2]" />
                    </button>

                    <div className="flex items-center gap-1.5 min-w-0 ml-0.5">
                      <Hash className="w-5 h-5 text-[#80848e] flex-shrink-0 stroke-[2.5]" />
                      <h4 className="font-bold text-[#f2f3f5] text-sm sm:text-base truncate tracking-tight lowercase">
                        {activeRoom.roomName.toLowerCase().replace(/\s+/g, '-')}
                      </h4>
                    </div>
                  </div>

                  {/* Sağ: TestRun + Arama ve Üye Listesi */}
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    {isHost && activeTestRunId && (
                      <div className="hidden sm:flex items-center gap-1 rounded-md bg-[#1e1f22] border border-[#3f4147] px-2 py-1 mr-1">
                        <span className="text-[9px] font-black tracking-wider text-[#b5bac1]">
                          TEST RUN
                        </span>
                        <span
                          className={`text-[9px] font-black ${
                            activeTestRunPersisted === true
                              ? 'text-emerald-400'
                              : activeTestRunPersisted === false
                                ? 'text-rose-400'
                                : 'text-amber-300'
                          }`}
                          title={
                            activeTestRunPersisted === true
                              ? 'TestRun kaydı persist edildi'
                              : activeTestRunPersisted === false
                                ? 'TestRun kaydı persist edilemedi'
                                : 'TestRun kayıt sonucu henüz bilinmiyor'
                          }
                        >
                          {activeTestRunPersisted === true
                            ? 'REC'
                            : activeTestRunPersisted === false
                              ? 'NO REC'
                              : 'WAIT'}
                        </span>
                        {activeTestRunPersisted === true && (
                          <button
                            type="button"
                            onClick={() => void handleOpenTestRunReview()}
                            disabled={testRunReviewLoading}
                            className="ml-1 text-[9px] font-bold text-[#8ea1e1] hover:text-white disabled:opacity-50 cursor-pointer"
                            title={activeTestRunId}
                          >
                            {testRunReviewLoading ? 'Açılıyor…' : 'İncele'}
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className="p-1.5 rounded-md text-[#b5bac1] hover:text-[#f2f3f5] hover:bg-[#35373c] transition-colors cursor-pointer"
                      title="Kanalda Ara"
                    >
                      <Search className="w-5 h-5 stroke-[2.2]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileRightOpen(true)}
                      className="p-1.5 rounded-md text-[#b5bac1] hover:text-[#f2f3f5] hover:bg-[#35373c] transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Üye Listesi"
                    >
                      <Users className="w-5 h-5 text-[#b5bac1]" />
                      <span className="text-xs font-bold text-[#23a55a] hidden sm:inline">{participantsList.length}</span>
                    </button>
                  </div>
                </div>

                {/* Content according to active channel */}
                {activeChannel === 'chat' ? (
                  <>
                    {/* DISCORD MESAJ AKIŞ ALANI (#313338) */}
                    <div className="flex-1 overflow-y-auto min-w-0 bg-[#313338] px-3 sm:px-4 py-4 space-y-4">
                      {roomMessages.map((msg) => {
                        const msgOverride = userRoleOverrides[msg.senderUid];
                        const displaySenderName = msgOverride?.customNickname || msg.senderName;
                        const displayRoleColor = msgOverride?.roleColor || msg.roleColor || '#f2f3f5';
                        const displayRoleIcon = msgOverride?.roleIcon !== undefined ? msgOverride.roleIcon : msg.roleIcon;
                        const displayRoleName = msgOverride?.roleName || msg.roleName;

                        return (
                          <div
                            key={msg.id}
                            className="flex items-start gap-3.5 group hover:bg-[#2e3035]/60 -mx-2 px-2 py-1 rounded transition-colors min-w-0"
                          >
                            {/* Sol Yuvarlak Kullanıcı Avatarı (PP) */}
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenUserProfile({
                                  uid: msg.senderUid,
                                  name: displaySenderName,
                                  username: msg.senderUsername,
                                  avatar: msg.senderAvatar,
                                  roleColor: displayRoleColor,
                                  roleIcon: displayRoleIcon,
                                  roleName: displayRoleName,
                                })
                              }
                              className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[#2b2d31] hover:opacity-85 transition-opacity cursor-pointer mt-0.5"
                            >
                              <img src={msg.senderAvatar} alt={displaySenderName} className="w-full h-full object-cover" />
                            </button>

                            {/* Avatarın Sağı: Kullanıcı Adı + Rol İkonu & Zaman & Mesaj Metni */}
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenUserProfile({
                                      uid: msg.senderUid,
                                      name: displaySenderName,
                                      username: msg.senderUsername,
                                      avatar: msg.senderAvatar,
                                      roleColor: displayRoleColor,
                                      roleIcon: displayRoleIcon,
                                      roleName: displayRoleName,
                                    })
                                  }
                                  className="font-semibold text-sm hover:underline cursor-pointer tracking-tight flex items-center gap-1.5"
                                  style={{ color: displayRoleColor }}
                                >
                                  {displayRoleIcon && (
                                    <span className="text-sm select-none inline-flex items-center" title={displayRoleName}>
                                      {displayRoleIcon}
                                    </span>
                                  )}
                                  <span>{displaySenderName}</span>
                                  {mutedUsersData[msg.senderUid]?.isMuted && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold"
                                      title={mutedUsersData[msg.senderUid]?.duration ? `${mutedUsersData[msg.senderUid]?.duration} Sessize Alındı` : 'Sessize Alındı'}
                                    >
                                      <MicOff className="w-2.5 h-2.5" />
                                      <span>{mutedUsersData[msg.senderUid]?.duration || 'Sessiz'}</span>
                                    </span>
                                  )}
                                  {msg.senderUid === 'bot-zipo' && (
                                    <span className="text-[10px] bg-[#5865f2] text-white px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                      BOT
                                    </span>
                                  )}
                                </button>
                                <span className="text-[11px] text-[#949ba4] font-normal">
                                  {formatRoomMessageTimestamp(msg)}
                                </span>
                              </div>
                              <p className="text-sm text-[#dbdee1] leading-relaxed break-words font-normal mt-0.5 whitespace-pre-wrap selection:bg-[#5865f2]/40">
                                {msg.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* DISCORD MOBİL MESAJ INPUT KUTUSU (#383a40) */}
                    <div className="px-3 sm:px-4 pb-4 pt-1 bg-[#313338] flex-shrink-0">
                      <form
                        onSubmit={handleSendRoomMessage}
                        className="bg-[#383a40] rounded-xl px-2.5 sm:px-3 py-2 flex items-center gap-2.5 border border-transparent focus-within:border-[#4e5058] transition-colors"
                        data-build="beta-v36"
                      >
                        {/* Sol '+' Butonu */}
                        <button
                          type="button"
                          className="w-7 h-7 rounded-full bg-[#4e5058]/60 hover:bg-[#4e5058] text-[#b5bac1] hover:text-[#f2f3f5] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                          title="Dosya veya Medya Ekle"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        {/* Input Metin Alanı */}
                        <input
                          type="text"
                          value={roomInputMessage}
                          onChange={(e) => setRoomInputMessage(e.target.value)}
                          placeholder={`#${activeRoom.roomName.toLowerCase().replace(/\s+/g, '-')} kanalına mesaj gönder`}
                          className="flex-1 bg-transparent text-[#f2f3f5] text-sm placeholder-[#80848e] outline-none min-w-0"
                        />

                        {/* Sağ Emojiler / Gönder Butonu */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            className="p-1 text-[#b5bac1] hover:text-[#f2f3f5] transition-colors cursor-pointer hidden sm:block"
                            title="Hediye"
                          >
                            <Gift className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-[#b5bac1] hover:text-[#f2f3f5] transition-colors cursor-pointer"
                            title="Emoji"
                          >
                            <Smile className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void sendCurrentRoomMessage()}
                            disabled={!roomInputMessage.trim()}
                            className="p-1.5 rounded-lg text-[#5865f2] hover:text-white hover:bg-[#5865f2] disabled:text-[#4e5058] disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                            aria-label="Gönder"
                            title="Gönder • beta-v36"
                          >
                            <Send className="w-4 h-4 stroke-[2.2]" />
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
                ) : (
                  /* Voice Channel Placeholder */
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#313338]">
                    <div className="w-16 h-16 rounded-full bg-[#5865f2]/20 text-[#5865f2] flex items-center justify-center">
                      <Volume2 className="w-8 h-8 animate-pulse" />
                    </div>
                    <h3 className="text-base font-extrabold text-white">Sesli Sohbet Odası</h3>
                    <p className="text-xs text-[#949ba4] max-w-xs">
                      Sesli sohbet kanalı aktif. Odadaki üyelerle doğrudan sesli etkileşime geçebilirsiniz.
                    </p>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------ */}
              {/* 3. SAĞ PANEL (ÜYE LİSTESİ) — Fixed 220px Desktop / Drawer Mobile */}
              {/* ------------------------------------------------------------ */}
              <div
                className={`
                  fixed md:relative inset-y-0 right-0 z-40 md:z-auto
                  w-[220px] bg-[#2b2d31] border-l border-[#1f2023]
                  flex flex-col flex-shrink-0 select-none transition-transform duration-200 ease-in-out
                  ${mobileRightOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full md:translate-x-0'}
                `}
              >
                {/* Header */}
                <div className="h-12 px-3 border-b border-[#1f2023] flex items-center justify-between bg-[#2b2d31] shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Users className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider truncate">
                      Üyeler — {participantsList.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileRightOpen(false)}
                    className="p-1 rounded-md text-[#949ba4] hover:text-white md:hidden cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Host Subtabs */}
                {isHost && (
                  <div className="flex border-b border-[#1f2023] bg-[#1e1f22] p-1 gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('members')}
                      className={`flex-1 py-1 text-[10px] font-extrabold rounded transition-all ${
                        rightPanelTab === 'members' ? 'bg-[#5865f2] text-white' : 'text-[#949ba4] hover:text-white'
                      }`}
                    >
                      Üyeler
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('requests')}
                      className={`flex-1 py-1 text-[10px] font-extrabold rounded transition-all ${
                        rightPanelTab === 'requests' ? 'bg-amber-500 text-slate-950' : 'text-[#949ba4] hover:text-white'
                      }`}
                    >
                      İstek ({pendingRequests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('invite')}
                      className={`flex-1 py-1 text-[10px] font-extrabold rounded transition-all ${
                        rightPanelTab === 'invite' ? 'bg-[#23a55a] text-white' : 'text-[#949ba4] hover:text-white'
                      }`}
                    >
                      Davet
                    </button>
                  </div>
                )}

                {/* Right Panel Body */}
                <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                  {rightPanelTab === 'members' && (
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-[#949ba4] uppercase tracking-wider">
                        ÇEVRİMİÇİ — {participantsList.length}
                      </div>

                      {canManageKaira &&
                        !participantsList.some(
                          (participant) =>
                            participant.uid === 'droit_kaira_22261aadeb3a5d02eed3',
                        ) && (
                          <div className="mx-1 mb-2 rounded-lg border border-[#3f4147] bg-[#232428] p-2.5">
                            <div className="flex items-center gap-2">
                              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#1e1f22] opacity-80">
                                <img
                                  src="https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Kaira&backgroundColor=5865f2"
                                  alt="Kaira"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#dbdee1]">Kaira</div>
                                <div className="text-[10px] text-[#949ba4]">
                                  Sunucunu yönetmene yardım etsin
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleInviteKaira()}
                              disabled={kairaInviteLoading}
                              className="mt-2 w-full rounded-md bg-[#5865f2] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#4752c4] disabled:cursor-wait disabled:opacity-60"
                            >
                              {kairaInviteLoading ? 'Kaira çağrılıyor…' : "Kaira'yı çağır"}
                            </button>
                            {kairaInviteError && (
                              <div className="mt-1.5 text-[10px] leading-snug text-[#f23f42]">
                                {kairaInviteError}
                              </div>
                            )}
                          </div>
                        )}

                      {participantsList.map((p) => (
                        <button
                          key={p.uid}
                          type="button"
                          onClick={() => {
                            handleOpenUserProfile({
                              uid: p.uid,
                              name: p.displayName || p.username,
                              username: p.username,
                              avatar: p.avatarUrl,
                              roleColor: p.roleColor,
                              roleIcon: p.roleIcon,
                              roleName: p.roleName,
                            });
                            setMobileRightOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#35373c] flex items-center gap-2 transition-colors group cursor-pointer"
                        >
                          <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#1e1f22]">
                            <img
                              src={p.avatarUrl}
                              alt={p.displayName || p.username}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#23a55a] rounded-full ring-2 ring-[#2b2d31]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span
                                className="font-semibold text-xs truncate group-hover:opacity-95 transition-opacity flex items-center gap-1"
                                style={{ color: p.roleColor || (p.isHost ? '#ff4757' : '#dbdee1') }}
                              >
                                {p.roleIcon && <span className="select-none">{p.roleIcon}</span>}
                                <span>{p.displayName || p.username}</span>
                              </span>
                              {p.isHost && !p.roleIcon && (
                                <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" title="Kurucu" />
                              )}
                              {mutedUsersData[p.uid]?.isMuted && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-amber-400 text-[10px]"
                                  title={mutedUsersData[p.uid]?.duration ? `${mutedUsersData[p.uid]?.duration} Sessize Alındı` : 'Sessize Alındı'}
                                >
                                  <MicOff className="w-3 h-3 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                            {p.roleName && (
                              <div className="text-[10px] text-[#949ba4] truncate">
                                {p.roleName}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Join Requests */}
                  {rightPanelTab === 'requests' && isHost && (
                    <div className="space-y-2">
                      {pendingRequests.length === 0 ? (
                        <p className="text-xs text-[#949ba4] text-center py-4">Bekleyen istek yok.</p>
                      ) : (
                        pendingRequests.map((req) => (
                          <div key={req.uid} className="p-2 rounded-lg bg-[#1e1f22] border border-[#383a40] space-y-1.5">
                            <div className="flex items-center gap-2">
                              <img src={req.avatarUrl} alt={req.displayName} className="w-6 h-6 rounded-full object-cover" />
                              <span className="text-xs font-bold text-white truncate">{req.displayName || req.username}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={actionLoadingId === req.uid}
                                onClick={() => handleRespondToRequest(req.uid, true)}
                                className="flex-1 py-1 rounded bg-[#23a55a] text-white text-[10px] font-bold hover:bg-emerald-600 cursor-pointer"
                              >
                                Kabul
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === req.uid}
                                onClick={() => handleRespondToRequest(req.uid, false)}
                                className="flex-1 py-1 rounded bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 cursor-pointer"
                              >
                                Reddet
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Invite Users */}
                  {rightPanelTab === 'invite' && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#949ba4] absolute left-2.5 top-2" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Oyuncu ara..."
                          className="w-full bg-[#1e1f22] border border-[#383a40] text-white text-xs pl-8 pr-2 py-1.5 rounded-md outline-none focus:border-[#5865f2]"
                        />
                      </div>
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {searchingUsers ? (
                          <div className="text-center py-3 text-xs text-[#949ba4]">Aranıyor...</div>
                        ) : searchResults.length === 0 ? (
                          <div className="text-center py-3 text-xs text-[#949ba4]">Oyuncu bulunamadı.</div>
                        ) : (
                          searchResults.map((u) => (
                            <div key={u.uid} className="flex items-center justify-between p-1.5 bg-[#1e1f22] rounded-md text-xs">
                              <span className="text-white truncate font-bold text-[11px]">{u.displayName}</span>
                              <button
                                type="button"
                                disabled={actionLoadingId === u.uid || invitedUserIds.has(u.uid)}
                                onClick={() => handleSendInvite(u)}
                                className="px-2 py-0.5 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                {invitedUserIds.has(u.uid) ? 'Davet Edildi' : 'Davet Et'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        )}
        <AnimatePresence>
          {(testRunReview || testRunReviewError) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4"
              onClick={() => {
                setTestRunReview(null);
                setTestRunReviewError(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.97, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[82vh] overflow-hidden rounded-2xl border border-[#3f4147] bg-[#1e1f22] shadow-2xl flex flex-col"
              >
                <div className="px-4 py-3 border-b border-[#35373c] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">Kaira TestRun İncelemesi</div>
                    <div className="text-[10px] text-[#949ba4] truncate">
                      {testRunReview?.testRunId || activeTestRunId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTestRunReview(null);
                      setTestRunReviewError(null);
                    }}
                    className="p-1.5 rounded-md text-[#b5bac1] hover:text-white hover:bg-[#35373c] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {testRunReviewError ? (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                      {testRunReviewError}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-xl bg-[#2b2d31] p-3">
                          <div className="text-[9px] uppercase text-[#949ba4] font-bold">Turn</div>
                          <div className="text-lg text-white font-black">{testRunReview?.turnCount ?? 0}</div>
                        </div>
                        <div className="rounded-xl bg-[#2b2d31] p-3 col-span-1 sm:col-span-3 min-w-0">
                          <div className="text-[9px] uppercase text-[#949ba4] font-bold">Provenance</div>
                          <div className="text-[10px] text-[#dbdee1] break-all mt-1">
                            Kaira: {testRunReview?.provenance?.provenance?.versions?.kairaCommit || '—'}
                          </div>
                          <div className="text-[10px] text-[#dbdee1] break-all">
                            PrivatRoom: {testRunReview?.provenance?.provenance?.versions?.privatRoomCommit || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(testRunReview?.turns || []).map((turn: any) => (
                          <div
                            key={turn.turnId}
                            className="rounded-xl border border-[#35373c] bg-[#2b2d31] p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black text-[#8ea1e1]">
                                TURN {turn.turnNumber}
                              </span>
                              <span className="text-[9px] text-[#949ba4]">
                                {turn.intent || '—'} • {turn.detectedEmotion || '—'}
                              </span>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase text-[#949ba4] font-bold">Kullanıcı</div>
                              <div className="text-xs text-white whitespace-pre-wrap">{turn.userMessage}</div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase text-[#949ba4] font-bold">Kairo</div>
                              <div className="text-xs text-[#dbdee1] whitespace-pre-wrap">{turn.assistantReply}</div>
                            </div>
                            <div className="text-[9px] text-[#949ba4]">
                              Provider: {turn.providerUsed || '—'}
                              {turn.timings?.totalMs ? ` • ${turn.timings.totalMs}ms` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Role & Color Settings Modal */}
        <RoleSettingsModal
          isOpen={isRoleSettingsOpen}
          onClose={() => setIsRoleSettingsOpen(false)}
          currentSettings={userRoleSettings}
          userName={currentUser?.displayName || 'Oyuncu'}
          userAvatar={
            currentUser?.photoURL ||
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
          }
          currentUserRole={userRoleSettings.roleId || (isHost ? 'owner' : 'member')}
          participants={participantsList}
          onSave={handleSaveRoleSettings}
        />

        {/* Full-Screen Mobile Discord Server Settings Modal */}
        <DiscordServerSettingsModal
          isOpen={isServerSettingsOpen}
          onClose={() => setIsServerSettingsOpen(false)}
          serverData={{
            id: activeRoom?.roomId || 'room-server',
            name: activeRoom?.roomName || 'Özel Topluluk Sunucusu',
            icon:
              activeRoom?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
            banner:
              activeRoom?.coverUrl ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000',
            discoveryCard:
              (activeRoom as any)?.discoveryCardUrl ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
            description:
              activeRoom?.description ||
              'Kelime Oyunu ve Strateji Topluluğu resmi Discord sunucusu.',
            systemChannel: 'genel-sohbet',
            defaultNotification: 'mentions',
            verificationLevel: 'medium',
          }}
          onUpdateServer={(updated) => {
            if (activeRoom) {
              setActiveRoom((prev) =>
                prev
                  ? {
                      ...prev,
                      roomName: updated.name || prev.roomName,
                      description: updated.description || prev.description,
                      avatarUrl: updated.icon || prev.avatarUrl,
                      coverUrl: updated.banner || prev.coverUrl,
                      discoveryCardUrl: updated.discoveryCard || (prev as any).discoveryCardUrl,
                    }
                  : null
              );
            }
          }}
          onDeleteServer={() => {
            handleLeaveRoom();
          }}
        />

        {/* Discord Style User Profile & Role Assignment Popover */}
        <DiscordUserProfileModal
          isOpen={!!selectedProfileUser}
          onClose={() => setSelectedProfileUser(null)}
          user={selectedProfileUser}
          currentUserUid={currentUser?.uid}
          currentUserRole={
            isHost
              ? 'owner'
              : (currentUser && userRoleOverrides[currentUser.uid]?.roleId) ||
                userRoleSettings.roleId ||
                'member'
          }
          canManageRoles={
            isHost ||
            (currentUser && userRoleOverrides[currentUser.uid]?.roleId === 'owner') ||
            (currentUser && userRoleOverrides[currentUser.uid]?.roleId === 'admin') ||
            userRoleSettings.roleId === 'owner' ||
            userRoleSettings.roleId === 'admin' ||
            Boolean(userRoleSettings.isAdmin) ||
            (userRoleSettings.roleName && (
              userRoleSettings.roleName.toLowerCase().includes('owner') ||
              userRoleSettings.roleName.toLowerCase().includes('admin') ||
              userRoleSettings.roleName.toLowerCase().includes('sahip') ||
              userRoleSettings.roleName.toLowerCase().includes('yönetici') ||
              userRoleSettings.roleName.toLowerCase().includes('kral')
            ))
          }
          onAssignRole={handleAssignRoleToUser}
          onUpdateServerProfile={handleUpdateServerProfile}
          onOpenAdvancedSettings={() => setIsRoleSettingsOpen(true)}
          onMentionUser={handleMentionUser}
          onSendDirectMessage={(target, text) => {
            handleSendTextMessage(`@${target.username || target.name} ${text}`);
          }}
          onMuteUser={handleMuteUser}
          onKickUser={handleKickUser}
          onBanUser={handleBanUser}
        />
      </div>
    </AnimatePresence>
  );
};
