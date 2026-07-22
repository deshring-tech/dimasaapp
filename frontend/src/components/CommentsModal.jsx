import { useState, useEffect, useRef } from "react";
import { getComments, addComment, deleteComment } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import timeAgo from "../lib/timeAgo";

// Bottom-sheet modal that shows a post's comments and lets you add one.
export default function CommentsModal({ post, onClose, onCommentCountChange }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!post) return;
    getComments(post.id)
      .then((r) => setComments(r.data))
      .finally(() => setLoading(false));
  }, [post?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await addComment(post.id, text.trim());
      setComments((prev) => [...prev, res.data]);
      onCommentCountChange?.(comments.length + 1);
      setText("");
    } catch (e) {
      toast({ icon: "⚠️", title: e.response?.data?.error || "Failed", tone: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (comment) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteComment(post.id, comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      onCommentCountChange?.(comments.length - 1);
    } catch {
      toast({ icon: "⚠️", title: "Couldn't delete", tone: "error" });
    }
  };

  if (!post) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-0 sm:px-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl shadow-xl flex flex-col animate-slide-up max-h-[85vh]">
        {/* Handle */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading && (
            <p className="text-center text-gray-400 text-sm py-4">Loading...</p>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">
              No comments yet. Be the first!
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.author?.photoUrl
                  ? <img src={c.author.photoUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm">👤</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-100 rounded-2xl rounded-tl-md px-3 py-2 inline-block max-w-full">
                  <p className="text-xs font-semibold text-gray-800">{c.author?.name}</p>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-1 px-1">
                  <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                  {c.author?.id === user?.id && (
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-[10px] text-gray-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div className="border-t border-gray-100 p-3 flex items-end gap-2">
          <input
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
