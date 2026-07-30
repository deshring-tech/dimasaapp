import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMatches } from "../api";
import { useAuth } from "../context/AuthContext";
import { modeWords } from "../lib/mode";
import InviteButton from "../components/InviteButton";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const words = modeWords(user);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatches()
      .then((res) => setMatches(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        </div>
        <div className="space-y-3 px-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
              <div className="w-14 h-14 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        <p className="text-sm text-gray-400 mt-1">
          {matches.length} {matches.length === 1 ? words.matchOne : words.matchMany}
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 px-8">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-gray-700">{words.chatInboxEmpty}</h3>
          <p className="text-sm text-gray-400 mt-2 mb-6">{words.chatInboxEmptyBody}</p>
          <button
            onClick={() => navigate("/matches")}
            className="btn-primary"
          >
            {words.community ? "Find Community →" : "Start Discovering →"}
          </button>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">Or grow the community:</p>
            <InviteButton variant="ghost" />
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {matches.map((m) => (
            <button
              key={m.matchId}
              onClick={() => navigate(`/chat/${m.matchId}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden border-2 border-white shadow">
                  {m.user.photoUrl ? (
                    <img src={m.user.photoUrl} alt={m.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                {m.unread && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 truncate">{m.user.name}</p>
                  {m.lastMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {timeAgo(m.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-sm truncate ${m.unread ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                    {m.lastMessage
                      ? (m.lastMessage.senderId === user?.id ? "You: " : "") + m.lastMessage.content
                      : words.community
                        ? "🤝 New connection! Say hello"
                        : "✨ New match! Say hello"}
                  </p>
                  {m.unread && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2" />
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-0.5">📍 {m.user.location}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
