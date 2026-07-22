import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { discoverProfiles, expressInterest } from "../api";
import { useAuth } from "../context/AuthContext";
import TierBadge from "../components/TierBadge";
import InviteButton from "../components/InviteButton";
import CommunityHeader from "../components/CommunityHeader";
import ModeSwitcher from "../components/ModeSwitcher";
import CommunityGrid from "../components/CommunityGrid";

const intentLabel = {
  dating: "💫 Dating",
  serious: "💍 Serious",
  friends: "🤝 Connect",
};

function ProfileCard({ profile, onInterested, onPass, loading, isCommunity }) {
  return (
    <div className="relative bg-white rounded-3xl shadow-lg overflow-hidden mx-2">
      {/* Photo */}
      <div className="relative h-80 bg-gradient-to-br from-rose-100 to-pink-200">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-8xl">
              {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "🧑"}
            </span>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Tier badge — top-right corner */}
        {profile.tier && profile.tier !== "free" && (
          <div className="absolute top-3 right-3">
            <TierBadge tier={profile.tier} />
          </div>
        )}

        {/* Name over photo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold">{profile.name}, {profile.age}</h3>
              <p className="text-sm text-white/80">📍 {profile.location}</p>
            </div>
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
              {intentLabel[profile.intent] || profile.intent}
            </span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="px-4 py-3">
          <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 px-4 py-4">
        <button
          onClick={onPass}
          disabled={loading}
          className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500
                     font-semibold hover:border-gray-300 active:scale-95 transition-all"
        >
          ✕ Skip
        </button>
        <button
          onClick={() => onInterested(profile.id)}
          disabled={loading}
          className={`flex-1 py-3 rounded-2xl text-white font-semibold
                     active:scale-95 transition-all shadow-lg
                     ${isCommunity
                       ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                       : "bg-primary hover:bg-red-600 shadow-primary/30"}`}
        >
          {isCommunity ? "🤝 Connect" : "❤️ Interested"}
        </button>
      </div>
    </div>
  );
}

function MatchPopup({ matchedUser, matchId, isCommunity, onClose, onGoToChat }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full animate-bounce-once">
        <div className="text-6xl mb-4">{isCommunity ? "🤝" : "🎉"}</div>
        <h2 className="text-2xl font-bold text-gray-800">
          {isCommunity ? "Connected!" : "It's a Match!"}
        </h2>
        <p className="text-gray-500 mt-2 mb-6">
          You and <span className="font-semibold text-primary">{matchedUser.name}</span> {isCommunity ? "are now connected." : "both liked each other."}
          Say hello!
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline">
            Keep Browsing
          </button>
          <button
            onClick={onGoToChat}
            className="btn-primary"
          >
            💬 Chat Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const [mode, setMode] = useState("dating"); // "dating" | "community"
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [matchPopup, setMatchPopup] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await discoverProfiles();
      setProfiles(res.data.profiles);
      setRemaining(res.data.remaining);
      setMode(res.data.mode || "dating");
    } catch (e) {
      if (e.response?.status === 403) {
        setError("daily_limit");
      } else {
        setError("Failed to load profiles");
      }
    } finally {
      setLoading(false);
    }
  };

  const isCommunity = mode === "community";

  const handleInterested = async (targetId) => {
    setActionLoading(true);
    try {
      const res = await expressInterest(targetId);
      if (res.data.matched) {
        setMatchPopup(res.data.match);
      }
      nextProfile();
    } catch (e) {
      if (e.response?.status === 403) setError("daily_limit");
    } finally {
      setActionLoading(false);
    }
  };

  const nextProfile = () => {
    setIndex((i) => i + 1);
  };

  const currentProfile = profiles[index];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse">{isCommunity ? "🤝" : "❤️"}</div>
          <p className="mt-3 text-gray-400 text-sm">
            {isCommunity ? "Finding your Dimasa community..." : "Finding Dimasa people near you..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">
            {isCommunity ? "Community" : "Discover"}
          </h1>
          <p className="text-sm text-gray-400 truncate">
            {isCommunity
              ? <>Connect with Dimasa people near you</>
              : <>Dimasa in <span className="text-primary font-medium">{user?.location || "your area"}</span></>
            }
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Search button */}
          <button
            onClick={() => navigate("/search")}
            aria-label="Search people"
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg"
          >
            🔍
          </button>
          {isCommunity ? (
            <div className="bg-emerald-50 px-3 py-1 rounded-full">
              <span className="text-emerald-700 text-xs font-medium">🤝 Free</span>
            </div>
          ) : remaining !== null && (
            <div className="bg-rose-50 px-3 py-1 rounded-full">
              <span className="text-primary text-xs font-medium">{remaining} left</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode switch — one-tap toggle */}
      <ModeSwitcher onSwitched={() => {
        setError("");
        setIndex(0);
        setProfiles([]);
        fetchProfiles();
      }} />

      {/* ─── COMMUNITY MODE: grid + locality — NOT swipe ────────────── */}
      {isCommunity ? (
        <>
          <CommunityHeader isCommunity={isCommunity} />
          <CommunityGrid />
        </>
      ) : (
        <>
      <CommunityHeader isCommunity={isCommunity} />

      <div className="px-4 py-4">
        {error === "daily_limit" ? (
          <div className="text-center py-16 px-6">
            <div className="text-5xl mb-4">😴</div>
            <h3 className="text-lg font-semibold text-gray-700">You've seen everyone today!</h3>
            <p className="text-gray-400 text-sm mt-2 mb-6">
              Come back tomorrow for new profiles, or upgrade to see more.
            </p>
            <div className="bg-gradient-to-br from-primary to-rose-600 rounded-2xl p-5 text-white">
              <p className="font-bold text-lg">✨ Upgrade Membership</p>
              <p className="text-rose-100 text-sm mt-1">More profiles per day + see higher tiers</p>
              <button
                onClick={() => navigate("/membership")}
                className="mt-4 bg-white text-primary font-semibold py-2 px-6 rounded-xl text-sm"
              >
                View Memberships →
              </button>
            </div>
          </div>
        ) : !currentProfile ? (
          <div className="text-center py-16 px-6">
            <div className="text-5xl mb-4">🌄</div>
            <h3 className="text-lg font-semibold text-gray-700">
              {isCommunity ? "You've seen all community members!" : "You've seen all profiles!"}
            </h3>
            <p className="text-gray-400 text-sm mt-2 mb-5">
              {isCommunity
                ? "Help the community grow — invite more Dimasa friends."
                : "We're growing fast — invite friends to find more matches."}
            </p>
            <InviteButton size="lg" />
            <button
              onClick={() => { setProfiles([]); setIndex(0); fetchProfiles(); }}
              className="mt-3 text-sm text-gray-400 underline"
            >
              Refresh
            </button>
          </div>
        ) : (
          <ProfileCard
            profile={currentProfile}
            onInterested={handleInterested}
            onPass={nextProfile}
            loading={actionLoading}
            isCommunity={isCommunity}
          />
        )}

        {/* Stack preview dots */}
        {profiles.length > 0 && currentProfile && (
          <div className="flex justify-center gap-1.5 mt-4">
            {profiles.slice(index, index + 5).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === 0 ? "w-4 h-2 bg-primary" : "w-2 h-2 bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {matchPopup && (
        <MatchPopup
          matchedUser={
            matchPopup.user1?.id !== user?.id ? matchPopup.user1 : matchPopup.user2
          }
          matchId={matchPopup.id}
          isCommunity={isCommunity}
          onClose={() => setMatchPopup(null)}
          onGoToChat={() => navigate(`/chat/${matchPopup.id}`)}
        />
      )}
    </div>
  );
}
