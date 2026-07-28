const GENDER_EMOJI = { female: "👩", male: "👨", other: "🧑" };

const INTENT_LABEL = {
  friends: "🤝 Just Connect",
  dating: "💫 Dating",
  serious: "💍 Serious",
};

// Bottom-sheet preview of a person. Tap Say Hi or dismiss.
// Keeps the community grid experience low-friction — you can peek without committing.
export default function PersonPreview({ person, sent, onClose, onSayHi }) {
  if (!person) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-0 sm:px-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl shadow-xl flex flex-col animate-slide-up max-h-[85vh]">
        {/* Handle + close */}
        <div className="pt-2 pb-1 flex justify-center relative">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
          <button
            onClick={onClose}
            className="absolute right-3 top-2 text-gray-400 text-lg w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Photo hero */}
        <div className="relative h-72 mx-4 mt-1 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-200 flex-shrink-0">
          {person.photoUrl ? (
            <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">
              {GENDER_EMOJI[person.gender] || "🧑"}
            </div>
          )}
        </div>

        {/* Info + bio */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h2 className="text-xl font-bold text-gray-800">
            {person.name}, {person.age}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {person.locality
              ? <>📍 {person.locality} · {person.location}</>
              : <>📍 {person.location}</>}
          </p>

          {person.intent && (
            <span className="inline-block mt-3 text-xs bg-rose-50 text-primary font-medium px-3 py-1 rounded-full">
              {INTENT_LABEL[person.intent] || person.intent}
            </span>
          )}

          {person.bio && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                About
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {person.bio}
              </p>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={() => onSayHi(person.id)}
            disabled={sent}
            className={`w-full py-3 rounded-2xl text-sm font-semibold shadow-lg transition
              ${sent
                ? "bg-gray-100 text-gray-400"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/30 active:scale-95"}`}
          >
            {sent ? "👋 Already said hi" : "👋 Say Hi"}
          </button>
        </div>
      </div>
    </div>
  );
}
