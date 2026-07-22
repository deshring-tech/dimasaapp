import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlace, contactPlaceOwner, claimPlace, followPlace } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getOpenStatus } from "../lib/openStatus";

const TYPE_ICONS = {
  hotel: "🏨", restaurant: "🍽️", homestay: "🏡",
  dhaba: "🥘", cafe: "☕", shop: "🛍️", service: "🛠️",
};

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function parseJson(str) {
  if (!str) return null;
  try {
    return typeof str === "string" ? JSON.parse(str) : str;
  } catch {
    return null;
  }
}

export default function Business() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    getPlace(id)
      .then((r) => {
        setBusiness(r.data);
        setFollowing(!!r.data.followedByMe);
        setFollowerCount(r.data._count?.followers ?? 0);
      })
      .catch(() => setBusiness(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    // Optimistic
    const nowFollowing = !following;
    setFollowing(nowFollowing);
    setFollowerCount((c) => c + (nowFollowing ? 1 : -1));
    try {
      const res = await followPlace(id);
      setFollowing(res.data.following);
      setFollowerCount(res.data.followers);
      toast({
        icon: res.data.following ? "🔔" : "🔕",
        title: res.data.following ? `Following ${business.name}` : `Unfollowed ${business.name}`,
        body: res.data.following ? "You'll be notified about new posts" : undefined,
        tone: "info",
      });
    } catch {
      // Roll back
      setFollowing(!nowFollowing);
      setFollowerCount((c) => c + (nowFollowing ? -1 : 1));
    }
  };

  const handleMessageOwner = async () => {
    setContacting(true);
    try {
      const res = await contactPlaceOwner(id);
      navigate(`/chat/${res.data.matchId}`);
    } catch (e) {
      toast({
        icon: "⚠️",
        title: "Couldn't message owner",
        body: e.response?.data?.error || "Try WhatsApp or phone instead",
        tone: "warning",
      });
      setContacting(false);
    }
  };

  const handleClaim = async () => {
    if (!confirm("Are you the owner of this business? You'll be able to edit its details.")) return;
    try {
      const res = await claimPlace(id);
      setBusiness(res.data.place);
      toast({ icon: "✅", title: "You now own this business", tone: "success" });
    } catch (e) {
      toast({ icon: "⚠️", title: e.response?.data?.error || "Failed to claim", tone: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading business...</p>
      </div>
    );
  }
  if (!business) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold text-gray-700">Business not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary text-sm font-medium">
          ← Go back
        </button>
      </div>
    );
  }

  const gallery = parseJson(business.gallery) || [];
  const hours = parseJson(business.hours) || {};
  const images = business.imageUrl ? [business.imageUrl, ...gallery] : gallery;
  const isOwner = user?.id === business.owner?.id;
  const canBeClaimed = !business.owner && !isOwner;
  const openStatus = getOpenStatus(business.hours);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero image */}
      <div className="relative h-64 bg-gradient-to-br from-amber-200 to-orange-300">
        {images[0] ? (
          <img src={images[0]} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">
            {TYPE_ICONS[business.type] || "📍"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-10 left-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-lg shadow"
        >
          ←
        </button>

        {/* Owner actions */}
        {isOwner && (
          <div className="absolute top-10 right-4 flex gap-2">
            <button
              onClick={() => navigate(`/business/${id}/dashboard`)}
              className="px-3 h-10 rounded-full bg-white/90 backdrop-blur text-sm font-semibold text-secondary shadow"
            >
              📊 Stats
            </button>
            <button
              onClick={() => navigate(`/business/${id}/edit`)}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur text-sm font-semibold text-secondary shadow flex items-center justify-center"
            >
              ✏️
            </button>
          </div>
        )}

        {/* Open-now pill (only for real business hours; skip if unknown) */}
        {openStatus.tone !== "unknown" && (
          <div className="absolute bottom-3 left-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full shadow
              ${openStatus.isOpen
                ? "bg-emerald-500 text-white"
                : "bg-gray-800/80 backdrop-blur text-white"}`}>
              <span className="mr-1">{openStatus.isOpen ? "🟢" : "🔴"}</span>
              {openStatus.label}
            </span>
          </div>
        )}
      </div>

      {/* Main info card */}
      <div className="px-4 -mt-8 relative">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-800">{business.name}</h1>
                {business.isClaimed && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                    ✓ Claimed
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="capitalize">{TYPE_ICONS[business.type]} {business.type}</span>
                {" · "}
                📍 {business.district}
                {business.priceRange && <> · <span className="font-medium">{business.priceRange}</span></>}
              </p>
            </div>
          </div>

          {business.description && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{business.description}</p>
          )}

          {business.address && (
            <p className="text-xs text-gray-400 mt-3">📍 {business.address}</p>
          )}

          {/* Follow row */}
          {!isOwner && business.isClaimed && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Followers</p>
                <p className="font-semibold text-gray-800 text-sm">{followerCount}</p>
              </div>
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                  ${following
                    ? "bg-gray-100 text-gray-700 border border-gray-200"
                    : "bg-primary text-white"}`}
              >
                {following ? "✓ Following" : "🔔 Follow"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Owner card */}
      {business.owner && (
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden flex-shrink-0">
              {business.owner.photoUrl
                ? <img src={business.owner.photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-xl">👤</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Owned by</p>
              <p className="font-semibold text-gray-800 truncate">{business.owner.name}</p>
            </div>
            {!isOwner && (
              <button
                onClick={handleMessageOwner}
                disabled={contacting}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-secondary text-white disabled:opacity-50"
              >
                {contacting ? "..." : "💬 Message"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Claim CTA (only if unowned) */}
      {canBeClaimed && (
        <div className="px-4 mt-3">
          <button
            onClick={handleClaim}
            className="w-full bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl p-4 text-left"
          >
            <p className="text-sm font-semibold text-emerald-800">
              🏪 Do you own this business?
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Claim it to add photos, hours, description, and receive customer messages.
            </p>
          </button>
        </div>
      )}

      {/* Contact actions */}
      <div className="px-4 mt-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Contact
          </p>
          <div className="grid grid-cols-3 gap-2">
            {business.contact && (
              <a
                href={`tel:${business.contact}`}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-blue-50 text-blue-700"
              >
                <span className="text-xl">📞</span>
                <span className="text-xs font-semibold">Call</span>
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank" rel="noopener"
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-emerald-50 text-emerald-700"
              >
                <span className="text-xl">💬</span>
                <span className="text-xs font-semibold">WhatsApp</span>
              </a>
            )}
            {business.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address + ", " + business.district)}`}
                target="_blank" rel="noopener"
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-purple-50 text-purple-700"
              >
                <span className="text-xl">🗺️</span>
                <span className="text-xs font-semibold">Directions</span>
              </a>
            )}
          </div>
          {business.email && (
            <a
              href={`mailto:${business.email}`}
              className="mt-2 flex items-center gap-2 text-xs text-gray-600 hover:text-primary"
            >
              ✉️ {business.email}
            </a>
          )}
        </div>
      </div>

      {/* Hours */}
      {Object.keys(hours).length > 0 && (
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Hours
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {DAYS.map((d) => (
                <div key={d.key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium w-12">{d.label}</span>
                  <span className="text-gray-700 text-xs">{hours[d.key] || "Closed"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="px-4 mt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Gallery
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {gallery.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-32 h-32 rounded-xl object-cover flex-shrink-0 border border-gray-100"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
