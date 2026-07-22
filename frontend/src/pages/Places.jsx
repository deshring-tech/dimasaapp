import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlaces, getDistricts } from "../api";
import InviteButton from "../components/InviteButton";
import { getOpenStatus } from "../lib/openStatus";

const TYPE_ICONS = {
  hotel: "🏨", restaurant: "🍽️", homestay: "🏡",
  dhaba: "🥘", cafe: "☕", shop: "🛍️", service: "🛠️",
};

const TYPES = ["all", "restaurant", "hotel", "homestay", "cafe", "dhaba", "shop", "service"];

function BusinessCard({ place, onClick }) {
  const status = getOpenStatus(place.hours);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform"
    >
      {/* Cover image */}
      <div className="relative h-32 bg-gradient-to-br from-amber-100 to-orange-200">
        {place.imageUrl ? (
          <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {TYPE_ICONS[place.type] || "📍"}
          </div>
        )}
        {/* Owned badge */}
        {place.isClaimed && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
            ✓ CLAIMED
          </div>
        )}
        {/* Open-now badge */}
        {status.tone !== "unknown" && (
          <div className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow
            ${status.isOpen
              ? "bg-emerald-500 text-white"
              : "bg-gray-800/80 backdrop-blur text-white"}`}>
            {status.isOpen ? "🟢 OPEN" : "🔴 CLOSED"}
          </div>
        )}
        {/* Price range */}
        {place.priceRange && (
          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur text-secondary text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
            {place.priceRange}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-800 truncate flex-1">{place.name}</h3>
          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full capitalize flex-shrink-0">
            {TYPE_ICONS[place.type]} {place.type}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">📍 {place.district}</p>
        {place.address && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{place.address}</p>
        )}

        {/* Quick action strip */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 text-[11px]">
          {place.contact && (
            <a
              href={`tel:${place.contact}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 font-medium"
            >
              📞 Call
            </a>
          )}
          {place.whatsapp && (
            <a
              href={`https://wa.me/${place.whatsapp.replace(/\D/g, "")}`}
              target="_blank" rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="text-emerald-600 font-medium"
            >
              💬 WhatsApp
            </a>
          )}
          {place.owner && (
            <span className="ml-auto text-gray-400 text-[10px]">
              by {place.owner.name?.split(" ")[0]}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Places() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [showClaimedOnly, setShowClaimedOnly] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDistricts().then((r) => setDistricts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [selectedType, selectedDistrict, showClaimedOnly]);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== "all") params.type = selectedType;
      if (selectedDistrict) params.district = selectedDistrict;
      if (showClaimedOnly) params.claimed = "true";
      const res = await getPlaces(params);
      setPlaces(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = places.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-secondary text-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">Market</h1>
            <p className="text-sm text-white/70">Dimasa businesses · restaurants · stays</p>
          </div>
          <button
            onClick={() => navigate("/business/new")}
            className="bg-white text-secondary text-sm font-semibold px-3 py-2 rounded-xl"
          >
            + Add
          </button>
        </div>

        {/* Search */}
        <input
          className="w-full bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:bg-white/20"
          placeholder="🔍 Search businesses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 space-y-2 sticky top-0 z-10">
        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize
                ${selectedType === t
                  ? "bg-secondary text-white"
                  : "bg-gray-100 text-gray-600"}`}
            >
              {t === "all" ? "All" : `${TYPE_ICONS[t]} ${t}`}
            </button>
          ))}
        </div>

        {/* District + claimed filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setShowClaimedOnly(!showClaimedOnly)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold
              ${showClaimedOnly
                ? "bg-emerald-500 text-white"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}
          >
            {showClaimedOnly ? "✓ Owner-run only" : "✓ Owner-run"}
          </button>
          <button
            onClick={() => setSelectedDistrict("")}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium
              ${!selectedDistrict ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            All areas
          </button>
          {districts.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDistrict(d)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium
                ${selectedDistrict === d ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              📍 {d}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="px-3 py-4 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="text-4xl mb-3">🏪</div>
            <h3 className="text-gray-600 font-medium">No businesses found</h3>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Help build the Dimasa marketplace — add the first business here.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/business/new")}
            >
              + Add a Business
            </button>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3">Or invite entrepreneurs:</p>
              <InviteButton variant="ghost" size="sm" />
            </div>
          </div>
        ) : (
          <>
            {filtered.map((p) => (
              <BusinessCard key={p.id} place={p} onClick={() => navigate(`/business/${p.id}`)} />
            ))}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center mt-2">
              <p className="text-sm font-medium text-gray-700">
                Own a Dimasa business?
              </p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Add it here — reach customers across the community
              </p>
              <button
                onClick={() => navigate("/business/new")}
                className="text-sm text-white font-semibold bg-secondary px-5 py-2 rounded-xl"
              >
                + Add Your Business
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
