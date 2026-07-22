import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsers, expressInterest } from "../api";
import { useAuth } from "../context/AuthContext";
import { modeWords } from "../lib/mode";
import TierBadge from "../components/TierBadge";

export default function Search() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const words = modeWords(user);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef(null);

  // ── Debounced search ────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setTouched(true);
      try {
        const res = await searchUsers(query.trim());
        setResults(res.data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleConnect = async (id) => {
    try {
      const res = await expressInterest(id);
      if (res.data.matched) {
        navigate(`/chat/${res.data.match.id}`);
      } else {
        // Visual confirmation
        setResults((prev) =>
          prev.map((r) => (r.id === id ? { ...r, _sent: true } : r))
        );
      }
    } catch {
      // ignore for now
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-3 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 text-xl">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800">Find People</h1>
        </div>
        <input
          autoFocus
          className="input-field mt-3"
          placeholder={words.community
            ? "Search Dimasa people by name or place..."
            : "Search by name or location..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 50))}
        />
        {query.length === 1 && (
          <p className="text-xs text-gray-400 mt-1">Type at least 2 characters</p>
        )}
      </div>

      {/* Results */}
      <div className="px-4 py-4 space-y-2">
        {loading && (
          <div className="text-center py-6 text-gray-400 text-sm">Searching...</div>
        )}

        {!loading && touched && query.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-gray-600 font-medium">No people found</h3>
            <p className="text-xs text-gray-400 mt-1">
              Try a different spelling, or invite them to join!
            </p>
          </div>
        )}

        {!loading && !touched && (
          <div className="text-center py-16 px-6">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-gray-600 font-medium">
              {words.community
                ? "Find someone from the Dimasa community"
                : "Search by name, age, or location"}
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              Type at least 2 characters to start searching
            </p>
          </div>
        )}

        {results.map((p) => (
          <div
            key={p.id}
            className="w-full bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden flex-shrink-0">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">
                  {p.gender === "female" ? "👩" : p.gender === "male" ? "👨" : "🧑"}
                </span>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800 truncate">{p.name}, {p.age}</p>
                <TierBadge tier={p.tier} size="xs" />
              </div>
              <p className="text-xs text-gray-400 truncate">
                📍 {p.location} · {p.gender}
              </p>
            </div>
            {/* Action */}
            <button
              onClick={() => handleConnect(p.id)}
              disabled={p._sent}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl
                ${p._sent
                  ? "bg-gray-100 text-gray-400"
                  : words.community
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-primary text-white hover:bg-red-600"}`}
            >
              {p._sent ? "Sent ✓" : (words.community ? "Connect" : "Interest")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
