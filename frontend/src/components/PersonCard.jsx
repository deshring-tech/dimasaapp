const GENDER_EMOJI = { female: "👩", male: "👨", other: "🧑" };

// A single person tile shown in the community grid.
// The whole card is tappable → opens the preview modal.
// The "👋 Say Hi" button below stops propagation and triggers the direct action.
export default function PersonCard({ person, onOpen, onSayHi, sent, sameLocality }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform flex flex-col"
    >
      {/* Photo */}
      <div className="relative aspect-square bg-gradient-to-br from-rose-100 to-pink-200">
        {person.photoUrl ? (
          <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {GENDER_EMOJI[person.gender] || "🧑"}
          </div>
        )}
        {/* Same-locality badge */}
        {sameLocality && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
            📍 NEAR YOU
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-2.5 flex-1 flex flex-col">
        <p className="font-semibold text-gray-800 text-sm truncate">
          {person.name}, {person.age}
        </p>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">
          {person.locality
            ? <>📍 {person.locality}</>
            : <>📍 {person.location}</>}
        </p>

        <button
          onClick={(e) => { e.stopPropagation(); onSayHi(person.id); }}
          disabled={sent}
          className={`mt-2 py-1.5 rounded-lg text-xs font-semibold transition
            ${sent
              ? "bg-gray-100 text-gray-400"
              : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
        >
          {sent ? "👋 Sent" : "👋 Say Hi"}
        </button>
      </div>
    </button>
  );
}
