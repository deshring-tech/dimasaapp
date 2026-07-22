import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reactToPost, deletePost } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import TierBadge from "./TierBadge";
import timeAgo from "../lib/timeAgo";

export default function PostCard({ post, onOpenComments, onDeleted }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Optimistic local state so the UI reacts instantly
  const [reacted, setReacted] = useState(post.reactedByMe);
  const [reactionCount, setReactionCount] = useState(post.reactions);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwn = post.author?.id === user?.id;

  const handleReact = async () => {
    // Optimistic toggle
    const newReacted = !reacted;
    setReacted(newReacted);
    setReactionCount((c) => c + (newReacted ? 1 : -1));
    try {
      const res = await reactToPost(post.id);
      setReacted(res.data.reacted);
      setReactionCount(res.data.count);
    } catch {
      // Roll back
      setReacted(!newReacted);
      setReactionCount((c) => c + (newReacted ? -1 : 1));
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm("Delete this post?")) return;
    try {
      await deletePost(post.id);
      toast({ icon: "🗑️", title: "Post deleted", tone: "info" });
      onDeleted?.(post.id);
    } catch {
      toast({ icon: "⚠️", title: "Could not delete", tone: "error" });
    }
  };

  return (
    <article className="bg-white border-b border-gray-100 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden flex-shrink-0">
          {post.author?.photoUrl
            ? <img src={post.author.photoUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg">👤</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-800 text-sm truncate">{post.author?.name}</p>
            <TierBadge tier={post.author?.tier} size="xs" />
          </div>
          <p className="text-[11px] text-gray-400">
            {timeAgo(post.createdAt)}
            {post.place && (
              <>
                {" · "}
                <button
                  onClick={() => navigate(`/business/${post.place.id}`)}
                  className="text-primary font-medium"
                >
                  🏪 {post.place.name}
                </button>
              </>
            )}
          </p>
        </div>

        {isOwn && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Post options"
              className="text-gray-400 text-xl px-2"
            >
              ⋯
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[140px]">
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    🗑️ Delete post
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 mt-2 text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
          {post.content}
        </p>
      )}

      {/* Image */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          className="w-full max-h-96 object-cover mt-3"
          loading="lazy"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 mt-3">
        <button
          onClick={handleReact}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition
            ${reacted
              ? "text-primary bg-rose-50"
              : "text-gray-500 hover:bg-gray-50"}`}
        >
          <span className="text-lg">{reacted ? "❤️" : "🤍"}</span>
          <span>{reactionCount > 0 ? reactionCount : "Heart"}</span>
        </button>
        <button
          onClick={() => onOpenComments(post)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          <span className="text-base">💬</span>
          <span>{post.comments > 0 ? post.comments : "Comment"}</span>
        </button>
      </div>
    </article>
  );
}
