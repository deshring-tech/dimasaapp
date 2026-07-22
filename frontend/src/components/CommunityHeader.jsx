import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getRecentJoined } from "../api";
import TierBadge from "./TierBadge";

// Stats banner + horizontal strip of recently-joined profiles.
// Shown above the main Discover card stack to give a sense of activity.
export default function CommunityHeader({ isCommunity }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats().then((r) => r.data).catch(() => null),
      getRecentJoined().then((r) => r.data).catch(() => []),
    ]).then(([s, r]) => {
      setStats(s);
      setRecent(r || []);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <div className="px-4 pt-3 pb-2 space-y-3">
      {/* Stats strip */}
      {stats && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <StatChip icon="🤝" value={stats.members} label="members" />
          <StatChip icon="📍" value={stats.places} label="places" />
          {stats.joinedThisWeek > 0 && (
            <StatChip
              icon="✨"
              value={`+${stats.joinedThisWeek}`}
              label="this week"
              accent
            />
          )}
          {!isCommunity && stats.matches > 0 && (
            <StatChip icon="💞" value={stats.matches} label="matches" />
          )}
        </div>
      )}

      {/* Recently joined avatars */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recently joined
            </p>
            <button
              onClick={() => navigate("/search")}
              className="text-xs text-primary font-medium"
            >
              Search all →
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {recent.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate("/search")}
                className="flex-shrink-0 w-16 text-center"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden border-2 border-white shadow mx-auto">
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">
                        {p.gender === "female" ? "👩" : p.gender === "male" ? "👨" : "🧑"}
                      </span>
                    )}
                  </div>
                  {p.tier && p.tier !== "free" && (
                    <div className="absolute -bottom-1 -right-1">
                      <TierBadge tier={p.tier} size="xs" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 truncate mt-1">
                  {p.name?.split(" ")[0]}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ icon, value, label, accent }) {
  return (
    <div
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        ${accent
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-gray-100 text-gray-700"}`}
    >
      <span>{icon}</span>
      <span className="font-bold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}
