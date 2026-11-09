import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { TopBar } from './components/navigation/TopBar';
import { HomeFeed } from './components/feed/HomeFeed';
import { SearchView } from './components/search/SearchView';
import { ChatView } from './components/chat/ChatView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ProfileView } from './components/profile/ProfileView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LandingView } from './components/auth/LandingView';
import { AuthModal } from './components/auth/AuthModal';
import { CreatePostModal } from './components/posts/CreatePostModal';
import { CommentsModal } from './components/posts/CommentsModal';
import { ShareModal } from './components/posts/ShareModal';
import { ReportModal } from './components/posts/ReportModal';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { PostDetailModal } from './components/posts/PostDetailModal';
import { Post, UserProfile } from './types';
import { subscribeUserConversations } from './services/chatService';
import { subscribeUserNotifications } from './services/notificationService';

function MainApp() {
  const { currentUser, loading } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chatTargetUser, setChatTargetUser] = useState<UserProfile | null>(null);

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'phone'>('login');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const [activeCommentsPost, setActiveCommentsPost] = useState<Post | null>(null);
  const [activeSharePost, setActiveSharePost] = useState<Post | null>(null);
  const [activeReportPost, setActiveReportPost] = useState<Post | null>(null);
  const [activeReportUser, setActiveReportUser] = useState<UserProfile | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postIdParam = params.get('post');
    if (postIdParam) setDetailPostId(postIdParam);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    const unsubChats = subscribeUserConversations(currentUser.uid, (conversations) => {
      let totalUnread = 0;
      conversations.forEach((c) => {
        if (c.unread && c.unread[currentUser.uid]) {
          totalUnread += c.unread[currentUser.uid];
        }
      });
      setUnreadMessages(totalUnread);
    });

    const unsubNotifs = subscribeUserNotifications(currentUser.uid, (notifications) => {
      setUnreadNotifications(notifications.filter((n) => !n.isRead).length);
    });

    return () => {
      unsubChats();
      unsubNotifs();
    };
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-rose-500 flex items-center justify-center text-white font-black text-2xl shadow-xl animate-pulse">
          P
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-zinc-400">
          Loading POPO
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LandingView
          onOpenAuth={(mode) => {
            setAuthModalMode(mode || 'login');
            setIsAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultMode={authModalMode}
        />
      </>
    );
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartChatWithUser = (target: UserProfile) => {
    setChatTargetUser(target);
    setCurrentTab('messages');
  };

  const handleOpenPostById = (postId: string) => {
    setDetailPostId(postId);
  };

  const handleOpenShareToChat = (post: Post) => {
    setCurrentTab('messages');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row antialiased">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'profile') setSelectedUserId(currentUser.uid);
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        unreadMessagesCount={unreadMessages}
        unreadNotificationsCount={unreadNotifications}
      />

      <div className="flex-1 flex flex-col min-h-screen pb-20 md:pb-6 overflow-x-hidden">
        <TopBar
          onSelectTab={(tab) => {
            if (tab === 'profile') setSelectedUserId(currentUser.uid);
            setCurrentTab(tab);
          }}
          unreadNotificationsCount={unreadNotifications}
        />

        <main className="flex-1 w-full">
          {currentTab === 'home' && (
            <HomeFeed
              onOpenCreatePost={() => setIsCreateModalOpen(true)}
              onOpenComments={setActiveCommentsPost}
              onOpenShare={setActiveSharePost}
              onOpenReport={(post) => {
                setActiveReportPost(post);
                setActiveReportUser(null);
              }}
              onSelectUser={handleSelectUser}
              onNavigateExplore={() => setCurrentTab('explore')}
            />
          )}

          {(currentTab === 'search' || currentTab === 'explore') && (
            <SearchView
              onSelectUser={handleSelectUser}
              onOpenPost={setDetailPost}
            />
          )}

          {currentTab === 'messages' && (
            <ChatView
              initialTargetUser={chatTargetUser}
              onSelectUser={handleSelectUser}
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationsView
              onSelectUser={handleSelectUser}
              onOpenPostById={handleOpenPostById}
              onOpenChat={() => setCurrentTab('messages')}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              userId={selectedUserId || currentUser.uid}
              onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
              onStartChat={handleStartChatWithUser}
              onOpenPost={setDetailPost}
              onOpenReport={(user) => {
                setActiveReportUser(user);
                setActiveReportPost(null);
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
            />
          )}

          {currentTab === 'admin' && (
            <AdminDashboard
              onSelectUser={handleSelectUser}
              onOpenPost={setDetailPost}
            />
          )}
        </main>
      </div>

      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'profile') setSelectedUserId(currentUser.uid);
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        unreadMessagesCount={unreadMessages}
      />

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={() => {
          setCurrentTab('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
      />

      <CommentsModal
        post={activeCommentsPost}
        isOpen={!!activeCommentsPost}
        onClose={() => setActiveCommentsPost(null)}
        onSelectUser={(uid) => {
          setActiveCommentsPost(null);
          handleSelectUser(uid);
        }}
      />

      <ShareModal
        post={activeSharePost}
        isOpen={!!activeSharePost}
        onClose={() => setActiveSharePost(null)}
        onSendToChat={handleOpenShareToChat}
      />

      <ReportModal
        post={activeReportPost}
        targetUser={activeReportUser}
        isOpen={!!activeReportPost || !!activeReportUser}
        onClose={() => {
          setActiveReportPost(null);
          setActiveReportUser(null);
        }}
      />

      <PostDetailModal
        post={detailPost}
        postId={detailPostId}
        isOpen={!!detailPost || !!detailPostId}
        onClose={() => {
          setDetailPost(null);
          setDetailPostId(null);
        }}
        onOpenComments={(post) => {
          setDetailPost(null);
          setDetailPostId(null);
          setActiveCommentsPost(post);
        }}
        onOpenShare={setActiveSharePost}
        onOpenReport={setActiveReportPost}
        onSelectUser={(uid) => {
          setDetailPost(null);
          setDetailPostId(null);
          handleSelectUser(uid);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
