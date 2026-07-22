import { useState, useEffect, useCallback } from "react";
import { getFeed } from "../api";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import ComposePost from "../components/ComposePost";
import CommentsModal from "../components/CommentsModal";
import InviteButton from "../components/InviteButton";

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composing, setComposing] = useState(false);
  const [commentsForPost, setCommentsForPost] = useState(null);

  const loadFeed = useCallback(async (nextCursor = null, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await getFeed(nextCursor);
      const newPosts = res.data.posts || [];
      setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
      setCursor(res.data.nextCursor);
      setHasMore(!!res.data.nextCursor);
    } catch (e) {
      console.error("Feed load failed", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleNewPost = (post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handleDeleted = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCommentCountChange = (postId, newCount) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: newCount } : p)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dimasa</h1>
            <p className="text-xs text-gray-400">Community feed</p>
          </div>
          <button
            onClick={() => loadFeed()}
            aria-label="Refresh"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-base"
          >
            {loading ? "⏳" : "🔄"}
          </button>
        </div>
      </div>

      {/* Compose bar */}
      <button
        onClick={() => setComposing(true)}
        className="w-full bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden flex-shrink-0">
          {user?.photoUrl
            ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
            : <span>👤</span>
          }
        </div>
        <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-500">
          What's on your mind, {user?.name?.split(" ")[0] || "friend"}?
        </div>
        <span className="text-primary text-lg">✏️</span>
      </button>

      {/* Feed */}
      <div>
        {loading && posts.length === 0 ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border-b border-gray-100 p-4 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="h-2 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-700">Nothing here yet</h3>
            <p className="text-sm text-gray-400 mt-2 mb-6">
              Be the first to share something with the Dimasa community.
            </p>
            <button
              onClick={() => setComposing(true)}
              className="btn-primary"
            >
              ✏️ Write the first post
            </button>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3">Or invite more Dimasa people:</p>
              <InviteButton variant="ghost" size="sm" />
            </div>
          </div>
        ) : (
          <>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onOpenComments={(post) => setCommentsForPost(post)}
                onDeleted={handleDeleted}
              />
            ))}

            {/* Load-more */}
            {hasMore ? (
              <div className="text-center py-6">
                <button
                  onClick={() => loadFeed(cursor, true)}
                  disabled={loadingMore}
                  className="text-sm text-primary font-semibold px-5 py-2 rounded-xl border-2 border-rose-100 disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            ) : (
              <div className="text-center py-8 px-6">
                <p className="text-xs text-gray-400">✨ You're all caught up!</p>
                <div className="mt-4">
                  <InviteButton variant="ghost" size="sm" label="Invite friends" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Compose modal */}
      <ComposePost
        open={composing}
        onClose={() => setComposing(false)}
        onCreated={handleNewPost}
      />

      {/* Comments modal */}
      {commentsForPost && (
        <CommentsModal
          post={commentsForPost}
          onClose={() => setCommentsForPost(null)}
          onCommentCountChange={(count) => handleCommentCountChange(commentsForPost.id, count)}
        />
      )}
    </div>
  );
}
