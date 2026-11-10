
import React, { useState, useEffect } from 'react';
import { Post, UserProfile } from '../../types';
import { subscribeFeedPosts } from '../../services/postService';
import { getRecommendedUsers } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { PostCard } from '../posts/PostCard';
import { Plus, Sparkles } from 'lucide-react';

interface HomeFeedProps {
  onOpenCreatePost: () => void;
  onOpenComments: (post: Post) => void;
  onOpenShare: (post: Post) => void;
  onOpenReport: (post: Post) => void;
  onSelectUser: (userId: string) => void;
  onNavigateExplore: () => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  onOpenCreatePost,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  onSelectUser,
  onNavigateExplore,
}) => {
  const { currentUser, userProfile, privateInfo } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeFeedPosts((fetchedPosts) => {
      const blockedIds = privateInfo?.blockedUserIds || [];

      const visible = fetchedPosts.filter(
        (post) => !blockedIds.includes(post.authorId)
      );

      setPosts(visible);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [privateInfo?.blockedUserIds]);

  useEffect(() => {
    if (currentUser) {
      getRecommendedUsers(currentUser.uid, 8)
        .then(setRecommendedUsers)
        .catch((error) => {
          console.error('Recommended users error:', error);
        });
    }
  }, [currentUser?.uid]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">

      {/* Stories / Creator Circle */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-3 sm:p-4 shadow-sm overflow-hidden">

        <div className="flex items-center gap-3.5 overflow-x-auto scrollbar-none py-1">

          {/* Create Story */}
          <div
            onClick={onOpenCreatePost}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
          >
            <div className="relative w-14 h-14 rounded-full p-0.5 border-2 border-dashed border-violet-500 group-hover:border-solid transition">

              <img
                src={
                  userProfile?.photoURL ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid}`
                }
                alt="My profile"
                className="w-full h-full rounded-full object-cover"
              />

              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-violet-600 to-rose-500 text-white flex items-center justify-center shadow-md">
                <Plus className="w-3.5 h-3.5 stroke-[3px]" />
              </div>

            </div>

            <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
              Your Story
            </span>
          </div>

          {/* Recommended Users */}
          {recommendedUsers.map((user) => (
            <div
              key={user.uid}
              onClick={() => onSelectUser(user.uid)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
            >
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 group-hover:scale-105 transition transform shadow-sm">

                <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 p-0.5">

                  <img
                    src={
                      user.photoURL ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
                    }
                    alt={user.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />

                </div>
              </div>

              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[60px]">
                {user.displayName.split(' ')[0]}
              </span>
            </div>
          ))}

        </div>
      </div>

      {/* Posts Feed */}
      {loading ? (

        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />

          <p className="text-xs text-zinc-400 font-medium">
            Loading POPO Feed...
          </p>
        </div>

      ) : posts.length === 0 ? (

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">

          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-500/10 to-rose-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-['Plus_Jakarta_Sans']">
              Welcome to your POPO Feed!
            </h3>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Share your moments with photos or upload high-definition videos up to 1GB.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">

            <button
              onClick={onOpenCreatePost}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-700 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-violet-500/25 transition"
            >
              Create First Post
            </button>

            <button
              onClick={onNavigateExplore}
              className="px-5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition"
            >
              Explore Trending
            </button>

          </div>
        </div>

      ) : (

        <div className="space-y-6">

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpenComments={onOpenComments}
              onOpenShare={onOpenShare}
              onOpenReport={onOpenReport}
              onSelectUser={onSelectUser}
              onPostDeleted={handlePostDeleted}
            />
          ))}

        </div>

      )}

    </div>
  );
};
