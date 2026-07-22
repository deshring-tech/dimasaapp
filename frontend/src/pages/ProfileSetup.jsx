import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "../api";
import { useAuth } from "../context/AuthContext";

const LOCATIONS = [
  "Haflong", "Guwahati", "Silchar", "Dimapur", "Imphal",
  "Bangalore", "Delhi", "Mumbai", "Kolkata", "Shillong", "Other"
];

const STEPS = ["basics", "photo", "intent"];

export default function ProfileSetup() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    location: "",
    locality: "",
    intent: "",
    bio: "",
    photoUrl: "",
  });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target?.value ?? e }));

  const canNext = () => {
    if (step === 0) return form.name && form.age && form.gender && form.location;
    if (step === 1) return true; // photo optional
    if (step === 2) return form.intent;
    return false;
  };

  const handleNext = () => {
    setError("");
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateProfile(form);
      await refreshUser();
      navigate("/matches");
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong");
      setLoading(false);
    }
  };

  // Progress bar
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-6">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="text-gray-400 text-xl">
              ←
            </button>
          )}
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{step + 1}/{STEPS.length}</span>
        </div>
      </div>

      <div className="flex-1 px-6 pb-10">
        {/* ── Step 1: Basics ────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Tell us about you</h2>
              <p className="text-sm text-gray-400 mt-1">This takes less than 2 minutes</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Your name</label>
              <input
                className="input-field"
                placeholder="Full name"
                value={form.name}
                onChange={set("name")}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Age</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 24"
                min={18}
                max={60}
                value={form.age}
                onChange={set("age")}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {["male", "female", "other"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm((p) => ({ ...p, gender: g }))}
                    className={`py-3 rounded-xl border-2 font-medium capitalize text-sm transition-all
                      ${form.gender === g
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 text-gray-600 hover:border-primary/50"
                      }`}
                  >
                    {g === "male" ? "👨 Male" : g === "female" ? "👩 Female" : "🧑 Other"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Your location</label>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setForm((p) => ({ ...p, location: loc }))}
                    className={`py-2 px-2 rounded-xl border-2 text-sm transition-all
                      ${form.location === loc
                        ? "border-primary bg-primary text-white font-medium"
                        : "border-gray-200 text-gray-600 hover:border-primary/50"
                      }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">
                Locality <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. Beltola, Zoo Road, Central Haflong"
                maxLength={80}
                value={form.locality}
                onChange={set("locality")}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Helps other Dimasa people find you nearby.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Photo + Bio ───────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Add your photo</h2>
              <p className="text-sm text-gray-400 mt-1">
                {form.intent === "friends"
                  ? "Profiles with photos get 3× more connections"
                  : "Profiles with photos get 3× more matches"}
              </p>
            </div>

            {/* Photo URL input (In prod: replace with Cloudinary upload) */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
              {form.photoUrl ? (
                <div className="relative">
                  <img
                    src={form.photoUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary"
                  />
                  <button
                    onClick={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                    className="mt-3 text-sm text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📸</div>
                  <p className="text-sm text-gray-400 mb-3">Enter photo URL for now</p>
                  <input
                    className="input-field"
                    placeholder="https://example.com/photo.jpg"
                    value={form.photoUrl}
                    onChange={set("photoUrl")}
                  />
                  <p className="text-xs text-gray-300 mt-2">
                    (File upload coming soon — use a photo URL for now)
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">
                Short bio <span className="text-gray-400 font-normal">(optional, 2 lines max)</span>
              </label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="A little about yourself..."
                maxLength={150}
                value={form.bio}
                onChange={set("bio")}
              />
              <p className="text-xs text-gray-400 text-right mt-1">{form.bio.length}/150</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Intent ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">What are you looking for?</h2>
              <p className="text-sm text-gray-400 mt-1">Be honest — it helps you find the right people</p>
              <p className="text-[11px] text-emerald-700 mt-1.5">
                💡 You can switch modes anytime from the top of the Discover tab.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { value: "friends", emoji: "🤝", label: "Just Connect", desc: "Find your Dimasa community", badge: "Free for everyone" },
                { value: "dating", emoji: "💫", label: "Dating", desc: "Meet new people, see where it goes", badge: "Membership tiers" },
                { value: "serious", emoji: "💍", label: "Serious / Marriage", desc: "Looking for a long-term partner", badge: "Membership tiers" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((p) => ({ ...p, intent: opt.value }))}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all
                    ${form.intent === opt.value
                      ? "border-primary bg-rose-50"
                      : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-sm text-gray-400">{opt.desc}</p>
                      {opt.badge && (
                        <span
                          className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full
                            ${opt.value === "friends"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"}`}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {form.intent === opt.value && (
                      <span className="text-primary text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              🛡️ Your intent is shown on your profile so people know what you're looking for.
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        <div className="mt-8">
          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={!canNext() || loading}
          >
            {loading
              ? "Saving..."
              : step === STEPS.length - 1
                ? (form.intent === "friends" ? "Start Connecting 🎉" : "Start Matching 🎉")
                : "Continue →"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
