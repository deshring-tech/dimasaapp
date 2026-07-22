import { useState, useEffect, useRef } from "react";
import { getLocalities } from "../api";

// Compact locality dropdown for the community grid.
// Shows localities that actually have people in them (backend distinct query).
export default function LocalityFilter({ location, selected, onChange, currentLocality }) {
  const [localities, setLocalities] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!location) return;
    getLocalities(location)
      .then((r) => setLocalities(r.data || []))
      .catch(() => setLocalities([]));
  }, [location]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  if (!location) return null;

  const label = selected ? `📍 ${selected}` : "Any locality";

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition
          ${selected
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"}`}
      >
        <span>{label}</span>
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 min-w-[180px] max-h-72 overflow-y-auto">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50
              ${!selected ? "text-primary font-semibold" : "text-gray-700"}`}
          >
            🌐 Any locality
          </button>
          {currentLocality && (
            <button
              onClick={() => { onChange(currentLocality); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100
                ${selected === currentLocality ? "text-primary font-semibold" : "text-gray-700"}`}
            >
              📍 Near me ({currentLocality})
            </button>
          )}
          {localities.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">
              No localities yet in {location}
            </p>
          ) : (
            localities.map((loc) => (
              <button
                key={loc}
                onClick={() => { onChange(loc); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50
                  ${selected === loc ? "text-primary font-semibold" : "text-gray-700"}`}
              >
                {loc}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
