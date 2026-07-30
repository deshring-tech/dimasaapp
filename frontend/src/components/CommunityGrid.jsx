import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { discoverProfiles, expressInterest } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PersonCard from "./PersonCard";
import PersonPreview from "./PersonPreview";
import LocalityFilter from "./LocalityFilter";
import InviteButton from "./InviteButton";

// Community-mode replacement for the Tinder swipe stack.
// Grid layout, locality filter, tap-for-preview, one-tap Say Hi.
export default function CommunityGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locality, setLocality] = useState("");
  const [sentIds, setSentIds] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const [matchPopup, setMatchPopup] = useState(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await discoverProfiles(locality ? { locality } : {});
      setProfiles(res.data.profiles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [locality]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleSayHi = async (targetId) => {
    // Optimistic
    setSentIds((prev) => new Set(prev).add(targetId));
    try {
      const res = await expressInterest(targetId);
      if (res.data.matched) {
        setMatchPopup(res.data.match);
        toast({
          icon: "🤝",
          title: "Connected!",
          body: "You can now chat",
          tone: "success",
        });
      } else {
        toast({
          icon: "👋",
          title: "Hi sent!",
          body: "They'll be notified you'd like to connect",
          tone: "success",
          duration: 2500,
        });
      }
      setPreview(null);
    } catch (e) {
      // Rollback
      setSentIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      toast({
        icon: "⚠️",
        title: e.response?.data?.error || "Couldn't send hi",
        tone: "error",
      });
    }
  };

  // Split by rank: same locality > same location > elsewhere
  const groups = { near: [], sameCity: [], others: [] };
  const myLocality = user?.locality;
  const myLocation = user?.location;
  for (const p of profiles) {
    if (myLocality && p.locality === myLocality)      groups.near.push(p);
    else if (myLocation && p.location === myLocation) groups.sameCity.push(p);
    else                                              groups.others.push(p);
  }

  const renderGridSection = (title, subtitle, list) => {
    if (list.length === 0) return null;
    return (
      <div className="px-3 mb-5">
        <div className="mb-2 px-1">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            {title} <span className="text-gray-400">· {list.length}</span>
          </p>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              sent={sentIds.has(p.id)}
              sameLocality={myLocality && p.locality === myLocality}
              onOpen={() => setPreview(p)}
              onSayHi={handleSayHi}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Filter bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap sticky top-0 z-10">
        <p className="text-xs text-gray-500 font-medium mr-1">Filter:</p>
        <LocalityFilter
          location={myLocation}
          selected={locality}
          onChange={setLocality}
          currentLocality={myLocality}
        />
        {locality && (
          <span className="text-[11px] text-gray-400">
            in {myLocation}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 p-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
                <div className="h-6 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="text-5xl mb-3">🌄</div>
          <h3 className="text-lg font-semibold text-gray-700">
            {locality
              ? `No one in ${locality} yet`
              : "No community members visible"}
          </h3>
          <p className="text-gray-400 text-sm mt-2 mb-5">
            {locality
              ? "Try a different locality, or clear the filter."
              : "Help the community grow — invite Dimasa friends & family."}
          </p>
          {locality ? (
            <button
              onClick={() => setLocality("")}
              className="text-sm text-primary font-semibold px-4 py-2 rounded-xl border-2 border-rose-200"
            >
              Clear filter
            </button>
          ) : (
            <InviteButton size="lg" />
          )}
        </div>
      ) : (
        <div className="pt-4">
          {renderGridSection(
            `Near you`,
            myLocality ? `Dimasa people in ${myLocality}` : null,
            groups.near
          )}
          {renderGridSection(
            `In ${myLocation || "your area"}`,
            null,
            groups.sameCity
          )}
          {renderGridSection(
            `Elsewhere`,
            "Other Dimasa people across the region",
            groups.others
          )}
        </div>
      )}

      {/* Preview modal */}
      <PersonPreview
        person={preview}
        sent={preview ? sentIds.has(preview.id) : false}
        onClose={() => setPreview(null)}
        onSayHi={handleSayHi}
      />

      {/* Match popup */}
      {matchPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full animate-bounce-once">
            <div className="text-6xl mb-4">🤝</div>
            <h2 className="text-2xl font-bold text-gray-800">Connected!</h2>
            <p className="text-gray-500 mt-2 mb-6">
              You can now chat.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setMatchPopup(null)} className="btn-outline">
                Keep Browsing
              </button>
              <button
                onClick={() => navigate(`/chat/${matchPopup.id}`)}
                className="btn-primary"
              >
                💬 Chat Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
